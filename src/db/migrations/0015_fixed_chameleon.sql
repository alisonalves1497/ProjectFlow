CREATE TABLE "anexos_revisao" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"revisao_id" text NOT NULL,
	"arquivo_chave" text NOT NULL,
	"arquivo_nome" text NOT NULL,
	"arquivo_mime_type" text NOT NULL,
	"arquivo_tamanho" integer NOT NULL,
	"criado_por" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "revisoes" ADD COLUMN "arquivo_original_chave" text;--> statement-breakpoint
ALTER TABLE "revisoes" ADD COLUMN "arquivo_original_mime_type" text;--> statement-breakpoint
ALTER TABLE "revisoes" ADD COLUMN "arquivo_original_tamanho" integer;--> statement-breakpoint
ALTER TABLE "revisoes" ADD COLUMN "arquivo_pdf_chave" text;--> statement-breakpoint
ALTER TABLE "revisoes" ADD COLUMN "arquivo_pdf_mime_type" text;--> statement-breakpoint
ALTER TABLE "revisoes" ADD COLUMN "arquivo_pdf_tamanho" integer;--> statement-breakpoint
ALTER TABLE "anexos_revisao" ADD CONSTRAINT "anexos_revisao_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anexos_revisao" ADD CONSTRAINT "anexos_revisao_revisao_id_revisoes_id_fk" FOREIGN KEY ("revisao_id") REFERENCES "public"."revisoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anexos_revisao" ADD CONSTRAINT "anexos_revisao_criado_por_users_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;