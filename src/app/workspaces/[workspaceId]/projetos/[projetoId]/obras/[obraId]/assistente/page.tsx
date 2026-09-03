import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getObraOrThrow } from "@/services/obraService";
import { requireObraAccess } from "@/services/permissions";
import { ApiError } from "@/lib/errors";
import { isAssistenteIaAtivo } from "@/lib/anthropic";
import { AssistenteChat } from "./assistente-chat";

type Params = { params: Promise<{ workspaceId: string; projetoId: string; obraId: string }> };

export default async function AssistentePage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId, projetoId, obraId } = await params;

  if (!isAssistenteIaAtivo()) redirect(`/workspaces/${workspaceId}/projetos/${projetoId}/obras/${obraId}`);

  try {
    await requireObraAccess(session.user.id, workspaceId, obraId);
  } catch (err) {
    if (err instanceof ApiError) redirect(`/workspaces/${workspaceId}/projetos/${projetoId}`);
    throw err;
  }

  const obra = await getObraOrThrow(workspaceId, obraId);

  return (
    <div className="max-w-3xl p-8">
      <p className="text-sm text-muted-foreground">
        {obra.name} · {obra.code}
      </p>
      <h1 className="mt-1 mb-4 text-2xl font-semibold">Assistente IA</h1>
      <AssistenteChat workspaceId={workspaceId} obraId={obraId} />
    </div>
  );
}
