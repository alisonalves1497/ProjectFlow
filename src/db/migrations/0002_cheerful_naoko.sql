CREATE TYPE "public"."status_grd" AS ENUM('pendente', 'respondido', 'cancelado');--> statement-breakpoint
CREATE TABLE "contadores_grd_sequencial" (
	"obra_id" text PRIMARY KEY NOT NULL,
	"proximo_valor" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contatos_externos" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"empresa" text,
	"telefone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "grd_destinatarios" (
	"id" text PRIMARY KEY NOT NULL,
	"grd_id" text NOT NULL,
	"contato_externo_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "grd_destinatarios_grd_id_contato_externo_id_unique" UNIQUE("grd_id","contato_externo_id")
);
--> statement-breakpoint
CREATE TABLE "grd_documentos" (
	"id" text PRIMARY KEY NOT NULL,
	"grd_id" text NOT NULL,
	"documento_id" text NOT NULL,
	"revisao_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "grd_documentos_grd_id_documento_id_unique" UNIQUE("grd_id","documento_id")
);
--> statement-breakpoint
CREATE TABLE "grds" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"obra_id" text NOT NULL,
	"numero_sequencial" integer NOT NULL,
	"codigo_completo" text NOT NULL,
	"data_emissao" date NOT NULL,
	"status" "status_grd" DEFAULT 'pendente' NOT NULL,
	"respondido_em" timestamp with time zone,
	"arquivo_excel_url" text,
	"arquivo_carta_pdf_url" text,
	"arquivo_pacote_zip_url" text,
	"arquivo_resposta_nome" text,
	"arquivo_resposta_url" text,
	"criado_por" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "grds_codigo_completo_unique" UNIQUE("codigo_completo")
);
--> statement-breakpoint
ALTER TABLE "contadores_grd_sequencial" ADD CONSTRAINT "contadores_grd_sequencial_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contatos_externos" ADD CONSTRAINT "contatos_externos_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grd_destinatarios" ADD CONSTRAINT "grd_destinatarios_grd_id_grds_id_fk" FOREIGN KEY ("grd_id") REFERENCES "public"."grds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grd_destinatarios" ADD CONSTRAINT "grd_destinatarios_contato_externo_id_contatos_externos_id_fk" FOREIGN KEY ("contato_externo_id") REFERENCES "public"."contatos_externos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grd_documentos" ADD CONSTRAINT "grd_documentos_grd_id_grds_id_fk" FOREIGN KEY ("grd_id") REFERENCES "public"."grds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grd_documentos" ADD CONSTRAINT "grd_documentos_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grd_documentos" ADD CONSTRAINT "grd_documentos_revisao_id_revisoes_id_fk" FOREIGN KEY ("revisao_id") REFERENCES "public"."revisoes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grds" ADD CONSTRAINT "grds_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grds" ADD CONSTRAINT "grds_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grds" ADD CONSTRAINT "grds_criado_por_users_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;