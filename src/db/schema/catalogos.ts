import { pgTable, text, timestamp, unique, integer } from "drizzle-orm/pg-core";
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

// Nomes de Seção "sugeridos" pra uma Disciplina, compartilhados pelo workspace inteiro — não
// são Seções de verdade (aquelas moram em `secoes`, presas a uma Obra+Disciplina específica).
// Servem como menu pronto na hora de criar Documento/Seção numa Obra nova que ainda não tem
// nenhuma Seção, e como vocabulário extra pro casamento automático nos imports/sincronizações.
export const secoesPadrao = pgTable(
  "secoes_padrao",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    disciplinaId: text("disciplina_id").notNull().references(() => disciplinas.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    ordem: integer("ordem").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.disciplinaId, table.name)]
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
