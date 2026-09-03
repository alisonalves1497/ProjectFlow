// Só os tipos/constantes de papel do workspace — sem nenhum import de banco, pra poder
// ser usado tanto em Server quanto em Client Components (@/services/permissions puxa
// @/db/client, que quebra se importado por um "use client").
export type WorkspaceRole = "administrador" | "coordenador" | "lider_aprovador" | "analista";

export const ALL_WORKSPACE_ROLES: WorkspaceRole[] = ["administrador", "coordenador", "lider_aprovador", "analista"];

export const WORKSPACE_ROLE_LABELS: Record<WorkspaceRole, string> = {
  administrador: "Administrador",
  coordenador: "Coordenador",
  lider_aprovador: "Líder aprovador",
  analista: "Analista",
};

export const WORKSPACE_ROLE_DESCRIPTIONS: Record<WorkspaceRole, string> = {
  administrador: "Acesso total — configura o workspace, gerencia membros e todas as Obras.",
  coordenador: "Cria, edita e exclui Projetos e Obras que tem acesso; gerencia quem mais acessa essas Obras.",
  lider_aprovador: "Aprova ou reprova revisões nas Obras que tem acesso.",
  analista: "Cria e edita documentos, sobe revisões e comenta nas Obras que tem acesso.",
};
