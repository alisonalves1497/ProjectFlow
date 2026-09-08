import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { documentos, disciplinas } from "@/db/schema";

// Rota de diagnóstico temporária — comparar o banco que o Vercel usa em runtime com o que
// o script local vê via PROD_DATABASE_URL. Remover depois de confirmar.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const obraId = "obra_01M1PS2FP49A1V1BWMY55JR1CF";

  const porDisciplina = await db
    .select({ disciplinaNome: disciplinas.name, total: sql<number>`count(*)::int` })
    .from(documentos)
    .leftJoin(disciplinas, eq(disciplinas.id, documentos.disciplinaId))
    .where(and(eq(documentos.obraId, obraId), isNull(documentos.deletedAt)))
    .groupBy(disciplinas.name);

  const [totalGeral] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(documentos)
    .where(and(eq(documentos.obraId, obraId), isNull(documentos.deletedAt)));

  return NextResponse.json({ obraId, porDisciplina, totalGeral: totalGeral?.total ?? 0 });
}
