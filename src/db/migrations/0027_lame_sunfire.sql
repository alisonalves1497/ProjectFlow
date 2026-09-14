ALTER TABLE "diario_entradas" DROP CONSTRAINT "diario_entradas_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "diario_entradas" DROP CONSTRAINT "diario_entradas_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "diario_entradas" DROP CONSTRAINT "diario_entradas_documento_id_documentos_id_fk";
--> statement-breakpoint
DROP TABLE "diario_entradas";
--> statement-breakpoint
CREATE TABLE "diario_horas" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"data" date NOT NULL,
	"hora_inicio" integer NOT NULL,
	"projeto" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "diario_horas_user_id_data_hora_inicio_unique" UNIQUE("user_id","data","hora_inicio")
);
--> statement-breakpoint
ALTER TABLE "diario_horas" ADD CONSTRAINT "diario_horas_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "diario_horas" ADD CONSTRAINT "diario_horas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
