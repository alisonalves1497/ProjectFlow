ALTER TABLE "tarefas_pessoais" ADD COLUMN "documento_id" text;
--> statement-breakpoint
ALTER TABLE "tarefas_pessoais" ADD CONSTRAINT "tarefas_pessoais_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE set null ON UPDATE no action;
