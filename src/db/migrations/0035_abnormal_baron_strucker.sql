ALTER TABLE "tarefas_pessoais" ADD COLUMN "status_livre_negrito" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tarefas_pessoais" ADD COLUMN "status_livre_cor" text;--> statement-breakpoint
ALTER TABLE "tarefas_pessoais" ADD COLUMN "status_livre_fundo" text;--> statement-breakpoint
ALTER TABLE "tarefas_pessoais" ADD COLUMN "obs_negrito" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tarefas_pessoais" ADD COLUMN "obs_cor" text;--> statement-breakpoint
ALTER TABLE "tarefas_pessoais" ADD COLUMN "obs_fundo" text;