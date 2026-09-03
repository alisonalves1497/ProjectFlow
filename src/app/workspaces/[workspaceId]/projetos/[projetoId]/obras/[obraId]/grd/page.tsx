import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getObraOrThrow } from "@/services/obraService";
import { requireObraAccess } from "@/services/permissions";
import { listDocumentos } from "@/services/documentoService";
import { listGrds } from "@/services/grdService";
import { listContatosExternos } from "@/services/contatoExternoService";
import { ApiError } from "@/lib/errors";
import { GrdStatusBadge } from "@/components/grd-status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateGrdDialog } from "../../../../../grds/create-grd-dialog";

type Params = { params: Promise<{ workspaceId: string; projetoId: string; obraId: string }> };

export default async function ObraGrdPage({ params }: Params) {
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

  const [documentos, grds, contatos] = await Promise.all([
    listDocumentos(workspaceId, { obraId }),
    listGrds(workspaceId, { obraId }),
    listContatosExternos(workspaceId),
  ]);

  const documentosParaGrd = documentos.map((d) => ({
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
        <h1 className="text-2xl font-semibold">Guias de Remessa (GRD)</h1>
        <CreateGrdDialog workspaceId={workspaceId} projetoId={projetoId} obraId={obraId} documentos={documentosParaGrd} contatos={contatos} />
      </div>

      {grds.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum GRD ainda.{" "}
          {contatos.length === 0 && (
            <>
              Cadastre um{" "}
              <Link href={`/workspaces/${workspaceId}/contatos`} className="underline">
                contato externo
              </Link>{" "}
              antes de criar o primeiro.
            </>
          )}
        </p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Emissão</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grds.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-mono text-xs">
                    <Link href={`/workspaces/${workspaceId}/grds/${g.id}`} className="hover:underline">
                      {g.codigoCompleto}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{new Date(g.dataEmissao).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>
                    <GrdStatusBadge status={g.status} />
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
