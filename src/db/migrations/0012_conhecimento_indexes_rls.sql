-- Custom SQL migration file, put your code below! --

CREATE INDEX "itens_conhecimento_workspace_id_idx" ON "itens_conhecimento" ("workspace_id");
CREATE INDEX "itens_conhecimento_obra_id_idx" ON "itens_conhecimento" ("obra_id");
CREATE INDEX "itens_conhecimento_tipo_idx" ON "itens_conhecimento" ("tipo");
CREATE INDEX "itens_conhecimento_status_idx" ON "itens_conhecimento" ("status");
CREATE INDEX "itens_conhecimento_categoria_id_idx" ON "itens_conhecimento" ("categoria_id");

CREATE INDEX "itens_conhecimento_documentos_item_id_idx" ON "itens_conhecimento_documentos" ("item_conhecimento_id");
CREATE INDEX "itens_conhecimento_documentos_documento_id_idx" ON "itens_conhecimento_documentos" ("documento_id");

CREATE INDEX "foto_itens_conhecimento_foto_id_idx" ON "foto_itens_conhecimento" ("foto_id");
CREATE INDEX "foto_itens_conhecimento_item_id_idx" ON "foto_itens_conhecimento" ("item_conhecimento_id");

CREATE INDEX "categorias_conhecimento_workspace_id_idx" ON "categorias_conhecimento" ("workspace_id");

-- Mesmo padrão de RLS por workspace_id usado em documentos/revisoes/grds/copias_controladas/fotos.
ALTER TABLE "itens_conhecimento" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_isolation" ON "itens_conhecimento"
  USING ("workspace_id" = current_setting('app.current_workspace_id', true));
