import Anthropic from "@anthropic-ai/sdk";

export const anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export const ASSISTENTE_MODEL = "claude-sonnet-5";

// Flag única de liga/desliga do módulo — desativado por decisão da Mariana (chave sem
// crédito). Checada na página, na rota de API e na sidebar, pra nenhum caminho gerar
// chamada real à Anthropic nem expor o item de menu enquanto estiver "false".
export function isAssistenteIaAtivo(): boolean {
  return process.env.ASSISTENTE_IA_ATIVO === "true";
}
