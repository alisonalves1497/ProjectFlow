import { and, desc, eq, getTableColumns, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/db/client";
import { documentos, revisoes, users } from "@/db/schema";
import { s3Client, S3_BUCKET } from "@/lib/s3";

const autores = alias(users, "autores");
import { newId } from "@/lib/id";
import { badRequest, conflict, isUniqueViolation, notFound } from "@/lib/errors";
import { isValidInPlaceTransition, nextRevisionSpec, tipoDaRevisao, type StatusDocumento } from "@/lib/statusGraph";
import { logTimelineEvent } from "./timelineService";

type ArquivoInput = { buffer: Buffer; nome: string; mimeType: string; tamanho: number };

async function uploadArquivoRevisao(workspaceId: string, revisaoId: string, tipo: "original" | "pdf", arquivo: ArquivoInput) {
  const chave = `${workspaceId}/revisoes/${revisaoId}/${tipo}-${arquivo.nome}`;
  await s3Client.send(
    new PutObjectCommand({ Bucket: S3_BUCKET, Key: chave, Body: arquivo.buffer, ContentType: arquivo.mimeType })
  );
  return chave;
}

export async function getArquivoRevisao(chave: string) {
  return s3Client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: chave }));
}

const RETORNO_STATUSES: StatusDocumento[] = ["aprovado", "aprovado_com_comentarios", "reprovado", "devolvido_pelo_cliente"];

export async function listRevisoes(workspaceId: string, documentoId: string) {
  return db
    .select()
    .from(revisoes)
    .where(and(eq(revisoes.workspaceId, workspaceId), eq(revisoes.documentoId, documentoId)))
    .orderBy(desc(revisoes.createdAt));
}

// Mesma listagem, mas já com o nome de quem conferiu cada revisão resolvido — usado pela tela
// de detalhe do documento, onde cada revisão vira um card colapsável com esse dado exibido.
export async function listRevisoesComConferidoPorNome(workspaceId: string, documentoId: string) {
  return db
    .select({ ...getTableColumns(revisoes), conferidoPorNome: users.name, autorNome: autores.name })
    .from(revisoes)
    .leftJoin(users, eq(users.id, revisoes.conferidoPorId))
    .leftJoin(autores, eq(autores.id, revisoes.autorId))
    .where(and(eq(revisoes.workspaceId, workspaceId), eq(revisoes.documentoId, documentoId)))
    .orderBy(desc(revisoes.createdAt));
}

export async function getRevisaoOrThrow(workspaceId: string, revisaoId: string) {
  const [revisao] = await db
    .select()
    .from(revisoes)
    .where(and(eq(revisoes.id, revisaoId), eq(revisoes.workspaceId, workspaceId)))
    .limit(1);
  if (!revisao) throw notFound("REVISAO_NOT_FOUND", "Revisão não encontrada.");
  return revisao;
}

// Mesma revisão, mas com o nome de quem conferiu já resolvido — usado só na tela de
// detalhe do documento, pra não obrigar toda leitura de revisão a arrastar esse join.
export async function getRevisaoComConferidoPorNome(workspaceId: string, revisaoId: string) {
  const [revisao] = await db
    .select({ ...getTableColumns(revisoes), conferidoPorNome: users.name })
    .from(revisoes)
    .leftJoin(users, eq(users.id, revisoes.conferidoPorId))
    .where(and(eq(revisoes.id, revisaoId), eq(revisoes.workspaceId, workspaceId)))
    .limit(1);
  if (!revisao) throw notFound("REVISAO_NOT_FOUND", "Revisão não encontrada.");
  return revisao;
}

