-- Custom SQL migration file, put your code below! --

CREATE INDEX "itens_suprimento_workspace_id_idx" ON "itens_suprimento" ("workspace_id");
CREATE INDEX "itens_suprimento_obra_id_idx" ON "itens_suprimento" ("obra_id");
CREATE INDEX "itens_suprimento_disciplina_id_idx" ON "itens_suprimento" ("disciplina_id");
CREATE INDEX "itens_suprimento_fornecedor_id_idx" ON "itens_suprimento" ("fornecedor_id");
CREATE INDEX "itens_suprimento_comprado_idx" ON "itens_suprimento" ("comprado");

CREATE INDEX "itens_suprimento_documentos_item_id_idx" ON "itens_suprimento_documentos" ("item_suprimento_id");
CREATE INDEX "itens_suprimento_documentos_documento_id_idx" ON "itens_suprimento_documentos" ("documento_id");

CREATE INDEX "fornecedores_workspace_id_idx" ON "fornecedores" ("workspace_id");

-- Mesma política de RLS por workspace_id das outras tabelas hot-path.
-- fornecedores e a tabela de junção com documentos não têm workspace_id próprio.
ALTER TABLE "itens_suprimento" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_isolation" ON "itens_suprimento"
  USING ("workspace_id" = current_setting('app.current_workspace_id', true));
