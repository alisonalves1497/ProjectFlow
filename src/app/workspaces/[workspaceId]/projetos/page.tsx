import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getWorkspaceOrThrow } from "@/services/workspaceService";
import { listProjetos } from "@/services/projetoService";
import { getWorkspaceRole } from "@/services/permissions";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { CreateProjetoDialog } from "./create-projeto-dialog";
import { deleteProjetoAction } from "./actions";

type Params = { params: Promise<{ workspaceId: string }> };

export default async function ProjetosPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId } = await params;
  const role = await getWorkspaceRole(session.user.id, workspaceId);
  if (!role) redirect("/workspaces");

  const workspace = await getWorkspaceOrThrow(workspaceId);
  const projetos = await listProjetos(workspaceId);
  const canManage = role === "administrador" || role === "coordenador";

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{workspace.name}</h1>
          <p className="text-sm text-muted-foreground">/{workspace.slug}</p>
        </div>
        {canManage && <CreateProjetoDialog workspaceId={workspaceId} />}
      </div>

      <h2 className="mb-3 text-sm font-medium text-muted-foreground">Projetos</h2>
      {projetos.length === 0 ? (
        <p className="text-muted-foreground">Nenhum projeto ainda.</p>
      ) : (
        <div className="grid gap-3">
          {projetos.map((p) => (
            <Card key={p.id} className="relative transition hover:border-foreground/40">
              <Link href={`/workspaces/${workspaceId}/projetos/${p.id}`} className="absolute inset-0" aria-label={p.name} />
              <CardHeader className="flex-row items-center justify-between">
                <div className="pointer-events-none">
                  <CardTitle>{p.name}</CardTitle>
                  <CardDescription>{p.code}</CardDescription>
                </div>
                <div className="relative z-10 flex items-center gap-2">
                  <Badge variant="outline">{p.code}</Badge>
                  {canManage && (
                    <ConfirmDeleteDialog
                      titulo="Projeto"
                      itemNome={p.name}
                      explicacao={`Isso oculta o Projeto "${p.name}", TODAS as suas Obras e os documentos dessas Obras. Nada é apagado de verdade — fica guardado por 30 dias na Lixeira, de onde dá pra restaurar tudo junto.`}
                      action={deleteProjetoAction}
                      hiddenFields={{ workspaceId, projetoId: p.id }}
                    />
                  )}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
