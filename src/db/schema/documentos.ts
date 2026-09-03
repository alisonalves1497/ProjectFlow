import { pgTable, text, timestamp, date, integer, pgEnum, unique, primaryKey } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { users } from "./auth";
import { obras } from "./hierarquia";
import { disciplinas, fases, tiposDocumento } from "./catalogos";
import { secoes } from "./hierarquia";

// Compartilhado entre `documentos.status` (espelho da revisão atual) e `revisoes.status`.
// O grafo de transições válidas é reforçado na camada de serviço, não no banco.
export const statusDocumentoEnum = pgEnum("status_documento", [
  "previsto",
  "em_elaboracao",
  "devolvido_correcao",
  "em_revisao_interna",
  "aprovacao_lider_tecnico",
  "aguardando_envio_ged",
  "em_analise_cliente",
  "aprovado",
  "aprovado_com_comentarios",
  "reprovado",
  "liberado_para_construcao",
  "devolvido_pelo_cliente",
  "informativo",
  "cancelado",
]);

// Sequencial único por (obra, disciplina, tipo), compartilhado entre fases (Opção A).
// Incrementado atomicamente via UPSERT na camada de serviço.
export const contadoresSequencial = pgTable(
  "contadores_sequencial",
  {
    obraId: text("obra_id").notNull().references(() => obras.id, { onDelete: "cascade" }),
    disciplinaId: text("disciplina_id").notNull().references(() => disciplinas.id, { onDelete: "restrict" }),
    tipoDocumentoId: text("tipo_documento_id").notNull().references(() => tiposDocumento.id, { onDelete: "restrict" }),
    proximoValor: integer("proximo_valor").notNull().default(1),
  },
  (table) => [primaryKey({ columns: [table.obraId, table.disciplinaId, table.tipoDocumentoId] })]
);

export const documentos = pgTable(
  "documentos",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    obraId: text("obra_id").notNull().references(() => obras.id, { onDelete: "cascade" }),
    disciplinaId: text("disciplina_id").notNull().references(() => disciplinas.id, { onDelete: "restrict" }),
    secaoId: text("secao_id").notNull().references(() => secoes.id, { onDelete: "restrict" }),
    faseId: text("fase_id").notNull().references(() => fases.id, { onDelete: "restrict" }),
    tipoDocumentoId: text("tipo_documento_id").notNull().references(() => tiposDocumento.id, { onDelete: "restrict" }),

    sequencial: integer("sequencial").notNull(),
    codigoCompleto: text("codigo_completo").notNull(), // identidade imutável, calculada na criação

    descricao: text("descricao").notNull(),
    responsavelId: text("responsavel_id").references(() => users.id),

    dataBaseline: date("data_baseline"),
    dataReprogramada: date("data_reprogramada"),
    dataPrevista: date("data_prevista"),

    status: statusDocumentoEnum("status").notNull().default("previsto"),
    // Só muda junto com `status` (criação/transição de revisão) — nunca em edição de campo
    // cosmético (descrição, datas). Usado pro alerta de "atualizações desde a última visita":
    // comparar contra isso, não contra `updatedAt`, evita disparar o alerta por edições triviais.
    statusUpdatedAt: timestamp("status_updated_at", { withTimezone: true }).notNull().defaultNow(),
    // Sem FK de banco para revisoes (evita dependência circular entre as tabelas);
    // consistência (current_revision_id sempre aponta pra revisão de documento_id correto) é garantida na camada de serviço.
    currentRevisionId: text("current_revision_id"),

    createdBy: text("created_by").notNull().references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [unique().on(table.codigoCompleto)]
);
