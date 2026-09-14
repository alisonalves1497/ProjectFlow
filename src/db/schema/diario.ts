import { pgTable, text, integer, timestamp, date, unique } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { users } from "./auth";

// Grade de horas do "Meu Espaço" — uma célula por dia da semana (data concreta, não só
// "segunda/terça") x hora (8 a 17, representando o intervalo horaInicio–horaInicio+1).
// Preenchimento livre (texto), não vinculado a um Projeto/Obra formal do sistema — é comum
// a pessoa descrever "disciplina + obra" junto (ex: "Estrutural do Cafundó do Judas"), o que
// não mapeia 1:1 pra nenhuma entidade existente. Estritamente privado, igual ao antigo
// diário: toda query filtra por userId, sem exceção pra administrador.
export const diarioHoras = pgTable(
  "diario_horas",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    data: date("data").notNull(),
    horaInicio: integer("hora_inicio").notNull(),
    projeto: text("projeto").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.userId, table.data, table.horaInicio)]
);
