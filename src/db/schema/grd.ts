import { pgTable, text, timestamp, integer, date, pgEnum, unique } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { obras } from "./hierarquia";
import { users } from "./auth";
import { documentos } from "./documentos";
import { revisoes } from "./revisoes";

export const statusGrdEnum = pgEnum("status_grd", ["pendente", "respondido", "cancelado"]);

// Catálogo de contatos externos (cliente, fiscalização, etc.) — não são `users`,
// não autenticam no sistema. Reaproveitável entre GRDs do mesmo workspace.
export const contatosExternos = pgTable("contatos_externos", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  email: text("email").notNull(),
  empresa: text("empresa"),
  telefone: text("telefone"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// Sequencial por obra, sem quebra por disciplina/tipo (GRD mistura documentos de disciplinas
// diferentes). Mesmo padrão "Opção A" do Documento: contínuo, sem reset por período.
export const contadoresGrdSequencial = pgTable("contadores_grd_sequencial", {
  obraId: text("obra_id").primaryKey().references(() => obras.id, { onDelete: "cascade" }),
  proximoValor: integer("proximo_valor").notNull().default(1),
});

export const grds = pgTable(
  "grds",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    obraId: text("obra_id").notNull().references(() => obras.id, { onDelete: "cascade" }),

    numeroSequencial: integer("numero_sequencial").notNull(),
    codigoCompleto: text("codigo_completo").notNull(), // 'GRD-CTO-012', calculado na criação

    dataEmissao: date("data_emissao").notNull(),
    status: statusGrdEnum("status").notNull().default("pendente"),

    // Rastreamento paralelo: responder um GRD não muta o status da Revisão.
    // Isso continua manual, pela tela de Documento.
    respondidoEm: timestamp("respondido_em", { withTimezone: true }),

    arquivoExcelUrl: text("arquivo_excel_url"),
    arquivoCartaPdfUrl: text("arquivo_carta_pdf_url"),
    arquivoPacoteZipUrl: text("arquivo_pacote_zip_url"),
    arquivoRespostaNome: text("arquivo_resposta_nome"),
    arquivoRespostaUrl: text("arquivo_resposta_url"),

    criadoPor: text("criado_por").notNull().references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [unique().on(table.codigoCompleto)]
);

// Trava a REVISÃO específica transmitida — se o documento ganhar revisão nova depois,
// este GRD continua apontando pra revisão que foi de fato enviada.
export const grdDocumentos = pgTable(
  "grd_documentos",
  {
    id: text("id").primaryKey(),
    grdId: text("grd_id").notNull().references(() => grds.id, { onDelete: "cascade" }),
    documentoId: text("documento_id").notNull().references(() => documentos.id, { onDelete: "restrict" }),
    revisaoId: text("revisao_id").notNull().references(() => revisoes.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.grdId, table.documentoId)]
);

export const grdDestinatarios = pgTable(
  "grd_destinatarios",
  {
    id: text("id").primaryKey(),
    grdId: text("grd_id").notNull().references(() => grds.id, { onDelete: "cascade" }),
    contatoExternoId: text("contato_externo_id").notNull().references(() => contatosExternos.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.grdId, table.contatoExternoId)]
);
