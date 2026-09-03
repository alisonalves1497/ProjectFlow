import { pgTable, text, timestamp, pgEnum, uniqueIndex, type AnyPgColumn } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { workspaces } from "./workspaces";
import { obras } from "./hierarquia";
import { users } from "./auth";
import { documentos } from "./documentos";
import { revisoes } from "./revisoes";

export const statusCopiaControladaEnum = pgEnum("status_copia_controlada", ["ativa", "substituida", "cancelada"]);

// Controle de impressão física de documentos em obra. "A substituir" não é um status
// gravado: é calculado comparando revisao_id (travada aqui) com a revisão atual do documento.
export const copiasControladas = pgTable(
  "copias_controladas",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    obraId: text("obra_id").notNull().references(() => obras.id, { onDelete: "cascade" }), // denormalizado do documento, mesmo padrão de grds
    documentoId: text("documento_id").notNull().references(() => documentos.id, { onDelete: "cascade" }),

    // Trava a revisão impressa — igual ao GRD, não muda se o documento evoluir depois.
    revisaoId: text("revisao_id").notNull().references(() => revisoes.id, { onDelete: "restrict" }),

    detentorId: text("detentor_id").notNull().references(() => users.id),

    status: statusCopiaControladaEnum("status").notNull().default("ativa"),

    // Encadeamento de troca, mesmo padrão de revisao_anterior_id.
    substituiuCopiaId: text("substituiu_copia_id").references((): AnyPgColumn => copiasControladas.id),

    // created_at já serve de "data de criação" pro cálculo de tempo médio de troca.
    // Preenchida só na transição pra substituida/cancelada — o status já diferencia o motivo.
    dataFechamento: timestamp("data_fechamento", { withTimezone: true }),

    createdBy: text("created_by").notNull().references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // No máximo uma cópia ATIVA por (documento, detentor) — não impede histórico de trocas/cancelamentos.
    uniqueIndex("copias_controladas_documento_detentor_ativa_idx")
      .on(table.documentoId, table.detentorId)
      .where(sql`status = 'ativa'`),
  ]
);
