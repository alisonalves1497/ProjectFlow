ALTER TABLE "diario_horas" DROP CONSTRAINT "diario_horas_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "diario_horas" DROP CONSTRAINT "diario_horas_user_id_users_id_fk";
--> statement-breakpoint
DROP TABLE "diario_horas";
--> statement-breakpoint
CREATE TYPE "public"."prioridade_tarefa_pessoal" AS ENUM('urgente', 'alta', 'normal', 'baixa');
--> statement-breakpoint
CREATE TYPE "public"."status_tarefa_pessoal" AS ENUM('pendente', 'feito');
--> statement-breakpoint
CREATE TABLE "tarefas_pessoais" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"nome" text NOT NULL,
	"status" "status_tarefa_pessoal" DEFAULT 'pendente' NOT NULL,
	"data_vencimento" date,
	"data_inicial" date,
	"prioridade" "prioridade_tarefa_pessoal",
	"projeto_id" text,
	"estimativa_minutos" integer,
	"tempo_rastreado_minutos" integer,
	"concluida_em" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tarefas_pessoais" ADD CONSTRAINT "tarefas_pessoais_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tarefas_pessoais" ADD CONSTRAINT "tarefas_pessoais_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tarefas_pessoais" ADD CONSTRAINT "tarefas_pessoais_projeto_id_projetos_id_fk" FOREIGN KEY ("projeto_id") REFERENCES "public"."projetos"("id") ON DELETE set null ON UPDATE no action;
