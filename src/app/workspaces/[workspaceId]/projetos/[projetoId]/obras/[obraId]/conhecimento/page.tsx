import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getObraOrThrow } from "@/services/obraService";
import { requireObraAccess } from "@/services/permissions";
import { listItensConhecimento } from "@/services/conhecimentoService";
import { listDocumentos } from "@/services/documentoService";
import { listCategoriasConhecimento } from "@/services/catalogoService";
import { ApiError } from "@/lib/errors";
import { STATUS_LABELS, TIPO_LABELS, type StatusItemConhecimento, type TipoItemConhecimento } from "@/lib/conhecimentoStatusGraph";
import { ConhecimentoStatusBadge } from "@/components/conhecimento-status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConhecimentoTabs } from "./conhecimento-tabs";
import { CreateItemDialog } from "./create-item-dialog";

type Params = {
  params: Promise<{ workspaceId: string; projetoId: string; obraId: string }>;
  searchParams: Promise<{ tipo?: string; status?: string; busca?: string }>;
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS) as [StatusItemConhecimento, string][];

export default async function ConhecimentoPage({ params, searchParams }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId, projetoId, obraId } = await params;
  const sp = await searchParams;

  try {
    await requireObraAccess(session.user.id, workspaceId, obraId);
  } catch (err) {
    if (err instanceof ApiError) redirect(`/workspaces/${workspaceId}/projetos/${projetoId}`);
    throw err;
  }

  const obra = await getObraOrThrow(workspaceId, obraId);
  const base = `/workspaces/${workspaceId}/projetos/${projetoId}/obras/${obraId}/conhecimento`;

  const [itens, documentos, categorias] = await Promise.all([
    listItensConhecimento(workspaceId, {
      obraId,
      tipo: sp.tipo as TipoItemConhecimento | undefined,
      status: sp.status as StatusItemConhecimento | undefined,
      busca: sp.busca || undefined,
    }),
    listDocumentos(workspaceId, { obraId }),
    listCategoriasConhecimento(workspaceId),
  ]);

  return (
    <div className="p-8">
      <p className="text-sm text-muted-foreground">
        {obra.name} · {obra.code}
      </p>
      <h1 className="mt-1 mb-4 text-2xl font-semibold">Base de Conhecimento</h1>

      <ConhecimentoTabs base={base} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <form method="get" className="flex flex-wrap items-center gap-2">
          <select name="tipo" defaultValue={sp.tipo ?? ""} className="h-9 rounded-md border bg-transparent px-3 text-sm">
            <option value="">Todas</option>
            <option value="rfi">RFI</option>
            <option value="rnc">RNC</option>
          </select>
          <select name="status" defaultValue={sp.status ?? ""} className="h-9 rounded-md border bg-transparent px-3 text-sm">
            <option value="">Todos os status</option>
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            type="text"
            name="busca"
            defaultValue={sp.busca ?? ""}
            placeholder="Buscar por título/descrição"
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
          />
          <button type="submit" className="h-9 rounded-md border px-3 text-sm hover:bg-accent">
            Filtrar
          </button>
        </form>

        <CreateItemDialog
          workspaceId={workspaceId}
          projetoId={projetoId}
          obraId={obraId}
          documentos={documentos.map((d) => ({ id: d.id, codigoCompleto: d.codigoCompleto, descricao: d.descricao }))}
          categorias={categorias}
          revalidatePathTarget={base}
        />
      </div>

      {itens.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma RFI/RNC ainda.</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criada em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-mono text-xs">
                    <Link href={`${base}/${i.id}`} className="hover:underline">
                      {i.codigoCompleto}
                    </Link>
                    <span className="ml-2 text-muted-foreground">{TIPO_LABELS[i.tipo as TipoItemConhecimento]}</span>
                  </TableCell>
                  <TableCell>{i.titulo}</TableCell>
                  <TableCell>
                    <ConhecimentoStatusBadge status={i.status as StatusItemConhecimento} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{new Date(i.createdAt).toLocaleDateString("pt-BR")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
