import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { documentos, revisoes } from "@/db/schema";
import { getObraOrThrow } from "./obraService";
import { listGrds } from "./grdService";
import { listItensConhecimento } from "./conhecimentoService";
import { getSuprimentosDashboard } from "./suprimentosDashboardService";
import { getCopiasControladasDashboard } from "./copiaControladaService";
import { STATUS_LABELS } from "@/lib/statusGraph";
import { STATUS_LABELS as STATUS_CONHECIMENTO_LABELS, TIPO_LABELS } from "@/lib/conhecimentoStatusGraph";
import { anthropicClient, ASSISTENTE_MODEL } from "@/lib/anthropic";
import Anthropic from "@anthropic-ai/sdk";
import { ApiError } from "@/lib/errors";

// Documentos, GRDs e RFI/RNC crescem com o tamanho da obra — sem teto, uma obra madura
// poderia gerar um contexto (e custo) sem limite a cada pergunta. Suprimentos e Cópias
// Controladas entram só como resumo agregado (tamanho fixo, não precisam de teto).
const LIMITE_ITENS_POR_LISTA = 150;

export async function buildContextoObra(workspaceId: string, obraId: string): Promise<string> {
  const obra = await getObraOrThrow(workspaceId, obraId);

  const documentosRows = await db
    .select({
      codigoCompleto: documentos.codigoCompleto,
      descricao: documentos.descricao,
      status: documentos.status,
      revisaoLabel: revisoes.label,
    })
    .from(documentos)
    .leftJoin(revisoes, eq(revisoes.id, documentos.currentRevisionId))
    .where(and(eq(documentos.workspaceId, workspaceId), eq(documentos.obraId, obraId), isNull(documentos.deletedAt)))
    .orderBy(desc(documentos.updatedAt))
    .limit(LIMITE_ITENS_POR_LISTA + 1);

  const grdsRows = await listGrds(workspaceId, { obraId });
  const itensConhecimentoRows = await listItensConhecimento(workspaceId, { obraId });

  const [suprimentosDashboard, copiasDashboard] = await Promise.all([
    getSuprimentosDashboard(workspaceId, obraId).catch(() => null),
    getCopiasControladasDashboard(workspaceId, obraId).catch(() => null),
  ]);

  function formatarLista<T>(itens: T[], formatar: (item: T) => string): string {
    const truncado = itens.length > LIMITE_ITENS_POR_LISTA;
    const visiveis = itens.slice(0, LIMITE_ITENS_POR_LISTA);
    const linhas = visiveis.map(formatar).join("\n");
    return truncado ? `${linhas}\n(+${itens.length - LIMITE_ITENS_POR_LISTA} mais antigos não incluídos aqui)` : linhas;
  }

  const documentosTexto = documentosRows.length
    ? formatarLista(documentosRows, (d) => `- ${d.codigoCompleto} | ${d.descricao} | status: ${STATUS_LABELS[d.status]} | revisão atual: ${d.revisaoLabel ?? "nenhuma"}`)
    : "Nenhum documento cadastrado.";

  const grdsTexto = grdsRows.length
    ? formatarLista(grdsRows, (g) => `- ${g.codigoCompleto} | emitido em ${g.dataEmissao} | status: ${g.status}`)
    : "Nenhum GRD emitido.";

  const conhecimentoTexto = itensConhecimentoRows.length
    ? formatarLista(
        itensConhecimentoRows,
        (i) => `- ${i.codigoCompleto} | ${TIPO_LABELS[i.tipo as "rfi" | "rnc"]} | ${i.titulo} | status: ${STATUS_CONHECIMENTO_LABELS[i.status as keyof typeof STATUS_CONHECIMENTO_LABELS]}`
      )
    : "Nenhuma RFI/RNC registrada.";

  const suprimentosTexto = suprimentosDashboard
    ? [
        `Orçamento total: ${suprimentosDashboard.resumo.orcamentoTotal ?? "não definido"}`,
        `Valor comprometido: ${suprimentosDashboard.resumo.valorComprometido}`,
        `% cobertura: ${suprimentosDashboard.resumo.percentualCobertura ?? "—"}`,
        `Itens críticos sem previsão: ${suprimentosDashboard.resumo.itensCriticosSemPrevisao}`,
        ...suprimentosDashboard.porDisciplina.map(
          (d) => `- ${d.disciplinaName}: ${d.totalItens} itens, ${d.itensComprados} comprados (${d.percentualComprado.toFixed(0)}%)`
        ),
      ].join("\n")
    : "Sem dados de suprimentos.";

  const copiasTexto = copiasDashboard
    ? [
        `Cópias ativas: ${copiasDashboard.copiasAtivas}`,
        `Cópias a substituir: ${copiasDashboard.copiasASubstituir}`,
        `% desatualizadas: ${copiasDashboard.percentualDesatualizadas.toFixed(0)}%`,
        `Tempo médio de troca: ${copiasDashboard.tempoMedioTrocaDias !== null ? `${copiasDashboard.tempoMedioTrocaDias.toFixed(1)} dias` : "—"}`,
        `Detentores distintos: ${copiasDashboard.detentoresDistintos}`,
      ].join("\n")
    : "Sem dados de cópias controladas.";

  return `Dados da obra "${obra.name}" (${obra.code}):

## Documentos
${documentosTexto}

## GRDs (Guias de Remessa)
${grdsTexto}

## RFI/RNC
${conhecimentoTexto}

## Suprimentos (resumo)
${suprimentosTexto}

## Cópias Controladas (resumo)
${copiasTexto}`;
}

export type MensagemChat = { role: "user" | "assistant"; content: string };

export async function perguntarAssistente(workspaceId: string, obraId: string, mensagens: MensagemChat[]): Promise<string> {
  const contexto = await buildContextoObra(workspaceId, obraId);

  let response;
  try {
    response = await anthropicClient.messages.create({
      model: ASSISTENTE_MODEL,
      max_tokens: 1024,
      system: `Você é um assistente que ajuda engenheiros a entender o estado atual de uma obra, com base exclusivamente nos dados fornecidos abaixo. Responda em português do Brasil, de forma direta e objetiva. Se a pergunta não puder ser respondida com os dados fornecidos (ex: pergunta sobre outra obra, ou informação que não está listada), diga isso claramente em vez de inventar uma resposta.\n\n${contexto}`,
      messages: mensagens.map((m) => ({ role: m.role, content: m.content })),
    });
  } catch (err) {
    // Erros da API Anthropic (crédito insuficiente, chave inválida, rate limit) chegam
    // como Anthropic.APIError — repassa uma mensagem legível em vez do "Erro interno" genérico.
    if (err instanceof Anthropic.APIError) {
      throw new ApiError(502, "ASSISTENTE_INDISPONIVEL", `Assistente indisponível no momento: ${err.message}`);
    }
    throw err;
  }

  const bloco = response.content.find((b) => b.type === "text");
  return bloco && bloco.type === "text" ? bloco.text : "";
}
