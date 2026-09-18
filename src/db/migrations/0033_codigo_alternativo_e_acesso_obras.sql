ALTER TABLE "documentos" ADD COLUMN "codigo_alternativo" text;
--> statement-breakpoint
-- Libera TODAS as obras já existentes pra TODOS os membros do workspace (pedido: acesso geral,
-- e quem administra tira manualmente de quem não deve ver). Idempotente: quem já tem linha
-- em obra_members é ignorado.
INSERT INTO "obra_members" ("id", "obra_id", "user_id")
SELECT 'obm_' || replace(gen_random_uuid()::text, '-', ''), o."id", wm."user_id"
FROM "obras" o
JOIN "workspace_members" wm ON wm."workspace_id" = o."workspace_id"
ON CONFLICT ("obra_id", "user_id") DO NOTHING;
