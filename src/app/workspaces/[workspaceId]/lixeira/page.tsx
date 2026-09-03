import { redirect } from "next/navigation";
import { Trash2 } from "lucide-react";
import { auth } from "@/auth";
import { getWorkspaceRole } from "@/services/permissions";
import { listProjetosExcluidos } from "@/services/projetoService";
import { listObrasExcluidas } from "@/services/obraService";
import { Badge } from "@/components/ui/badge";
import { RestoreButton } from "./restore-button";

type Params = { params: Promise<{ workspaceId: string }> };

function diasRestantes(deletedAt: Date): number {
  const decorridos = Date.now() - deletedAt.getTime();
  return Math.max(0, 30 - Math.floor(decorridos / (24 * 60 * 60 * 1000)));
}

export default async function LixeiraPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId } = await params;
  const role = await getWorkspaceRole(session.user.id, workspaceId);
  if (!role) redirect("/workspaces");
  if (role !== "administrador" && role !== "coordenador") redirect(`/workspaces/${workspaceId}`);

  const [projetos, obras] = await Promise.all([listProjetosExcluidos(workspaceId), listObrasExcluidas(workspaceId)]);

  const vazio = projetos.length === 0 && obras.length === 0;

  return (
    <div className="max-w-2xl p-8">
      <div className="mb-2 flex items-center gap-2">
        <Trash2 className="size-5 shrink-0 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Lixeira</h1>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Projetos e Obras excluídos ficam guardados aqui por 30 dias, com tudo que continham, antes de sumir de vez.
      </p>

      {vazio ? (
        <p className="text-sm text-muted-foreground">Nada na lixeira no momento.</p>
      ) : (
        <div className="space-y-6">
          {projetos.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">Projetos excluídos ({projetos.length})</h2>
              <ul className="space-y-2">
                {projetos.map((p) => (
                  <li key={p.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">
                        {p.name} <span className="font-normal text-muted-foreground">({p.code})</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Excluído em {p.deletedAt!.toLocaleDateString("pt-BR")} · restaurável por mais {diasRestantes(p.deletedAt!)}{" "}
                        dias
                      </p>
                    </div>
                    <RestoreButton kind="projeto" workspaceId={workspaceId} projetoId={p.id} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {obras.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">Obras excluídas ({obras.length})</h2>
              <ul className="space-y-2">
                {obras.map((o) => (
                  <li key={o.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">
                        {o.name} <span className="font-normal text-muted-foreground">({o.code})</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <Badge variant="outline" className="mr-1">
                          {o.projetoNome}
                        </Badge>
                        Excluída em {o.deletedAt!.toLocaleDateString("pt-BR")} · restaurável por mais {diasRestantes(o.deletedAt!)}{" "}
                        dias
                      </p>
                    </div>
                    <RestoreButton kind="obra" workspaceId={workspaceId} projetoId={o.projetoId} obraId={o.id} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

