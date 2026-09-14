import { pgTable, text, timestamp, date } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { users } from "./auth";
import { documentos } from "./documentos";

// Diário pessoal — registro de atividades do dia a dia, sem estrutura de horário nem
// vínculo obrigatório com Documento (é texto livre, tipo diário de bordo, não folha de
// ponto). Estritamente privado: cada linha pertence a um userId, e as queries de serviço
// sempre filtram por ele — não existe leitura "de outra pessoa" nem pra administrador.
export const diarioEntradas = pgTable("diario_entradas", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // Dia a que o registro se refere — pode ser diferente do dia em que foi digitado (ex:
  // lançar hoje algo que aconteceu ontem).
  data: date("data").notNull(),
  texto: text("texto").notNull(),
  // Vínculo opcional com um Documento — só uma referência solta, não afeta nada no
  // Documento em si. ON DELETE SET NULL: se o documento referenciado for excluído de
  // verdade, o registro do diário continua existindo, só perde o link.
  documentoId: text("documento_id").references(() => documentos.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
