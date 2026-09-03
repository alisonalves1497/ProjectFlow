import { pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

// Catálogos de referência: os componentes validados do código do documento
// (ex: 'C' -> Civil, 'ENT' -> Entrega, 'FUDE' -> Fundações).

export const disciplinas = pgTable(
  "disciplinas",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.workspaceId, table.code)]
);

export const fases = pgTable(
  "fases",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.workspaceId, table.code)]
);

export const tiposDocumento = pgTable(
  "tipos_documento",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.workspaceId, table.code)]
);

// Categorias da Base de Conhecimento (RFI/RNC) — compartilhadas entre os dois tipos.
export const categoriasConhecimento = pgTable(
  "categorias_conhecimento",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.workspaceId, table.code)]
);
