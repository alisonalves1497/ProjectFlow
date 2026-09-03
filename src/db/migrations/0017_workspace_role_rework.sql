ALTER TYPE "workspace_role" RENAME VALUE 'owner' TO 'administrador';--> statement-breakpoint
ALTER TYPE "workspace_role" RENAME VALUE 'admin' TO 'coordenador';--> statement-breakpoint
ALTER TYPE "workspace_role" RENAME VALUE 'member' TO 'analista';--> statement-breakpoint
ALTER TYPE "workspace_role" ADD VALUE 'lider_aprovador';
