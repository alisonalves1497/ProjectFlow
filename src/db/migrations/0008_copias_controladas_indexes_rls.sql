-- Custom SQL migration file, put your code below! --

CREATE INDEX "copias_controladas_workspace_id_idx" ON "copias_controladas" ("workspace_id");
CREATE INDEX "copias_controladas_obra_id_idx" ON "copias_controladas" ("obra_id");
CREATE INDEX "copias_controladas_documento_id_idx" ON "copias_controladas" ("documento_id");
CREATE INDEX "copias_controladas_status_idx" ON "copias_controladas" ("status");
CREATE INDEX "copias_controladas_detentor_id_idx" ON "copias_controladas" ("detentor_id");

-- Mesmo padrão de RLS por workspace_id usado em documentos/revisoes/grds/itens_suprimento.
ALTER TABLE "copias_controladas" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_isolation" ON "copias_controladas"
  USING ("workspace_id" = current_setting('app.current_workspace_id', true));
