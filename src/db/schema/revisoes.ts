import { pgTable, text, timestamp, integer, boolean, unique, check, type AnyPgColumn } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { workspaces } from "./workspaces";
import { users } from "./auth";
import { documentos, statusDocumentoEnum } from "./documentos";

export const revisoes = pgTable(
  "revisoes",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    documentoId: text("documento_id").notNull().references(() => documentos.id, { onDelete: "cascade" }),

    // Ciclo normal: letra fixa + número crescente, digitados pelo usuário e validados
    // contra o histórico do documento (nunca gerados por contador cego).
    letra: text("letra"),
    numero: integer("numero"),

    // As Built continua com esquema próprio (AB-00, AB-01...), fora da lógica de letra/número.
    ehAsBuilt: boolean("eh_as_built").notNull().default(false),
    asBuiltOrdinal: integer("as_built_ordinal"),

    // Nunca escrito pela aplicação — Postgres monta a partir de letra/numero OU as_built_ordinal.
    label: text("label").generatedAlwaysAs(
      sql`case when eh_as_built then 'AB-' || lpad(as_built_ordinal::text, 2, '0') else letra || numero::text end`
    ),

    status: statusDocumentoEnum("status").notNull().default("em_elaboracao"),

    // Aponta para a revisão que originou esta (ex: A2 aponta pra A1). Null na primeira revisão.
    revisaoAnteriorId: text("revisao_anterior_id").references((): AnyPgColumn => revisoes.id),

    autorId: text("autor_id").notNull().references(() => users.id),

    enviadoClienteEm: timestamp("enviado_cliente_em", { withTimezone: true }),
    retornadoEm: timestamp("retornado_em", { withTimezone: true }),

    // Chave do objeto no bucket S3/MinIO — arquivo nunca fica no Postgres, servido via
    // rota autenticada (mesmo padrão de Fotos).
    arquivoOriginalNome: text("arquivo_original_nome"),
    arquivoOriginalChave: text("arquivo_original_chave"),
    arquivoOriginalMimeType: text("arquivo_original_mime_type"),
    arquivoOriginalTamanho: integer("arquivo_original_tamanho"),
    arquivoPdfNome: text("arquivo_pdf_nome"),
    arquivoPdfChave: text("arquivo_pdf_chave"),
    arquivoPdfMimeType: text("arquivo_pdf_mime_type"),
    arquivoPdfTamanho: integer("arquivo_pdf_tamanho"),

    conferido: boolean("conferido").notNull().default(false),
    conferidoPorId: text("conferido_por_id").references(() => users.id),
    conferidoEm: timestamp("conferido_em", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    // Sem deleted_at: revisão é imutável/append-only. "Remover" é o status 'cancelado'.
  },
  (table) => [
    unique().on(table.documentoId, table.letra, table.numero),
    unique().on(table.documentoId, table.asBuiltOrdinal),
    check(
      "revisoes_letra_numero_xor_as_built",
      sql`(eh_as_built = false and letra is not null and numero is not null and as_built_ordinal is null)
          or
          (eh_as_built = true and as_built_ordinal is not null and letra is null and numero is null)`
    ),
  ]
);
