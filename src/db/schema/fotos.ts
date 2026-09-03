import { pgTable, text, timestamp, integer, unique } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { obras } from "./hierarquia";
import { users } from "./auth";
import { documentos } from "./documentos";

// Fotos pertencem só à Obra (sem disciplina/seção próprias) — quando vinculadas a um
// Documento, disciplina/seção já vêm por esse vínculo, não precisam ser duplicadas aqui.
export const fotos = pgTable("fotos", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  obraId: text("obra_id").notNull().references(() => obras.id, { onDelete: "cascade" }),

  legenda: text("legenda"),

  // Chave do objeto no bucket S3/MinIO — o arquivo em si nunca fica no Postgres.
  arquivoChave: text("arquivo_chave").notNull(),
  arquivoNome: text("arquivo_nome").notNull(),
  arquivoMimeType: text("arquivo_mime_type").notNull(),
  arquivoTamanho: integer("arquivo_tamanho").notNull(),

  criadoPor: text("criado_por").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// Vínculo opcional com Documento — 0..N documentos por foto, mesmo padrão N:0..N
// de itens_suprimento_documentos.
export const fotoDocumentos = pgTable(
  "foto_documentos",
  {
    id: text("id").primaryKey(),
    fotoId: text("foto_id").notNull().references(() => fotos.id, { onDelete: "cascade" }),
    documentoId: text("documento_id").notNull().references(() => documentos.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.fotoId, table.documentoId)]
);
