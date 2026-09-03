import { pgTable, text, timestamp, pgEnum, unique } from "drizzle-orm/pg-core";
import { users } from "./auth";

// administrador: acesso total (config do workspace, membros, todas as Obras).
// coordenador: cria/edita/exclui Projetos e Obras, mas só nas que tem acesso (obra_members).
// lider_aprovador: aprova/reprova revisões, só nas Obras que tem acesso.
// analista: cria/edita documentos e revisões, só nas Obras que tem acesso.
export const workspaceRoleEnum = pgEnum("workspace_role", ["administrador", "coordenador", "lider_aprovador", "analista"]);

export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: workspaceRoleEnum("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.workspaceId, table.userId)]
);
