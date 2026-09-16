import { pgTable, text, integer, timestamp, date, pgEnum } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { users } from "./auth";
import { projetos } from "./hierarquia";

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
  dataVencimento: date("data_vencimento"),
  dataInicial: date("data_inicial"),
  prioridade: prioridadeTarefaPessoalEnum("prioridade"),
  projetoId: text("projeto_id").references(() => projetos.id, { onDelete: "set null" }),
  estimativaMinutos: integer("estimativa_minutos"),
  tempoRastreadoMinutos: integer("tempo_rastreado_minutos"),
  concluidaEm: timestamp("concluida_em", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
