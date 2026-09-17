ALTER TABLE "itens_conhecimento_documentos" DROP CONSTRAINT "itens_conhecimento_documentos_documento_id_documentos_id_fk";
--> statement-breakpoint
ALTER TABLE "foto_documentos" DROP CONSTRAINT "foto_documentos_documento_id_documentos_id_fk";
--> statement-breakpoint
ALTER TABLE "itens_suprimento_documentos" DROP CONSTRAINT "itens_suprimento_documentos_documento_id_documentos_id_fk";
--> statement-breakpoint
ALTER TABLE "grd_documentos" DROP CONSTRAINT "grd_documentos_documento_id_documentos_id_fk";
--> statement-breakpoint
ALTER TABLE "grd_documentos" DROP CONSTRAINT "grd_documentos_revisao_id_revisoes_id_fk";
--> statement-breakpoint
ALTER TABLE "copias_controladas" DROP CONSTRAINT "copias_controladas_revisao_id_revisoes_id_fk";
--> statement-breakpoint
ALTER TABLE "itens_conhecimento_documentos" ADD CONSTRAINT "itens_conhecimento_documentos_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "foto_documentos" ADD CONSTRAINT "foto_documentos_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "itens_suprimento_documentos" ADD CONSTRAINT "itens_suprimento_documentos_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "grd_documentos" ADD CONSTRAINT "grd_documentos_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "grd_documentos" ADD CONSTRAINT "grd_documentos_revisao_id_revisoes_id_fk" FOREIGN KEY ("revisao_id") REFERENCES "public"."revisoes"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "copias_controladas" ADD CONSTRAINT "copias_controladas_revisao_id_revisoes_id_fk" FOREIGN KEY ("revisao_id") REFERENCES "public"."revisoes"("id") ON DELETE cascade ON UPDATE no action;
