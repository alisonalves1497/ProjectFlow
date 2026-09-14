import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getWorkspaceRole } from "@/services/permissions";
import { getMeusDocumentos } from "@/services/painelService";
import { MeusDocumentosTabela } from "./meus-documentos-tabela";

type Params = { params: Promise<{ workspaceId: string }> };

export default async function MeusDocumentosPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId } = await params;
  const [role, documentos] = await Promise.all([
    getWorkspaceRole(session.user.id, workspaceId),
    getMeusDocumentos(workspaceId, session.user.id),
  ]);
  // Mesmo nível de permissão das células inline na Lista de Documentos de uma Obra: só
  // administrador/coordenador edita Prazo, Revisão, GED e Status direto na tabela.
  const podeGerenciar = role === "administrador" || role === "coordenador";

  return (
    <div className="p-8">
      <h1 className="mb-1 text-2xl font-semibold">Meus documentos</h1>
      <p className="mb-6 text-sm text-muted-foreground">Todos os documentos atribuídos a você, agrupados por obra.</p>

      <MeusDocumentosTabela workspaceId={workspaceId} documentos={documentos} podeGerenciar={podeGerenciar} />
    </div>
  );
}
