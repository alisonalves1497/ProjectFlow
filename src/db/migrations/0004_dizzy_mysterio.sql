CREATE TABLE "fornecedores" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"nome" text NOT NULL,
	"cnpj" text,
	"email" text,
	"telefone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "itens_suprimento" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"obra_id" text NOT NULL,
	"disciplina_id" text NOT NULL,
	"codigo" text,
	"categoria" text,
	"nome" text NOT NULL,
	"quantidade" numeric(14, 3) NOT NULL,
	"unidade_medida" text NOT NULL,
	"valor_unitario" numeric(14, 2) NOT NULL,
	"valor_total" numeric(16, 2) GENERATED ALWAYS AS ((quantidade * valor_unitario)) STORED,
	"fornecedor_id" text,
	"prazo_previsto" date,
	"comprado_em" date,
	"comprado" boolean DEFAULT false NOT NULL,
	"critico" boolean DEFAULT false NOT NULL,
	"numero_pedido_compra" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "itens_suprimento_documentos" (
	"id" text PRIMARY KEY NOT NULL,
	"item_suprimento_id" text NOT NULL,
	"documento_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "itens_suprimento_documentos_item_suprimento_id_documento_id_unique" UNIQUE("item_suprimento_id","documento_id")
);
--> statement-breakpoint
ALTER TABLE "obras" ADD COLUMN "orcamento_total" numeric(16, 2);--> statement-breakpoint
ALTER TABLE "fornecedores" ADD CONSTRAINT "fornecedores_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_suprimento" ADD CONSTRAINT "itens_suprimento_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_suprimento" ADD CONSTRAINT "itens_suprimento_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_suprimento" ADD CONSTRAINT "itens_suprimento_disciplina_id_disciplinas_id_fk" FOREIGN KEY ("disciplina_id") REFERENCES "public"."disciplinas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_suprimento" ADD CONSTRAINT "itens_suprimento_fornecedor_id_fornecedores_id_fk" FOREIGN KEY ("fornecedor_id") REFERENCES "public"."fornecedores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_suprimento" ADD CONSTRAINT "itens_suprimento_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_suprimento_documentos" ADD CONSTRAINT "itens_suprimento_documentos_item_suprimento_id_itens_suprimento_id_fk" FOREIGN KEY ("item_suprimento_id") REFERENCES "public"."itens_suprimento"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_suprimento_documentos" ADD CONSTRAINT "itens_suprimento_documentos_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE restrict ON UPDATE no action;