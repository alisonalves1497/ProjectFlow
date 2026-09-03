import { pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { documentos } from "./documentos";

// Favoritar um Documento é por usuário — cada um tem sua própria lista, sem efeito
// em mais nada no sistema (puramente uma marcação pessoal de atalho).
export const documentoFavoritos = pgTable(
  "documento_favoritos",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    documentoId: text("documento_id").notNull().references(() => documentos.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.userId, table.documentoId)]
);