// Bucket B: cria uma NOVA revisão. A única próxima revisão válida é determinística a partir
// da atual (ver nextRevisionSpec) — quando não é as_built, letra/número precisam ser digitados
// e batem exatamente com o que o sistema espera, ou a criação é rejeitada.
export async function createRevisao(
  workspaceId: string,
  documentoId: string,
  userId: string,
  input: {
    letra?: string;
    numero?: number;
    arquivoOriginal?: ArquivoInput;
    arquivoPdf?: ArquivoInput;
  }
) {
  return db.transaction(async (tx) => {
    const [documento] = await tx
      .select()
      .from(documentos)
      .where(and(eq(documentos.id, documentoId), eq(documentos.workspaceId, workspaceId)))
      .limit(1);
    if (!documento) throw notFound("DOCUMENTO_NOT_FOUND", "Documento não encontrado.");

    let atual: typeof revisoes.$inferSelect | null = null;
    if (documento.currentRevisionId) {
      const [row] = await tx.select().from(revisoes).where(eq(revisoes.id, documento.currentRevisionId)).limit(1);
      if (!row) throw notFound("REVISAO_NOT_FOUND", "Revisão atual não encontrada.");
      atual = row;
    }

    const spec = nextRevisionSpec(
      atual ? { ehAsBuilt: atual.ehAsBuilt, letra: atual.letra, numero: atual.numero, status: atual.status as StatusDocumento } : null
    );
    if (!spec) {
      throw conflict("REVISAO_NAO_PERMITE_NOVA_REVISAO", `Revisão em status '${atual?.status}' não permite criar uma nova revisão.`);
    }

    let values: { ehAsBuilt: boolean; letra: string | null; numero: number | null; asBuiltOrdinal: number | null; status: StatusDocumento };

    if (spec.tipo === "as_built") {
      const [{ maxOrdinal }] = await tx
        .select({ maxOrdinal: sql<number | null>`max(${revisoes.asBuiltOrdinal})` })
        .from(revisoes)
        .where(and(eq(revisoes.documentoId, documentoId), eq(revisoes.ehAsBuilt, true)));
      values = { ehAsBuilt: true, letra: null, numero: null, asBuiltOrdinal: (maxOrdinal ?? -1) + 1, status: spec.startStatus };
    } else {
      if (!input.letra || input.numero === undefined || input.numero === null) {
        throw badRequest("REVISAO_LETRA_NUMERO_OBRIGATORIOS", "Informe a letra e o número da revisão.");
      }
      if (input.letra !== spec.letra || input.numero !== spec.numero) {
        throw conflict(
          "REVISAO_SEQUENCIA_INVALIDA",
          `A próxima revisão válida é '${spec.letra}${spec.numero}', não '${input.letra}${input.numero}'.`
        );
      }
      values = { ehAsBuilt: false, letra: spec.letra, numero: spec.numero, asBuiltOrdinal: null, status: spec.startStatus };
    }

    const revisaoId = newId("rev");
    const arquivoOriginalChave = input.arquivoOriginal
      ? await uploadArquivoRevisao(workspaceId, revisaoId, "original", input.arquivoOriginal)
      : null;
    const arquivoPdfChave = input.arquivoPdf ? await uploadArquivoRevisao(workspaceId, revisaoId, "pdf", input.arquivoPdf) : null;

    let novaRevisao;
    try {
      [novaRevisao] = await tx
        .insert(revisoes)
        .values({
          id: revisaoId,
          workspaceId,
          documentoId,
          ...values,
          revisaoAnteriorId: atual?.id ?? null,
          autorId: userId,
          arquivoOriginalNome: input.arquivoOriginal?.nome,
          arquivoOriginalChave,
          arquivoOriginalMimeType: input.arquivoOriginal?.mimeType,
          arquivoOriginalTamanho: input.arquivoOriginal?.tamanho,
          arquivoPdfNome: input.arquivoPdf?.nome,
          arquivoPdfChave,
          arquivoPdfMimeType: input.arquivoPdf?.mimeType,
          arquivoPdfTamanho: input.arquivoPdf?.tamanho,
        })
        .returning();
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw conflict("REVISAO_CONCORRENTE", "Outra revisão foi criada simultaneamente para este documento. Tente novamente.");
      }
      throw err;
    }

    await tx
      .update(documentos)
      .set({ status: spec.startStatus, statusUpdatedAt: new Date(), currentRevisionId: novaRevisao.id, updatedAt: new Date() })
      .where(eq(documentos.id, documentoId));

    await logTimelineEvent(tx, {
      workspaceId,
      documentoId,
      revisaoId: novaRevisao.id,
      evento: "revisao_criada",
      autorId: userId,
      metadata: { label: novaRevisao.label, revisaoAnteriorId: atual?.id ?? null },
    });

    return novaRevisao;
  });
}

