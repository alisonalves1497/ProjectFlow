import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { users } from "./auth";
import { documentos } from "./documentos";

// Observações/anotações livres no documento, sem vínculo com revisão — diferente de
// `comentarios`, que é sempre preso a uma revisão específica (fluxo formal de aprovação).
export const documentoChatMensagens = pgTable("documento_chat_mensagens", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  documentoId: text("documento_id").notNull().references(() => documentos.id, { onDelete: "cascade" }),
  autorId: text("autor_id").notNull().references(() => users.id),
  corpo: text("corpo").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  // Preenchido só quando o próprio autor edita a mensagem — a UI mostra "(editado)" quando
  // não é nulo. Exclusão é definitiva (só administrador), então não há coluna de soft delete.
  editedAt: timestamp("edited_at", { withTimezone: true }),
});
