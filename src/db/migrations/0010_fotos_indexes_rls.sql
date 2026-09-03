-- Custom SQL migration file, put your code below! --

CREATE INDEX "fotos_workspace_id_idx" ON "fotos" ("workspace_id");
CREATE INDEX "fotos_obra_id_idx" ON "fotos" ("obra_id");

CREATE INDEX "foto_documentos_foto_id_idx" ON "foto_documentos" ("foto_id");
CREATE INDEX "foto_documentos_documento_id_idx" ON "foto_documentos" ("documento_id");

-- Mesmo padrão de RLS por workspace_id usado em documentos/revisoes/grds/copias_controladas.
ALTER TABLE "fotos" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_isolation" ON "fotos"
  USING ("workspace_id" = current_setting('app.current_workspace_id', true));
