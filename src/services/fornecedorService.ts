import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { fornecedores } from "@/db/schema";
import { newId } from "@/lib/id";
import { notFound } from "@/lib/errors";

export async function createFornecedor(
  workspaceId: string,
  input: { nome: string; cnpj?: string; email?: string; telefone?: string }
) {
  const [fornecedor] = await db
    .insert(fornecedores)
    .values({ id: newId("forn"), workspaceId, ...input })
    .returning();
  return fornecedor;
}

export async function listFornecedores(workspaceId: string) {
  return db
    .select()
    .from(fornecedores)
    .where(and(eq(fornecedores.workspaceId, workspaceId), isNull(fornecedores.deletedAt)));
}

export async function getFornecedorOrThrow(workspaceId: string, fornecedorId: string) {
  const [fornecedor] = await db
    .select()
    .from(fornecedores)
    .where(and(eq(fornecedores.id, fornecedorId), eq(fornecedores.workspaceId, workspaceId), isNull(fornecedores.deletedAt)))
    .limit(1);
  if (!fornecedor) throw notFound("FORNECEDOR_NOT_FOUND", "Fornecedor não encontrado.");
  return fornecedor;
}
