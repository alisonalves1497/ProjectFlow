-- Custom SQL migration file, put your code below! --

CREATE INDEX "grds_workspace_id_idx" ON "grds" ("workspace_id");
CREATE INDEX "grds_obra_id_idx" ON "grds" ("obra_id");
CREATE INDEX "grds_status_idx" ON "grds" ("status");

CREATE INDEX "grd_documentos_grd_id_idx" ON "grd_documentos" ("grd_id");
CREATE INDEX "grd_documentos_documento_id_idx" ON "grd_documentos" ("documento_id");

CREATE INDEX "grd_destinatarios_grd_id_idx" ON "grd_destinatarios" ("grd_id");

CREATE INDEX "contatos_externos_workspace_id_idx" ON "contatos_externos" ("workspace_id");

-- Mesmo padrão de RLS por workspace_id usado em documentos/revisoes/comentarios/linha_do_tempo.
-- contatos_externos e as tabelas de junção (grd_documentos, grd_destinatarios) não têm
-- workspace_id próprio — são sempre acessadas via join a partir de um grd já filtrado.
ALTER TABLE "grds" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_isolation" ON "grds"
  USING ("workspace_id" = current_setting('app.current_workspace_id', true));
