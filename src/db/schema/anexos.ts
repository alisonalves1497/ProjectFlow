import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { users } from "./auth";
import { revisoes } from "./revisoes";

// Arquivos de apoio de uma revisão (além de Documento original/PDF) — plantas de referência,
// laudos, planilhas etc. Múltiplos por revisão, sem limite de tipo.
export const anexosRevisao = pgTable("anexos_revisao", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  revisaoId: text("revisao_id").notNull().references(() => revisoes.id, { onDelete: "cascade" }),

  arquivoChave: text("arquivo_chave").notNull(),
  arquivoNome: text("arquivo_nome").notNull(),
  arquivoMimeType: text("arquivo_mime_type").notNull(),
  arquivoTamanho: integer("arquivo_tamanho").notNull(),

  criadoPor: text("criado_por").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
