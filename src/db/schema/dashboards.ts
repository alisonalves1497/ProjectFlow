import { pgTable, text, timestamp, jsonb, unique } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { users } from "./auth";

// "Visão" salva do Dashboard — por usuário, por workspace. Guarda o layout dos blocos
// (quais estão visíveis e em que ordem) + um retrato dos filtros. Puramente pessoal, não
// afeta o dashboard de mais ninguém.
export const dashboardVisoes = pgTable(
  "dashboard_visoes",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    // { layout: {id, visivel}[], filtros: Record<string,string> } — ver DashboardVisaoConfig
    config: jsonb("config").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.userId, table.workspaceId, table.nome)]
);
