import Link from "next/link";
import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { auth } from "@/auth";
import { getWorkspaceRole, listAccessibleObraIdsInWorkspace } from "@/services/permissions";
import { buscarDocumentosNoWorkspace } from "@/services/documentoService";
import { StatusBadge } from "@/components/status-badge";
import type { StatusDocumento } from "@/lib/statusGraph";

type Params = {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ q?: string }>;
};

export default async function BuscaPage({ params, searchParams }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId } = await params;
  const { q } = await searchParams;
  const role = await getWorkspaceRole(session.user.id, workspaceId);
  if (!role) redirect("/workspaces");

  const termo = (q ?? "").trim();
  const resultados = termo
    ? await buscarDocumentosNoWorkspace(
        workspaceId,
        await listAccessibleObraIdsInWorkspace(session.user.id, workspaceId),
        termo
      )
    : [];

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-4 text-2xl font-semibold">Buscar documentos</h1>

      <form className="mb-6">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            name="q"
            defaultValue={termo}
            placeholder="Código ou descrição do documento..."
            autoFocus
            className="h-10 w-full rounded-md border bg-transparent pr-3 pl-9 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </form>

      {!termo ? (
        <p className="text-sm text-muted-foreground">Digite pra buscar em todas as obras que você acessa.</p>
      ) : resultados.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum documento encontrado pra &quot;{termo}&quot;.</p>
      ) : (
        <ul className="space-y-1">
          {resultados.map((d) => (
            <li key={d.id}>
              <Link
                href={`/workspaces/${workspaceId}/documentos/${d.id}`}
                className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm hover:bg-accent"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-muted-foreground">{d.codigoCompleto}</p>
                  <p className="truncate">{d.descricao}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {d.projetoNome} — {d.obraNome}
                  </p>
                </div>
                <StatusBadge status={d.status as StatusDocumento} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
