import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { users } from "./auth";
import { revisoes } from "./revisoes";

export const comentarios = pgTable("comentarios", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  revisaoId: text("revisao_id").notNull().references(() => revisoes.id, { onDelete: "cascade" }),
  autorId: text("autor_id").notNull().references(() => users.id),

  corpo: text("corpo").notNull(), // texto simples por ora; troca pra jsonb (rich text) é retrofit barato depois
  anexoNome: text("anexo_nome"),
  anexoUrl: text("anexo_url"),
  marcarPendenciaCliente: boolean("marcar_pendencia_cliente").notNull().default(false),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
