import { pgTable, text, integer, boolean, timestamp, date, pgEnum } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { users } from "./auth";
import { projetos } from "./hierarquia";
import { documentos } from "./documentos";

export const prioridadeTarefaPessoalEnum = pgEnum("prioridade_tarefa_pessoal", ["urgente", "alta", "normal", "baixa"]);
export const statusTarefaPessoalEnum = pgEnum("status_tarefa_pessoal", ["pendente", "feito"]);

// "Lista pessoal" do Meu Espaço — tarefas avulsas, sem vínculo obrigatório com nada do
// sistema (inspirado na "Minhas tarefas" do ClickUp). Estritamente privada: toda query
// filtra por userId, sem exceção pra administrador. Vínculo com Projeto é opcional, só serve
// pra somar tempo trabalhado naquele projeto (tempoRastreadoMinutos).
export const tarefasPessoais = pgTable("tarefas_pessoais", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  status: statusTarefaPessoalEnum("status").notNull().default("pendente"),
  // Texto livre, só de controle individual — não vincula com nada (nem documento, nem
  // projeto), só aparece pra quem é dono da tarefa. Diferente de `status` acima (que é o
  // pendente/feito do checkbox).
  statusLivre: text("status_livre"),
  // Formatação tipo Excel do statusLivre — negrito, cor da letra e cor de fundo da célula,
  // tudo opcional (null = padrão do tema).
  statusLivreNegrito: boolean("status_livre_negrito").notNull().default(false),
  statusLivreCor: text("status_livre_cor"),
  statusLivreFundo: text("status_livre_fundo"),
  // Observações livres — texto qualquer, sem vínculo com nada, só anotação pessoal.
  obs: text("obs"),
  // Mesma formatação do statusLivre acima, aplicada ao obs.
  obsNegrito: boolean("obs_negrito").notNull().default(false),
  obsCor: text("obs_cor"),
  obsFundo: text("obs_fundo"),
  dataVencimento: date("data_vencimento"),
  dataInicial: date("data_inicial"),
  prioridade: prioridadeTarefaPessoalEnum("prioridade"),
  projetoId: text("projeto_id").references(() => projetos.id, { onDelete: "set null" }),
  documentoId: text("documento_id").references(() => documentos.id, { onDelete: "set null" }),
  estimativaMinutos: integer("estimativa_minutos"),
  tempoRastreadoMinutos: integer("tempo_rastreado_minutos"),
  concluidaEm: timestamp("concluida_em", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
