import { and, desc, eq, isNull } from "drizzle-orm";
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/db/client";
import { anexosRevisao, revisoes } from "@/db/schema";
import { newId } from "@/lib/id";
import { notFound } from "@/lib/errors";
import { s3Client, S3_BUCKET } from "@/lib/s3";

export async function createAnexoRevisao(
  workspaceId: string,
  revisaoId: string,
  userId: string,
  arquivo: { buffer: Buffer; nome: string; mimeType: string; tamanho: number }
) {
  const [revisao] = await db
    .select({ id: revisoes.id })
    .from(revisoes)
    .where(and(eq(revisoes.id, revisaoId), eq(revisoes.workspaceId, workspaceId)))
    .limit(1);
  if (!revisao) throw notFound("REVISAO_NOT_FOUND", "Revisão não encontrada.");

  const anexoId = newId("anx");
  const arquivoChave = `${workspaceId}/anexos-revisao/${revisaoId}/${anexoId}-${arquivo.nome}`;

  await s3Client.send(
    new PutObjectCommand({ Bucket: S3_BUCKET, Key: arquivoChave, Body: arquivo.buffer, ContentType: arquivo.mimeType })
  );

  const [anexo] = await db
    .insert(anexosRevisao)
    .values({
      id: anexoId,
      workspaceId,
      revisaoId,
      arquivoChave,
      arquivoNome: arquivo.nome,
      arquivoMimeType: arquivo.mimeType,
      arquivoTamanho: arquivo.tamanho,
      criadoPor: userId,
    })
    .returning();
  return anexo;
}

export async function listAnexosPorRevisao(workspaceId: string, revisaoId: string) {
  return db
    .select()
    .from(anexosRevisao)
    .where(and(eq(anexosRevisao.workspaceId, workspaceId), eq(anexosRevisao.revisaoId, revisaoId), isNull(anexosRevisao.deletedAt)))
    .orderBy(desc(anexosRevisao.createdAt));
}

export async function getAnexoOrThrow(workspaceId: string, anexoId: string) {
  const [anexo] = await db
    .select()
    .from(anexosRevisao)
    .where(and(eq(anexosRevisao.id, anexoId), eq(anexosRevisao.workspaceId, workspaceId), isNull(anexosRevisao.deletedAt)))
    .limit(1);
  if (!anexo) throw notFound("ANEXO_NOT_FOUND", "Anexo não encontrado.");
  return anexo;
}

export async function getAnexoArquivo(chave: string) {
  return s3Client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: chave }));
}

export async function deleteAnexo(workspaceId: string, anexoId: string) {
  const anexo = await getAnexoOrThrow(workspaceId, anexoId);
  await db.update(anexosRevisao).set({ deletedAt: new Date() }).where(eq(anexosRevisao.id, anexo.id));
  await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: anexo.arquivoChave }));
}
