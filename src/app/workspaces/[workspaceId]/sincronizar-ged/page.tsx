import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getWorkspaceRole } from "@/services/permissions";
import { getArvoreProjetos, flattenArvoreParaOpcoes } from "@/services/navegacaoService";
import { listDisciplinasComSecoesPorObra, listFases } from "@/services/catalogoService";
import { SincronizarGedWizard } from "./sync-wizard";

type Params = {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ obraId?: string; disciplinaId?: string }>;
};

export default async function SincronizarGedPage({ params, searchParams }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId } = await params;
  const sp = await searchParams;
  const role = await getWorkspaceRole(session.user.id, workspaceId);
  if (!role) redirect("/workspaces");
  if (role !== "administrador" && role !== "coordenador") redirect(`/workspaces/${workspaceId}`);

  const arvore = await getArvoreProjetos(workspaceId, session.user.id);
  const obraOpcoes = flattenArvoreParaOpcoes(arvore);

  const [disciplinasPorObraEntries, fases] = await Promise.all([
    Promise.all(obraOpcoes.map(async (o) => [o.id, await listDisciplinasComSecoesPorObra(o.id)] as const)),
    listFases(workspaceId),
  ]);
  const disciplinasPorObra = Object.fromEntries(disciplinasPorObraEntries);

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-1 text-2xl font-semibold">Sincronizar com GED</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Sobe uma planilha no formato &quot;Código / Descrição / Status / Revisão / Data de alteração do status / GED de
        origem&quot; e atualiza os documentos que já existem na obra — os que ainda não existem ficam pendentes de
        confirmação antes de criar.
      </p>
      <SincronizarGedWizard
        workspaceId={workspaceId}
        obraOpcoes={obraOpcoes}
        disciplinasPorObra={disciplinasPorObra}
        fases={fases.map((f) => ({ id: f.id, name: f.name, code: f.code }))}
        obraIdInicial={obraOpcoes.some((o) => o.id === sp.obraId) ? sp.obraId : undefined}
      />
    </div>
  );
}
