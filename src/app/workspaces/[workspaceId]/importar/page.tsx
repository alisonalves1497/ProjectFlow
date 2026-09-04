import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getWorkspaceRole } from "@/services/permissions";
import { listProjetos } from "@/services/projetoService";
import { ImportWizard } from "./import-wizard";

type Params = {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ projetoId?: string }>;
};

export default async function ImportarPage({ params, searchParams }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId } = await params;
  const sp = await searchParams;
  const role = await getWorkspaceRole(session.user.id, workspaceId);
  if (!role) redirect("/workspaces");
  if (role !== "administrador" && role !== "coordenador") redirect(`/workspaces/${workspaceId}`);

  const projetos = await listProjetos(workspaceId);
  // Veio de um "+" de um Projeto específico (ex: árvore do menu) — pré-seleciona ele no
  // wizard em vez de cair no primeiro da lista.
  const projetoIdInicial = projetos.some((p) => p.id === sp.projetoId) ? sp.projetoId : undefined;

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-1 text-2xl font-semibold">Importar lista de documentos</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Sobe uma planilha no formato "ITEM / Nº DOCUMENTO / DESCRIÇÃO / DISCIPLINA" e cria os documentos direto numa Obra nova.
      </p>
      <ImportWizard
        workspaceId={workspaceId}
        projetos={projetos.map((p) => ({ id: p.id, code: p.code, name: p.name }))}
        projetoIdInicial={projetoIdInicial}
      />
    </div>
  );
}
