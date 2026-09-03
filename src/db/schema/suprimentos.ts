import { pgTable, text, timestamp, numeric, boolean, date, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { workspaces } from "./workspaces";
import { obras } from "./hierarquia";
import { disciplinas } from "./catalogos";
import { documentos } from "./documentos";
import { users } from "./auth";

export const fornecedores = pgTable("fornecedores", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  cnpj: text("cnpj"),
  email: text("email"),
  telefone: text("telefone"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const itensSuprimento = pgTable("itens_suprimento", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  obraId: text("obra_id").notNull().references(() => obras.id, { onDelete: "cascade" }),
  disciplinaId: text("disciplina_id").notNull().references(() => disciplinas.id, { onDelete: "restrict" }),

  codigo: text("codigo"),
  categoria: text("categoria"),
  nome: text("nome").notNull(),

  quantidade: numeric("quantidade", { precision: 14, scale: 3 }).notNull(),
  unidadeMedida: text("unidade_medida").notNull(),
  valorUnitario: numeric("valor_unitario", { precision: 14, scale: 2 }).notNull(),
  // Nunca digitado nem calculado pela aplicação — o Postgres garante que nunca dessincroniza
  // de quantidade/valorUnitario.
  valorTotal: numeric("valor_total", { precision: 16, scale: 2 }).generatedAlwaysAs(
    sql`(quantidade * valor_unitario)`
  ),

  fornecedorId: text("fornecedor_id").references(() => fornecedores.id, { onDelete: "set null" }),
  prazoPrevisto: date("prazo_previsto"),
  compradoEm: date("comprado_em"),
  comprado: boolean("comprado").notNull().default(false),
  critico: boolean("critico").notNull().default(false), // marcado manualmente, não calculado
  numeroPedidoCompra: text("numero_pedido_compra"),

  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// Vínculo opcional com Documento(s) de origem — N:N, um item pode vir de vários documentos.
export const itensSuprimentoDocumentos = pgTable(
  "itens_suprimento_documentos",
  {
    id: text("id").primaryKey(),
    itemSuprimentoId: text("item_suprimento_id").notNull().references(() => itensSuprimento.id, { onDelete: "cascade" }),
    documentoId: text("documento_id").notNull().references(() => documentos.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.itemSuprimentoId, table.documentoId)]
);
