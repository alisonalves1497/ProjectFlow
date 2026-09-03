CREATE TYPE "public"."workspace_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."status_documento" AS ENUM('previsto', 'em_elaboracao', 'devolvido_correcao', 'em_revisao_interna', 'aprovacao_lider_tecnico', 'aguardando_envio_ged', 'em_analise_cliente', 'aprovado', 'aprovado_com_comentarios', 'reprovado', 'liberado_para_construcao', 'devolvido_pelo_cliente', 'informativo', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."revisao_kind" AS ENUM('ciclo_aprovacao', 'emitida', 'as_built');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp with time zone,
	"image" text,
	"password_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "workspace_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_members_workspace_id_user_id_unique" UNIQUE("workspace_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "disciplinas" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "disciplinas_workspace_id_code_unique" UNIQUE("workspace_id","code")
);
--> statement-breakpoint
CREATE TABLE "fases" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fases_workspace_id_code_unique" UNIQUE("workspace_id","code")
);
--> statement-breakpoint
CREATE TABLE "tipos_documento" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tipos_documento_workspace_id_code_unique" UNIQUE("workspace_id","code")
);
--> statement-breakpoint
CREATE TABLE "obra_disciplinas" (
	"id" text PRIMARY KEY NOT NULL,
	"obra_id" text NOT NULL,
	"disciplina_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "obra_disciplinas_obra_id_disciplina_id_unique" UNIQUE("obra_id","disciplina_id")
);
--> statement-breakpoint
CREATE TABLE "obra_members" (
	"id" text PRIMARY KEY NOT NULL,
	"obra_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "obra_members_obra_id_user_id_unique" UNIQUE("obra_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "obras" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"projeto_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "obras_projeto_id_code_unique" UNIQUE("projeto_id","code")
);
--> statement-breakpoint
CREATE TABLE "projetos" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "projetos_workspace_id_code_unique" UNIQUE("workspace_id","code")
);
--> statement-breakpoint
CREATE TABLE "secoes" (
	"id" text PRIMARY KEY NOT NULL,
	"obra_disciplina_id" text NOT NULL,
	"name" text NOT NULL,
	"position" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contadores_sequencial" (
	"obra_id" text NOT NULL,
	"disciplina_id" text NOT NULL,
	"tipo_documento_id" text NOT NULL,
	"proximo_valor" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "contadores_sequencial_obra_id_disciplina_id_tipo_documento_id_pk" PRIMARY KEY("obra_id","disciplina_id","tipo_documento_id")
);
--> statement-breakpoint
CREATE TABLE "documentos" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"obra_id" text NOT NULL,
	"disciplina_id" text NOT NULL,
	"secao_id" text NOT NULL,
	"fase_id" text NOT NULL,
	"tipo_documento_id" text NOT NULL,
	"sequencial" integer NOT NULL,
	"codigo_completo" text NOT NULL,
	"descricao" text NOT NULL,
	"responsavel_id" text,
	"data_baseline" date,
	"data_reprogramada" date,
	"data_prevista" date,
	"status" "status_documento" DEFAULT 'previsto' NOT NULL,
	"current_revision_id" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "documentos_codigo_completo_unique" UNIQUE("codigo_completo")
);
--> statement-breakpoint
CREATE TABLE "revisoes" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"documento_id" text NOT NULL,
	"kind" "revisao_kind" NOT NULL,
	"ordinal" integer NOT NULL,
	"label" text NOT NULL,
	"status" "status_documento" DEFAULT 'em_elaboracao' NOT NULL,
	"revisao_anterior_id" text,
	"autor_id" text NOT NULL,
	"enviado_cliente_em" timestamp with time zone,
	"retornado_em" timestamp with time zone,
	"arquivo_original_nome" text,
	"arquivo_original_url" text,
	"arquivo_pdf_nome" text,
	"arquivo_pdf_url" text,
	"conferido" boolean DEFAULT false NOT NULL,
	"conferido_por_id" text,
	"conferido_em" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "revisoes_documento_id_kind_ordinal_unique" UNIQUE("documento_id","kind","ordinal")
);
--> statement-breakpoint
CREATE TABLE "comentarios" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"revisao_id" text NOT NULL,
	"autor_id" text NOT NULL,
	"corpo" text NOT NULL,
	"anexo_nome" text,
	"anexo_url" text,
	"marcar_pendencia_cliente" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "linha_do_tempo" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"documento_id" text NOT NULL,
	"revisao_id" text,
	"evento" text NOT NULL,
	"autor_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disciplinas" ADD CONSTRAINT "disciplinas_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fases" ADD CONSTRAINT "fases_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tipos_documento" ADD CONSTRAINT "tipos_documento_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obra_disciplinas" ADD CONSTRAINT "obra_disciplinas_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obra_disciplinas" ADD CONSTRAINT "obra_disciplinas_disciplina_id_disciplinas_id_fk" FOREIGN KEY ("disciplina_id") REFERENCES "public"."disciplinas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obra_members" ADD CONSTRAINT "obra_members_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obra_members" ADD CONSTRAINT "obra_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obras" ADD CONSTRAINT "obras_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obras" ADD CONSTRAINT "obras_projeto_id_projetos_id_fk" FOREIGN KEY ("projeto_id") REFERENCES "public"."projetos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projetos" ADD CONSTRAINT "projetos_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secoes" ADD CONSTRAINT "secoes_obra_disciplina_id_obra_disciplinas_id_fk" FOREIGN KEY ("obra_disciplina_id") REFERENCES "public"."obra_disciplinas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contadores_sequencial" ADD CONSTRAINT "contadores_sequencial_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contadores_sequencial" ADD CONSTRAINT "contadores_sequencial_disciplina_id_disciplinas_id_fk" FOREIGN KEY ("disciplina_id") REFERENCES "public"."disciplinas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contadores_sequencial" ADD CONSTRAINT "contadores_sequencial_tipo_documento_id_tipos_documento_id_fk" FOREIGN KEY ("tipo_documento_id") REFERENCES "public"."tipos_documento"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_disciplina_id_disciplinas_id_fk" FOREIGN KEY ("disciplina_id") REFERENCES "public"."disciplinas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_secao_id_secoes_id_fk" FOREIGN KEY ("secao_id") REFERENCES "public"."secoes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_fase_id_fases_id_fk" FOREIGN KEY ("fase_id") REFERENCES "public"."fases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_tipo_documento_id_tipos_documento_id_fk" FOREIGN KEY ("tipo_documento_id") REFERENCES "public"."tipos_documento"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_responsavel_id_users_id_fk" FOREIGN KEY ("responsavel_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revisoes" ADD CONSTRAINT "revisoes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revisoes" ADD CONSTRAINT "revisoes_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revisoes" ADD CONSTRAINT "revisoes_revisao_anterior_id_revisoes_id_fk" FOREIGN KEY ("revisao_anterior_id") REFERENCES "public"."revisoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revisoes" ADD CONSTRAINT "revisoes_autor_id_users_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revisoes" ADD CONSTRAINT "revisoes_conferido_por_id_users_id_fk" FOREIGN KEY ("conferido_por_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_revisao_id_revisoes_id_fk" FOREIGN KEY ("revisao_id") REFERENCES "public"."revisoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_autor_id_users_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linha_do_tempo" ADD CONSTRAINT "linha_do_tempo_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linha_do_tempo" ADD CONSTRAINT "linha_do_tempo_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linha_do_tempo" ADD CONSTRAINT "linha_do_tempo_revisao_id_revisoes_id_fk" FOREIGN KEY ("revisao_id") REFERENCES "public"."revisoes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linha_do_tempo" ADD CONSTRAINT "linha_do_tempo_autor_id_users_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;