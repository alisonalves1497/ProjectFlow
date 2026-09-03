CREATE TYPE "public"."status_copia_controlada" AS ENUM('ativa', 'substituida', 'cancelada');--> statement-breakpoint
CREATE TABLE "copias_controladas" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"obra_id" text NOT NULL,
	"documento_id" text NOT NULL,
	"revisao_id" text NOT NULL,
	"detentor_id" text NOT NULL,
	"status" "status_copia_controlada" DEFAULT 'ativa' NOT NULL,
	"substituiu_copia_id" text,
	"data_fechamento" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "copias_controladas" ADD CONSTRAINT "copias_controladas_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copias_controladas" ADD CONSTRAINT "copias_controladas_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copias_controladas" ADD CONSTRAINT "copias_controladas_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copias_controladas" ADD CONSTRAINT "copias_controladas_revisao_id_revisoes_id_fk" FOREIGN KEY ("revisao_id") REFERENCES "public"."revisoes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copias_controladas" ADD CONSTRAINT "copias_controladas_detentor_id_users_id_fk" FOREIGN KEY ("detentor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copias_controladas" ADD CONSTRAINT "copias_controladas_substituiu_copia_id_copias_controladas_id_fk" FOREIGN KEY ("substituiu_copia_id") REFERENCES "public"."copias_controladas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copias_controladas" ADD CONSTRAINT "copias_controladas_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "copias_controladas_documento_detentor_ativa_idx" ON "copias_controladas" USING btree ("documento_id","detentor_id") WHERE status = 'ativa';