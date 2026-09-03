import { pgTable, text, timestamp, unique, numeric } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { users } from "./auth";
import { disciplinas } from "./catalogos";

export const projetos = pgTable(
  "projetos",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [unique().on(table.workspaceId, table.code)]
);

export const obras = pgTable(
  "obras",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    projetoId: text("projeto_id").notNull().references(() => projetos.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    // Teto planejado de Suprimentos, digitado — não é soma dos itens comprados.
    orcamentoTotal: numeric("orcamento_total", { precision: 16, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [unique().on(table.projetoId, table.code)]
);

// Override de acesso por Obra específica. Regra de permissão efetiva
// (role do workspace + presença aqui) é resolvida na camada de serviço.
export const obraMembers = pgTable(
  "obra_members",
  {
    id: text("id").primaryKey(),
    obraId: text("obra_id").notNull().references(() => obras.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.obraId, table.userId)]
);

// Nó "Disciplina dentro desta Obra" — quais disciplinas do catálogo esta obra usa.
export const obraDisciplinas = pgTable(
  "obra_disciplinas",
  {
    id: text("id").primaryKey(),
    obraId: text("obra_id").notNull().references(() => obras.id, { onDelete: "cascade" }),
    disciplinaId: text("disciplina_id").notNull().references(() => disciplinas.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.obraId, table.disciplinaId)]
);

export const secoes = pgTable("secoes", {
  id: text("id").primaryKey(),
  obraDisciplinaId: text("obra_disciplina_id").notNull().references(() => obraDisciplinas.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  position: text("position").notNull(), // fractional index (lexicograficamente ordenável)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
