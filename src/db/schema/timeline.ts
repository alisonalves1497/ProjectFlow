import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { users } from "./auth";
import { documentos } from "./documentos";
import { revisoes } from "./revisoes";

// Append-only: log de auditoria. Sem updated_at/deleted_at por design —
// UPDATE/DELETE nesta tabela são bloqueados via política no banco (ver migration),
// não só por convenção da camada de serviço.
export const linhaDoTempo = pgTable("linha_do_tempo", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  documentoId: text("documento_id").notNull().references(() => documentos.id, { onDelete: "cascade" }),
  revisaoId: text("revisao_id").references(() => revisoes.id, { onDelete: "set null" }),

  evento: text("evento").notNull(), // 'revisao_criada' | 'enviada_para_analise' | 'aprovada' | 'reprovada' | ...
  autorId: text("autor_id").references(() => users.id), // null para eventos automáticos do sistema
  metadata: jsonb("metadata"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
