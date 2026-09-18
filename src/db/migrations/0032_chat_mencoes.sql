CREATE TABLE "documento_chat_mencoes" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"mensagem_id" text NOT NULL,
	"documento_id" text NOT NULL,
	"usuario_mencionado_id" text NOT NULL,
	"lida" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documento_chat_mencoes_mensagem_id_usuario_mencionado_id_unique" UNIQUE("mensagem_id","usuario_mencionado_id")
);
--> statement-breakpoint
ALTER TABLE "documento_chat_mencoes" ADD CONSTRAINT "documento_chat_mencoes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "documento_chat_mencoes" ADD CONSTRAINT "documento_chat_mencoes_mensagem_id_documento_chat_mensagens_id_fk" FOREIGN KEY ("mensagem_id") REFERENCES "public"."documento_chat_mensagens"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "documento_chat_mencoes" ADD CONSTRAINT "documento_chat_mencoes_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "documento_chat_mencoes" ADD CONSTRAINT "documento_chat_mencoes_usuario_mencionado_id_users_id_fk" FOREIGN KEY ("usuario_mencionado_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
