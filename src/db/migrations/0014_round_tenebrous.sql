CREATE TABLE "documento_favoritos" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"documento_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documento_favoritos_user_id_documento_id_unique" UNIQUE("user_id","documento_id")
);
--> statement-breakpoint
ALTER TABLE "documento_favoritos" ADD CONSTRAINT "documento_favoritos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento_favoritos" ADD CONSTRAINT "documento_favoritos_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;