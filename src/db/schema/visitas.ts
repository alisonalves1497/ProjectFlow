import { pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { obras } from "./hierarquia";

// Última vez que este usuário abriu a lista de Documentos desta Obra (obra inteira, não por
// disciplina). Usado só pro alerta de "documentos atualizados desde sua última visita" —
// não tem nenhum outro efeito no sistema.
export const documentoListaVisitas = pgTable(
  "documento_lista_visitas",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    obraId: text("obra_id").notNull().references(() => obras.id, { onDelete: "cascade" }),
    visitadoEm: timestamp("visitado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.userId, table.obraId)]
);
