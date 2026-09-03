import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { documentoFavoritos } from "@/db/schema";
import { newId } from "@/lib/id";

export async function listFavoritoIds(userId: string): Promise<Set<string>> {
  const rows = await db.select({ documentoId: documentoFavoritos.documentoId }).from(documentoFavoritos).where(eq(documentoFavoritos.userId, userId));
  return new Set(rows.map((r) => r.documentoId));
}

export async function toggleFavorito(userId: string, documentoId: string): Promise<boolean> {
  const [existente] = await db
    .select({ id: documentoFavoritos.id })
    .from(documentoFavoritos)
    .where(and(eq(documentoFavoritos.userId, userId), eq(documentoFavoritos.documentoId, documentoId)))
    .limit(1);

  if (existente) {
    await db.delete(documentoFavoritos).where(eq(documentoFavoritos.id, existente.id));
    return false;
  }

  await db.insert(documentoFavoritos).values({ id: newId("fav"), userId, documentoId });
  return true;
}
