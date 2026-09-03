import { pgTable, text, timestamp, integer, pgEnum, unique, primaryKey } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { obras } from "./hierarquia";
import { users } from "./auth";
import { documentos } from "./documentos";
import { fotos } from "./fotos";
import { categoriasConhecimento } from "./catalogos";

export const tipoItemConhecimentoEnum = pgEnum("tipo_item_conhecimento", ["rfi", "rnc"]);

// União dos status de RFI (aberta/em_analise/respondida/fechada) e RNC (aberta/em_analise/
// em_correcao/corrigida/verificada/fechada) — mesmo padrão de status_documento, compartilhado
// entre tipos com grafo de transição válida reforçado na camada de serviço, não no banco.
export const statusItemConhecimentoEnum = pgEnum("status_item_conhecimento", [
  "aberta",
  "em_analise",
  "respondida",
  "em_correcao",
  "corrigida",
  "verificada",
  "fechada",
]);

// Sequencial por (obra, tipo) — RFI e RNC têm contadores independentes na mesma obra.
export const contadoresConhecimentoSequencial = pgTable(
  "contadores_conhecimento_sequencial",
  {
    obraId: text("obra_id").notNull().references(() => obras.id, { onDelete: "cascade" }),
    tipo: tipoItemConhecimentoEnum("tipo").notNull(),
    proximoValor: integer("proximo_valor").notNull().default(1),
  },
  (table) => [primaryKey({ columns: [table.obraId, table.tipo] })]
);

export const itensConhecimento = pgTable(
  "itens_conhecimento",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    obraId: text("obra_id").notNull().references(() => obras.id, { onDelete: "cascade" }),

    tipo: tipoItemConhecimentoEnum("tipo").notNull(),
    numeroSequencial: integer("numero_sequencial").notNull(),
    codigoCompleto: text("codigo_completo").notNull(), // 'RFI-CTO-001' / 'RNC-CTO-001', calculado na criação

    // Catálogo compartilhado entre RFI e RNC. Opcional na criação — Lições Aprendidas
    // filtra por status='fechada' E categoria preenchida, então item sem categoria
    // nunca aparece lá, mas continua existindo normalmente na lista de RFI/RNC.
    categoriaId: text("categoria_id").references(() => categoriasConhecimento.id, { onDelete: "restrict" }),

    titulo: text("titulo").notNull(),
    descricao: text("descricao").notNull(),
    status: statusItemConhecimentoEnum("status").notNull().default("aberta"),

    // Fechamento de RFI — null numa RNC.
    resposta: text("resposta"),
    respondidoPorId: text("respondido_por_id").references(() => users.id),
    respondidoEm: timestamp("respondido_em", { withTimezone: true }),

    // Fechamento de RNC — null numa RFI. Correção e verificação são passos
    // separados de propósito (quem corrige não é necessariamente quem verifica).
    acaoCorretiva: text("acao_corretiva"),
    corrigidoPorId: text("corrigido_por_id").references(() => users.id),
    corrigidoEm: timestamp("corrigido_em", { withTimezone: true }),
    verificadoPorId: text("verificado_por_id").references(() => users.id),
    verificadoEm: timestamp("verificado_em", { withTimezone: true }),

    fechadoPorId: text("fechado_por_id").references(() => users.id),
    fechadoEm: timestamp("fechado_em", { withTimezone: true }),

    criadoPor: text("criado_por").notNull().references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [unique().on(table.codigoCompleto)]
);

// Vínculo opcional com Documento — 0..N documentos por item, mesmo padrão N:0..N
// de itens_suprimento_documentos / foto_documentos.
export const itensConhecimentoDocumentos = pgTable(
  "itens_conhecimento_documentos",
  {
    id: text("id").primaryKey(),
    itemConhecimentoId: text("item_conhecimento_id").notNull().references(() => itensConhecimento.id, { onDelete: "cascade" }),
    documentoId: text("documento_id").notNull().references(() => documentos.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.itemConhecimentoId, table.documentoId)]
);

// Vínculo opcional com Foto (evidência) — reaproveita o mesmo padrão N:0..N do
// Registro Fotográfico, agora ligando foto a um item de RFI/RNC em vez de a um Documento.
export const fotoItensConhecimento = pgTable(
  "foto_itens_conhecimento",
  {
    id: text("id").primaryKey(),
    fotoId: text("foto_id").notNull().references(() => fotos.id, { onDelete: "cascade" }),
    itemConhecimentoId: text("item_conhecimento_id").notNull().references(() => itensConhecimento.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.fotoId, table.itemConhecimentoId)]
);
