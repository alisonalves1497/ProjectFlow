import { pgTable, text, timestamp, boolean, unique } from "drizzle-orm/pg-core";
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

// Menção (@nome) numa mensagem do chat — uma linha por (mensagem, pessoa citada). `lida` é o
// "dispensar" do card Menções no Painel; documentoId é denormalizado pra listar sem join
// extra na mensagem.
export const documentoChatMencoes = pgTable(
  "documento_chat_mencoes",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    mensagemId: text("mensagem_id").notNull().references(() => documentoChatMensagens.id, { onDelete: "cascade" }),
    documentoId: text("documento_id").notNull().references(() => documentos.id, { onDelete: "cascade" }),
    usuarioMencionadoId: text("usuario_mencionado_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    lida: boolean("lida").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.mensagemId, table.usuarioMencionadoId)]
);
