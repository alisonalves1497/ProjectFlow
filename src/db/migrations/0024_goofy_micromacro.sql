ALTER TABLE "secoes_padrao" ADD COLUMN "palavras_chave" jsonb;--> statement-breakpoint
ALTER TABLE "secoes_padrao" ADD COLUMN "fallback" boolean DEFAULT false NOT NULL;