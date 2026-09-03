-- Custom SQL migration file, put your code below! --

-- Índices de apoio à filtragem por workspace_id (RLS) e por chaves estrangeiras
-- de alto volume de consulta (List/Table view, árvore de comentários por revisão, etc.)
CREATE INDEX "documentos_workspace_id_idx" ON "documentos" ("workspace_id");
CREATE INDEX "documentos_obra_id_idx" ON "documentos" ("obra_id");
CREATE INDEX "documentos_disciplina_id_idx" ON "documentos" ("disciplina_id");
CREATE INDEX "documentos_secao_id_idx" ON "documentos" ("secao_id");
CREATE INDEX "documentos_status_idx" ON "documentos" ("status");

CREATE INDEX "revisoes_workspace_id_idx" ON "revisoes" ("workspace_id");
CREATE INDEX "revisoes_documento_id_idx" ON "revisoes" ("documento_id");

CREATE INDEX "comentarios_workspace_id_idx" ON "comentarios" ("workspace_id");
CREATE INDEX "comentarios_revisao_id_idx" ON "comentarios" ("revisao_id");

CREATE INDEX "linha_do_tempo_workspace_id_idx" ON "linha_do_tempo" ("workspace_id");
CREATE INDEX "linha_do_tempo_documento_id_idx" ON "linha_do_tempo" ("documento_id");

-- Row-Level Security por workspace_id. A aplicação deve setar
-- `SET LOCAL app.current_workspace_id = '<ulid>'` no início de cada transação/request.
ALTER TABLE "documentos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "revisoes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "comentarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "linha_do_tempo" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_isolation" ON "documentos"
  USING ("workspace_id" = current_setting('app.current_workspace_id', true));
CREATE POLICY "workspace_isolation" ON "revisoes"
  USING ("workspace_id" = current_setting('app.current_workspace_id', true));
CREATE POLICY "workspace_isolation" ON "comentarios"
  USING ("workspace_id" = current_setting('app.current_workspace_id', true));
CREATE POLICY "workspace_isolation" ON "linha_do_tempo"
  USING ("workspace_id" = current_setting('app.current_workspace_id', true));

-- Linha do tempo é append-only por design: bloqueia UPDATE/DELETE no nível do banco,
-- não só por convenção da camada de serviço.
CREATE OR REPLACE FUNCTION reject_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'linha_do_tempo é append-only: % não é permitido', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "linha_do_tempo_no_update"
  BEFORE UPDATE ON "linha_do_tempo"
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();

CREATE TRIGGER "linha_do_tempo_no_delete"
  BEFORE DELETE ON "linha_do_tempo"
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();
