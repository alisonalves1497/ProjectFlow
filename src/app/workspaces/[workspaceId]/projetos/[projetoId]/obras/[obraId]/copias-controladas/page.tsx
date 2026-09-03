import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getObraOrThrow, listObraAccessUsers } from "@/services/obraService";
import { requireObraAccess } from "@/services/permissions";
import { listDocumentos } from "@/services/documentoService";
import { listCopiasControladas, getCopiasControladasDashboard } from "@/services/copiaControladaService";
import { ApiError } from "@/lib/errors";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CopiaControladaStatusBadge } from "@/components/copia-controlada-status-badge";
import { CreateCopiaDialog } from "./create-copia-dialog";
import { TrocarCopiaButton, CancelarCopiaButton } from "./copia-actions";

type Params = { params: Promise<{ workspaceId: string; projetoId: string; obraId: string }> };

export default async function CopiasControladasPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId, projetoId, obraId } = await params;

  try {
    await requireObraAccess(session.user.id, workspaceId, obraId);
  } catch (err) {
    if (err instanceof ApiError) redirect(`/workspaces/${workspaceId}/projetos/${projetoId}`);
    throw err;
  }

  const obra = await getObraOrThrow(workspaceId, obraId);

  const [documentos, usuarios, copias, dashboard] = await Promise.all([
    listDocumentos(workspaceId, { obraId }),
    listObraAccessUsers(workspaceId, obraId),
    listCopiasControladas(workspaceId, { obraId }),
    getCopiasControladasDashboard(workspaceId, obraId),
  ]);

  const documentosParaCopia = documentos.map((d) => ({
    id: d.id,
    codigoCompleto: d.codigoCompleto,
    descricao: d.descricao,
    temRevisao: d.currentRevisionId !== null,
  }));

  return (
    <div className="p-8">
      <p className="text-sm text-muted-foreground">
        {obra.name} · {obra.code}
      </p>
      <div className="mt-1 mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Cópias Controladas</h1>
        <CreateCopiaDialog workspaceId={workspaceId} projetoId={projetoId} obraId={obraId} documentos={documentosParaCopia} usuarios={usuarios} />
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ativas</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{dashboard.copiasAtivas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>A substituir</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{dashboard.copiasASubstituir}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>% desatualizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{dashboard.percentualDesatualizadas.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tempo médio de troca</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">
              {dashboard.tempoMedioTrocaDias !== null ? `${dashboard.tempoMedioTrocaDias.toFixed(1)} dias` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Detentores distintos</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{dashboard.detentoresDistintos}</p>
          </CardContent>
        </Card>
      </div>

      {copias.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma cópia controlada ainda.</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Revisão</TableHead>
                <TableHead>Detentor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {copias.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.documentoCodigo}</TableCell>
                  <TableCell>{c.revisaoLabel}</TableCell>
                  <TableCell>
                    {c.detentorNome} <span className="text-muted-foreground">({c.detentorEmail})</span>
                  </TableCell>
                  <TableCell>
                    <CopiaControladaStatusBadge status={c.statusEfetivo} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {c.statusEfetivo === "a_substituir" && (
                        <TrocarCopiaButton workspaceId={workspaceId} projetoId={projetoId} obraId={obraId} copiaId={c.id} />
                      )}
                      {(c.statusEfetivo === "ativa" || c.statusEfetivo === "a_substituir") && (
                        <CancelarCopiaButton workspaceId={workspaceId} projetoId={projetoId} obraId={obraId} copiaId={c.id} />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
