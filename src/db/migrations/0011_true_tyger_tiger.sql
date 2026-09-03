CREATE TYPE "public"."status_item_conhecimento" AS ENUM('aberta', 'em_analise', 'respondida', 'em_correcao', 'corrigida', 'verificada', 'fechada');--> statement-breakpoint
CREATE TYPE "public"."tipo_item_conhecimento" AS ENUM('rfi', 'rnc');--> statement-breakpoint
CREATE TABLE "categorias_conhecimento" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categorias_conhecimento_workspace_id_code_unique" UNIQUE("workspace_id","code")
);
--> statement-breakpoint
CREATE TABLE "contadores_conhecimento_sequencial" (
	"obra_id" text NOT NULL,
	"tipo" "tipo_item_conhecimento" NOT NULL,
	"proximo_valor" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "contadores_conhecimento_sequencial_obra_id_tipo_pk" PRIMARY KEY("obra_id","tipo")
);
--> statement-breakpoint
CREATE TABLE "foto_itens_conhecimento" (
	"id" text PRIMARY KEY NOT NULL,
	"foto_id" text NOT NULL,
	"item_conhecimento_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "foto_itens_conhecimento_foto_id_item_conhecimento_id_unique" UNIQUE("foto_id","item_conhecimento_id")
);
--> statement-breakpoint
CREATE TABLE "itens_conhecimento" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"obra_id" text NOT NULL,
	"tipo" "tipo_item_conhecimento" NOT NULL,
	"numero_sequencial" integer NOT NULL,
	"codigo_completo" text NOT NULL,
	"categoria_id" text,
	"titulo" text NOT NULL,
	"descricao" text NOT NULL,
	"status" "status_item_conhecimento" DEFAULT 'aberta' NOT NULL,
	"resposta" text,
	"respondido_por_id" text,
	"respondido_em" timestamp with time zone,
	"acao_corretiva" text,
	"corrigido_por_id" text,
	"corrigido_em" timestamp with time zone,
	"verificado_por_id" text,
	"verificado_em" timestamp with time zone,
	"fechado_por_id" text,
	"fechado_em" timestamp with time zone,
	"criado_por" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "itens_conhecimento_codigo_completo_unique" UNIQUE("codigo_completo")
);
--> statement-breakpoint
CREATE TABLE "itens_conhecimento_documentos" (
	"id" text PRIMARY KEY NOT NULL,
	"item_conhecimento_id" text NOT NULL,
	"documento_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "itens_conhecimento_documentos_item_conhecimento_id_documento_id_unique" UNIQUE("item_conhecimento_id","documento_id")
);
--> statement-breakpoint
ALTER TABLE "categorias_conhecimento" ADD CONSTRAINT "categorias_conhecimento_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contadores_conhecimento_sequencial" ADD CONSTRAINT "contadores_conhecimento_sequencial_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foto_itens_conhecimento" ADD CONSTRAINT "foto_itens_conhecimento_foto_id_fotos_id_fk" FOREIGN KEY ("foto_id") REFERENCES "public"."fotos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foto_itens_conhecimento" ADD CONSTRAINT "foto_itens_conhecimento_item_conhecimento_id_itens_conhecimento_id_fk" FOREIGN KEY ("item_conhecimento_id") REFERENCES "public"."itens_conhecimento"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_conhecimento" ADD CONSTRAINT "itens_conhecimento_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_conhecimento" ADD CONSTRAINT "itens_conhecimento_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_conhecimento" ADD CONSTRAINT "itens_conhecimento_categoria_id_categorias_conhecimento_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias_conhecimento"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_conhecimento" ADD CONSTRAINT "itens_conhecimento_respondido_por_id_users_id_fk" FOREIGN KEY ("respondido_por_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_conhecimento" ADD CONSTRAINT "itens_conhecimento_corrigido_por_id_users_id_fk" FOREIGN KEY ("corrigido_por_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_conhecimento" ADD CONSTRAINT "itens_conhecimento_verificado_por_id_users_id_fk" FOREIGN KEY ("verificado_por_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_conhecimento" ADD CONSTRAINT "itens_conhecimento_fechado_por_id_users_id_fk" FOREIGN KEY ("fechado_por_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_conhecimento" ADD CONSTRAINT "itens_conhecimento_criado_por_users_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_conhecimento_documentos" ADD CONSTRAINT "itens_conhecimento_documentos_item_conhecimento_id_itens_conhecimento_id_fk" FOREIGN KEY ("item_conhecimento_id") REFERENCES "public"."itens_conhecimento"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_conhecimento_documentos" ADD CONSTRAINT "itens_conhecimento_documentos_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE restrict ON UPDATE no action;