import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPainelData } from "@/services/painelService";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";

type Params = { params: Promise<{ workspaceId: string }> };

export default async function PendenciasPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId } = await params;
  const painel = await getPainelData(workspaceId, session.user.id);
  const { documentos, copiasControladas } = painel.minhasPendencias;
  const total = documentos.length + copiasControladas.length;

  return (
    <div className="p-8">
      <Link href={`/workspaces/${workspaceId}`} className="text-sm text-muted-foreground hover:underline">
        ← Painel
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold">Minhas pendências</h1>

      {total === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma pendência sua no momento.</p>
      ) : (
        <ul className="max-w-2xl space-y-2">
          {/* Documentos já vêm ordenados por status mais adiantado primeiro (ver painelService). */}
          {documentos.map((d) => (
            <li key={d.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <Link href={`/workspaces/${workspaceId}/documentos/${d.id}`} className="hover:underline">
                <span className="font-mono text-xs">{d.codigoCompleto}</span>{" "}
                <span className="text-muted-foreground">{d.descricao}</span>
              </Link>
              <StatusBadge status={d.status} />
            </li>
          ))}
          {copiasControladas.map((c) => (
            <li key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>
                <span className="font-mono text-xs">{c.documentoCodigo}</span>{" "}
                <span className="text-muted-foreground">cópia em {c.revisaoLabel}</span>
              </span>
              <Badge variant="warning">A substituir</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
