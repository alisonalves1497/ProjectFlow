import { pgTable, text, integer, boolean, timestamp, date, pgEnum } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { users } from "./auth";
import { projetos } from "./hierarquia";
import { documentos } from "./documentos";

export const prioridadeTarefaPessoalEnum = pgEnum("prioridade_tarefa_pessoal", ["urgente", "alta", "normal", "baixa"]);
export const statusTarefaPessoalEnum = pgEnum("status_tarefa_pessoal", ["pendente", "feito"]);

// "Lista pessoal" do Meu Espaço — tarefas avulsas, sem vínculo obrigatório com nada do
// sistema (inspirado na "Minhas tarefas" do ClickUp). Estritamente privada: toda query
// filtra por userId (o "responsável"/dono da tarefa), sem exceção pra administrador — não dá
// pra ABRIR a lista de outra pessoa. O que existe é um jeito indireto de colocar uma tarefa
// na lista de alguém: ao criar, dá pra escolher um responsável diferente de quem está criando
// (criadoPorId fica registrado pra mostrar "atribuído por" pra quem recebeu). Vínculo com
// Projeto é opcional, só serve pra somar tempo trabalhado naquele projeto (tempoRastreadoMinutos).
export const tarefasPessoais = pgTable("tarefas_pessoais", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  // Dono da tarefa — em quem a lista pessoal filtra (quem "vê" essa tarefa). Normalmente é
  // quem criou, mas pode ser outra pessoa quando alguém cria e atribui (ver criadoPorId).
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // Quem de fato criou a tarefa — igual a userId na maioria dos casos (tarefa própria).
  // Só diverge quando alguém cria uma tarefa e atribui pra outra pessoa (aí aparece "atribuído
  // por" pro dono). Null se o criador for removido do workspace depois.
  criadoPorId: text("criado_por_id").references(() => users.id, { onDelete: "set null" }),
  nome: text("nome").notNull(),
  // Mesma formatação tipo Excel do statusLivre/obs, aplicada ao nome da tarefa.
  nomeNegrito: boolean("nome_negrito").notNull().default(false),
  nomeCor: text("nome_cor"),
  nomeFundo: text("nome_fundo"),
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
