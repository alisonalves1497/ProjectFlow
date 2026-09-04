CREATE TABLE "secoes_padrao" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"disciplina_id" text NOT NULL,
	"name" text NOT NULL,
	"ordem" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "secoes_padrao_disciplina_id_name_unique" UNIQUE("disciplina_id","name")
);
--> statement-breakpoint
ALTER TABLE "secoes_padrao" ADD CONSTRAINT "secoes_padrao_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secoes_padrao" ADD CONSTRAINT "secoes_padrao_disciplina_id_disciplinas_id_fk" FOREIGN KEY ("disciplina_id") REFERENCES "public"."disciplinas"("id") ON DELETE cascade ON UPDATE no action;