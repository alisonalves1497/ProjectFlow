import { and, desc, eq, isNull } from "drizzle-orm";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/db/client";
import { fotos, fotoDocumentos, fotoItensConhecimento, obras, documentos, itensConhecimento } from "@/db/schema";
import { newId } from "@/lib/id";
import { badRequest, notFound } from "@/lib/errors";
import { s3Client, S3_BUCKET } from "@/lib/s3";

export const FOTO_MIME_TYPES_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];
export const FOTO_TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024; // 10MB

export async function createFoto(
  workspaceId: string,
  obraId: string,
  userId: string,
  input: {
    legenda?: string;
    documentoIds: string[];
    itemConhecimentoIds?: string[];
    arquivo: { buffer: Buffer; nome: string; mimeType: string; tamanho: number };
  }
) {
  const [obra] = await db
    .select({ id: obras.id })
    .from(obras)
    .where(and(eq(obras.id, obraId), eq(obras.workspaceId, workspaceId), isNull(obras.deletedAt)))
    .limit(1);
  if (!obra) throw notFound("OBRA_NOT_FOUND", "Obra não encontrada.");

  if (!FOTO_MIME_TYPES_PERMITIDOS.includes(input.arquivo.mimeType)) {
    throw badRequest("FOTO_TIPO_INVALIDO", "Só são aceitas imagens JPEG, PNG ou WebP.");
  }
  if (input.arquivo.tamanho > FOTO_TAMANHO_MAXIMO_BYTES) {
    throw badRequest("FOTO_TAMANHO_EXCEDIDO", "A imagem excede o limite de 10MB.");
  }

  const fotoId = newId("foto");
  const arquivoChave = `${workspaceId}/${obraId}/${fotoId}-${input.arquivo.nome}`;

  // Upload pro storage acontece fora da transação — se o insert falhar depois, sobra
  // um objeto órfão no bucket. Aceitável no escopo mínimo (sem job de limpeza).
  await s3Client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: arquivoChave,
      Body: input.arquivo.buffer,
      ContentType: input.arquivo.mimeType,
    })
  );

  return db.transaction(async (tx) => {
    const [foto] = await tx
      .insert(fotos)
      .values({
        id: fotoId,
        workspaceId,
        obraId,
        legenda: input.legenda,
        arquivoChave,
        arquivoNome: input.arquivo.nome,
        arquivoMimeType: input.arquivo.mimeType,
        arquivoTamanho: input.arquivo.tamanho,
        criadoPor: userId,
      })
      .returning();

    for (const documentoId of input.documentoIds) {
      const [documento] = await tx
        .select({ id: documentos.id, obraId: documentos.obraId })
        .from(documentos)
        .where(and(eq(documentos.id, documentoId), eq(documentos.workspaceId, workspaceId), isNull(documentos.deletedAt)))
        .limit(1);
      if (!documento) throw notFound("DOCUMENTO_NOT_FOUND", `Documento ${documentoId} não encontrado.`);
      if (documento.obraId !== obraId) {
        throw badRequest("DOCUMENTO_OBRA_MISMATCH", "Documento vinculado precisa pertencer à mesma obra da foto.");
      }
      await tx.insert(fotoDocumentos).values({ id: newId("fdoc"), fotoId: foto.id, documentoId });
    }

    for (const itemConhecimentoId of input.itemConhecimentoIds ?? []) {
      const [item] = await tx
        .select({ id: itensConhecimento.id, obraId: itensConhecimento.obraId })
        .from(itensConhecimento)
        .where(and(eq(itensConhecimento.id, itemConhecimentoId), eq(itensConhecimento.workspaceId, workspaceId), isNull(itensConhecimento.deletedAt)))
        .limit(1);
      if (!item) throw notFound("ITEM_CONHECIMENTO_NOT_FOUND", `Item ${itemConhecimentoId} não encontrado.`);
      if (item.obraId !== obraId) {
        throw badRequest("ITEM_CONHECIMENTO_OBRA_MISMATCH", "Item vinculado precisa pertencer à mesma obra da foto.");
      }
      await tx.insert(fotoItensConhecimento).values({ id: newId("fconh"), fotoId: foto.id, itemConhecimentoId });
    }

    return foto;
  });
}

export async function listFotosPorObra(workspaceId: string, obraId: string) {
  return db
    .select()
    .from(fotos)
    .where(and(eq(fotos.workspaceId, workspaceId), eq(fotos.obraId, obraId), isNull(fotos.deletedAt)))
    .orderBy(desc(fotos.createdAt));
}

export async function listFotosPorDocumento(workspaceId: string, documentoId: string) {
  return db
    .select({
      id: fotos.id,
      legenda: fotos.legenda,
      arquivoNome: fotos.arquivoNome,
      createdAt: fotos.createdAt,
    })
    .from(fotoDocumentos)
    .innerJoin(fotos, eq(fotos.id, fotoDocumentos.fotoId))
    .where(and(eq(fotoDocumentos.documentoId, documentoId), eq(fotos.workspaceId, workspaceId), isNull(fotos.deletedAt)))
    .orderBy(desc(fotos.createdAt));
}

export async function listFotosPorItemConhecimento(workspaceId: string, itemConhecimentoId: string) {
  return db
    .select({
      id: fotos.id,
      legenda: fotos.legenda,
      arquivoNome: fotos.arquivoNome,
      createdAt: fotos.createdAt,
    })
    .from(fotoItensConhecimento)
    .innerJoin(fotos, eq(fotos.id, fotoItensConhecimento.fotoId))
    .where(and(eq(fotoItensConhecimento.itemConhecimentoId, itemConhecimentoId), eq(fotos.workspaceId, workspaceId), isNull(fotos.deletedAt)))
    .orderBy(desc(fotos.createdAt));
}

export async function getFotoOrThrow(workspaceId: string, fotoId: string) {
  const [foto] = await db
    .select()
    .from(fotos)
    .where(and(eq(fotos.id, fotoId), eq(fotos.workspaceId, workspaceId), isNull(fotos.deletedAt)))
    .limit(1);
  if (!foto) throw notFound("FOTO_NOT_FOUND", "Foto não encontrada.");
  return foto;
}

export async function getFotoArquivo(chave: string) {
  return s3Client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: chave }));
}
