import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { documentoListaVisitas } from "@/db/schema";
import { newId } from "@/lib/id";

// Última vez que este usuário abriu a lista de Documentos desta Obra (obra inteira,
// não por disciplina) — usado só pro alerta de "atualizações desde sua última visita".
export async function getUltimaVisita(userId: string, obraId: string): Promise<Date | null> {
  const [visita] = await db
    .select({ visitadoEm: documentoListaVisitas.visitadoEm })
    .from(documentoListaVisitas)
    .where(and(eq(documentoListaVisitas.userId, userId), eq(documentoListaVisitas.obraId, obraId)))
    .limit(1);
  return visita?.visitadoEm ?? null;
}

export async function registrarVisita(userId: string, obraId: string): Promise<void> {
  await db
    .insert(documentoListaVisitas)
    .values({ id: newId("vis"), userId, obraId })
    .onConflictDoUpdate({
      target: [documentoListaVisitas.userId, documentoListaVisitas.obraId],
      set: { visitadoEm: new Date() },
    });
}
