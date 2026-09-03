import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { itensSuprimento, obras, disciplinas } from "@/db/schema";
import { notFound } from "@/lib/errors";

export async function getSuprimentosDashboard(workspaceId: string, obraId: string) {
  const [obra] = await db
    .select({ id: obras.id, orcamentoTotal: obras.orcamentoTotal })
    .from(obras)
    .where(and(eq(obras.id, obraId), eq(obras.workspaceId, workspaceId), isNull(obras.deletedAt)))
    .limit(1);
  if (!obra) throw notFound("OBRA_NOT_FOUND", "Obra não encontrada.");

  const itens = await db
    .select({
      id: itensSuprimento.id,
      codigo: itensSuprimento.codigo,
      nome: itensSuprimento.nome,
      valorTotal: itensSuprimento.valorTotal,
      comprado: itensSuprimento.comprado,
      critico: itensSuprimento.critico,
      prazoPrevisto: itensSuprimento.prazoPrevisto,
      compradoEm: itensSuprimento.compradoEm,
      disciplinaId: itensSuprimento.disciplinaId,
    })
    .from(itensSuprimento)
    .where(and(eq(itensSuprimento.workspaceId, workspaceId), eq(itensSuprimento.obraId, obraId), isNull(itensSuprimento.deletedAt)));

  const orcamentoTotal = obra.orcamentoTotal ? Number(obra.orcamentoTotal) : null;
  const valorComprometido = itens.filter((i) => i.comprado).reduce((sum, i) => sum + Number(i.valorTotal ?? 0), 0);
  const percentualCobertura = orcamentoTotal ? (valorComprometido / orcamentoTotal) * 100 : null;
  const itensCriticosSemPrevisao = itens.filter((i) => i.critico && !i.comprado && !i.prazoPrevisto).length;

  // Curva ABC: ordena por valor desc, classifica pelo corte clássico de Pareto (A até 80%, B até 95%, C o resto).
  const totalValor = itens.reduce((sum, i) => sum + Number(i.valorTotal ?? 0), 0);
  const ordenados = [...itens].sort((a, b) => Number(b.valorTotal ?? 0) - Number(a.valorTotal ?? 0));
  let acumulado = 0;
  const curvaAbc = ordenados.map((i) => {
    const valor = Number(i.valorTotal ?? 0);
    acumulado += valor;
    const percentualAcumulado = totalValor > 0 ? (acumulado / totalValor) * 100 : 0;
    const classe: "A" | "B" | "C" = percentualAcumulado <= 80 ? "A" : percentualAcumulado <= 95 ? "B" : "C";
    return { itemId: i.id, codigo: i.codigo, nome: i.nome, valorTotal: valor, percentualAcumulado, classe };
  });

  const hoje = new Date().toISOString().slice(0, 10);
  const itensEmAtraso = itens.filter((i) => i.comprado && i.prazoPrevisto && i.compradoEm && i.compradoEm > i.prazoPrevisto);
  const itensPrazoVencido = itens.filter((i) => !i.comprado && i.prazoPrevisto && i.prazoPrevisto < hoje);
  const itensCriticosAComprar = itens.filter((i) => i.critico && !i.comprado);

  // Consolidado por disciplina — "% comprado" em CONTAGEM de itens, não em valor.
  const disciplinasDaObra = await db
    .select({ id: disciplinas.id, code: disciplinas.code, name: disciplinas.name })
    .from(disciplinas)
    .where(eq(disciplinas.workspaceId, workspaceId));
  const disciplinaMap = new Map(disciplinasDaObra.map((d) => [d.id, d]));

  const porDisciplinaMap = new Map<
    string,
    { disciplinaId: string; disciplinaCode: string; disciplinaName: string; totalItens: number; itensComprados: number; valorOrcado: number }
  >();
  for (const item of itens) {
    const disciplina = disciplinaMap.get(item.disciplinaId);
    const key = item.disciplinaId;
    if (!porDisciplinaMap.has(key)) {
      porDisciplinaMap.set(key, {
        disciplinaId: key,
        disciplinaCode: disciplina?.code ?? "?",
        disciplinaName: disciplina?.name ?? "Desconhecida",
        totalItens: 0,
        itensComprados: 0,
        valorOrcado: 0,
      });
    }
    const bucket = porDisciplinaMap.get(key)!;
    bucket.totalItens += 1;
    if (item.comprado) bucket.itensComprados += 1;
    bucket.valorOrcado += Number(item.valorTotal ?? 0);
  }
  const porDisciplina = Array.from(porDisciplinaMap.values()).map((b) => ({
    ...b,
    percentualComprado: b.totalItens > 0 ? (b.itensComprados / b.totalItens) * 100 : 0,
  }));

  return {
    resumo: { orcamentoTotal, valorComprometido, percentualCobertura, itensCriticosSemPrevisao },
    curvaAbc,
    riscoPrazo: {
      itensEmAtraso: itensEmAtraso.map((i) => ({ itemId: i.id, codigo: i.codigo, nome: i.nome, prazoPrevisto: i.prazoPrevisto, compradoEm: i.compradoEm })),
      itensPrazoVencido: itensPrazoVencido.map((i) => ({ itemId: i.id, codigo: i.codigo, nome: i.nome, prazoPrevisto: i.prazoPrevisto })),
      itensCriticosAComprar: itensCriticosAComprar.map((i) => ({ itemId: i.id, codigo: i.codigo, nome: i.nome, prazoPrevisto: i.prazoPrevisto })),
    },
    porDisciplina,
  };
}
