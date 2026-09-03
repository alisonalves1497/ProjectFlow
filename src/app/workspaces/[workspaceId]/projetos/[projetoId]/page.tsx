import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getProjetoOrThrow } from "@/services/projetoService";
import { listAccessibleObraIds, listObras } from "@/services/obraService";
import { getWorkspaceRole } from "@/services/permissions";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { CreateObraDialog } from "./obras/create-obra-dialog";
import { deleteObraAction } from "./obras/actions";

type Params = { params: Promise<{ workspaceId: string; projetoId: string }> };

export default async function ProjetoDetailPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId, projetoId } = await params;
  const role = await getWorkspaceRole(session.user.id, workspaceId);
  if (!role) redirect("/workspaces");

  const projeto = await getProjetoOrThrow(workspaceId, projetoId);
  const canManage = role === "administrador" || role === "coordenador";

  let obras = await listObras(workspaceId, projetoId);
  if (role !== "administrador") {
    const accessibleIds = new Set(await listAccessibleObraIds(session.user.id));
    obras = obras.filter((o) => accessibleIds.has(o.id));
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{projeto.name}</h1>
          <p className="text-sm text-muted-foreground">{projeto.code}</p>
        </div>
        {canManage && <CreateObraDialog workspaceId={workspaceId} projetoId={projetoId} />}
      </div>

      <h2 className="mb-3 text-sm font-medium text-muted-foreground">Obras</h2>
      {obras.length === 0 ? (
        <p className="text-muted-foreground">
          {canManage ? "Nenhuma obra ainda." : "Você não tem acesso a nenhuma obra deste projeto."}
        </p>
      ) : (
        <div className="grid gap-3">
          {obras.map((o) => (
            <Card key={o.id} className="relative transition hover:border-foreground/40">
              <Link
                href={`/workspaces/${workspaceId}/projetos/${projetoId}/obras/${o.id}`}
                className="absolute inset-0"
                aria-label={o.name}
              />
              <CardHeader className="flex-row items-center justify-between">
                <div className="pointer-events-none">
                  <CardTitle>{o.name}</CardTitle>
                  <CardDescription>{o.code}</CardDescription>
                </div>
                <div className="relative z-10 flex items-center gap-2">
                  <Badge variant="outline">{o.code}</Badge>
                  {canManage && (
                    <ConfirmDeleteDialog
                      titulo="Obra"
                      itemNome={o.name}
                      explicacao={`Isso oculta a Obra "${o.name}" e todos os seus documentos. Nada é apagado de verdade — fica guardado por 30 dias na Lixeira, de onde dá pra restaurar.`}
                      action={deleteObraAction}
                      hiddenFields={{ workspaceId, projetoId, obraId: o.id }}
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
