CREATE TABLE "documento_lista_visitas" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"obra_id" text NOT NULL,
	"visitado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documento_lista_visitas_user_id_obra_id_unique" UNIQUE("user_id","obra_id")
);
--> statement-breakpoint
ALTER TABLE "documentos" ADD COLUMN "status_updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "documento_lista_visitas" ADD CONSTRAINT "documento_lista_visitas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento_lista_visitas" ADD CONSTRAINT "documento_lista_visitas_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE cascade ON UPDATE no action;