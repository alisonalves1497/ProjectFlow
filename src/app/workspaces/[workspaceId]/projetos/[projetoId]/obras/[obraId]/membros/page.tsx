import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getObraOrThrow, listObraMembers } from "@/services/obraService";
import { requireObraAccess, getWorkspaceRole } from "@/services/permissions";
import { ApiError } from "@/lib/errors";
import { AddObraMemberForm } from "../add-obra-member-form";
import { RemoveObraMemberButton } from "../remove-obra-member-button";

type Params = { params: Promise<{ workspaceId: string; projetoId: string; obraId: string }> };

export default async function ObraMembrosPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId, projetoId, obraId } = await params;

  try {
    await requireObraAccess(session.user.id, workspaceId, obraId);
  } catch (err) {
    if (err instanceof ApiError) redirect(`/workspaces/${workspaceId}/projetos/${projetoId}`);
    throw err;
  }

  const role = await getWorkspaceRole(session.user.id, workspaceId);
  const canManage = role === "administrador" || role === "coordenador";
  const obra = await getObraOrThrow(workspaceId, obraId);
  const membros = await listObraMembers(obraId);

  return (
    <div className="max-w-2xl p-8">
      <p className="text-sm text-muted-foreground">
        {obra.name} · {obra.code}
      </p>
      <h1 className="mt-1 mb-6 text-2xl font-semibold">Membros da Obra</h1>

      {membros.length === 0 ? (
        <p className="mb-4 text-sm text-muted-foreground">
          Nenhum membro específico. {canManage ? "Adicione abaixo — sem isso, só o administrador do workspace vê esta obra." : ""}
        </p>
      ) : (
        <ul className="mb-4 space-y-2">
          {membros.map((m) => (
            <li key={m.userId} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>
                {m.name} <span className="text-muted-foreground">({m.email})</span>
              </span>
              {canManage && <RemoveObraMemberButton workspaceId={workspaceId} projetoId={projetoId} obraId={obraId} userId={m.userId} />}
            </li>
          ))}
        </ul>
      )}

      {canManage && <AddObraMemberForm workspaceId={workspaceId} projetoId={projetoId} obraId={obraId} />}
    </div>
  );
}