// Envia ou substitui o Documento original/PDF de uma revisão já existente — diferente da
// criação da revisão, pode acontecer a qualquer momento (ex: revisão criada em rascunho,
// arquivo oficial só chega depois, antes de mandar pra revisão interna).
export async function setArquivoRevisao(
  workspaceId: string,
  documentoId: string,
  revisaoId: string,
  userId: string,
  tipo: "original" | "pdf",
  arquivo: ArquivoInput
) {
  const revisao = await getRevisaoOrThrow(workspaceId, revisaoId);
  if (revisao.documentoId !== documentoId) throw notFound("REVISAO_NOT_FOUND", "Revisão não encontrada.");

  const chave = await uploadArquivoRevisao(workspaceId, revisaoId, tipo, arquivo);

  const patch =
    tipo === "original"
      ? {
          arquivoOriginalNome: arquivo.nome,
          arquivoOriginalChave: chave,
          arquivoOriginalMimeType: arquivo.mimeType,
          arquivoOriginalTamanho: arquivo.tamanho,
        }
      : {
          arquivoPdfNome: arquivo.nome,
          arquivoPdfChave: chave,
          arquivoPdfMimeType: arquivo.mimeType,
          arquivoPdfTamanho: arquivo.tamanho,
        };

  return db.transaction(async (tx) => {
    const [atualizada] = await tx
      .update(revisoes)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(revisoes.id, revisaoId))
      .returning();

    await logTimelineEvent(tx, {
      workspaceId,
      documentoId,
      revisaoId,
      evento: "arquivo_revisao_atualizado",
      autorId: userId,
      metadata: { tipo, nome: arquivo.nome },
    });

    return atualizada;
  });
}

export async function toggleConferido(workspaceId: string, documentoId: string, revisaoId: string, userId: string) {
  const revisao = await getRevisaoOrThrow(workspaceId, revisaoId);
  if (revisao.documentoId !== documentoId) throw notFound("REVISAO_NOT_FOUND", "Revisão não encontrada.");

  const [atualizada] = await db
    .update(revisoes)
    .set(
      revisao.conferido
        ? { conferido: false, conferidoPorId: null, conferidoEm: null, updatedAt: new Date() }
        : { conferido: true, conferidoPorId: userId, conferidoEm: new Date(), updatedAt: new Date() }
    )
    .where(eq(revisoes.id, revisaoId))
    .returning();
  return atualizada;
}

// Bucket A: transição in-place — muta a revisão atual, sem gerar letra/número novo.
export async function transitionRevisaoStatus(
  workspaceId: string,
  documentoId: string,
  revisaoId: string,
  userId: string,
  novoStatus: StatusDocumento
) {
  return db.transaction(async (tx) => {
    const [revisao] = await tx
      .select()
      .from(revisoes)
      .where(and(eq(revisoes.id, revisaoId), eq(revisoes.documentoId, documentoId), eq(revisoes.workspaceId, workspaceId)))
      .limit(1);
    if (!revisao) throw notFound("REVISAO_NOT_FOUND", "Revisão não encontrada.");

    const tipo = tipoDaRevisao({ ehAsBuilt: revisao.ehAsBuilt, numero: revisao.numero });
    if (!isValidInPlaceTransition(tipo, revisao.status as StatusDocumento, novoStatus)) {
      throw conflict("INVALID_STATUS_TRANSITION", `Não é possível transicionar de '${revisao.status}' para '${novoStatus}' nesta revisão.`);
    }

    if (novoStatus === "em_revisao_interna" && !revisao.arquivoOriginalChave) {
      throw conflict("DOCUMENTO_ORIGINAL_OBRIGATORIO", "Anexe o Documento original antes de enviar para revisão interna.");
    }

    const patch: { status: StatusDocumento; updatedAt: Date; enviadoClienteEm?: Date; retornadoEm?: Date } = {
      status: novoStatus,
      updatedAt: new Date(),
    };
    if (novoStatus === "em_analise_cliente") patch.enviadoClienteEm = new Date();
    if (RETORNO_STATUSES.includes(novoStatus)) patch.retornadoEm = new Date();

    const [atualizada] = await tx.update(revisoes).set(patch).where(eq(revisoes.id, revisaoId)).returning();

    await tx
      .update(documentos)
      .set({ status: novoStatus, statusUpdatedAt: new Date(), updatedAt: new Date() })
      .where(eq(documentos.id, documentoId));

    await logTimelineEvent(tx, {
      workspaceId,
      documentoId,
      revisaoId,
      evento: "status_transicionado",
      autorId: userId,
      metadata: { de: revisao.status, para: novoStatus },
    });

    return atualizada;
  });
}
