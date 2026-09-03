import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getGrdOrThrow, listGrdDestinatarios, listGrdDocumentos } from "@/services/grdService";
import { requireObraAccess } from "@/services/permissions";
import { GrdStatusBadge } from "@/components/grd-status-badge";
import { ResponderGrdForm } from "./responder-grd-form";
import { CancelarGrdButton } from "./cancelar-grd-button";

type Params = { params: Promise<{ workspaceId: string; grdId: string }> };

export default async function GrdDetailPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId, grdId } = await params;
  const grd = await getGrdOrThrow(workspaceId, grdId);
  await requireObraAccess(session.user.id, workspaceId, grd.obraId);

  const [documentos, destinatarios] = await Promise.all([listGrdDocumentos(grdId), listGrdDestinatarios(grdId)]);

  return (
    <div className="mx-auto max-w-2xl p-8">
      <Link href={`/workspaces/${workspaceId}`} className="text-sm text-muted-foreground hover:underline">
        ← Workspace
      </Link>

      <div className="mt-2 mb-2 flex items-center gap-3">
        <h1 className="font-mono text-xl font-semibold">{grd.codigoCompleto}</h1>
        <GrdStatusBadge status={grd.status} />
      </div>
      <p className="mb-6 text-sm text-muted-foreground">Emitido em {new Date(grd.dataEmissao).toLocaleDateString("pt-BR")}</p>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Documentos ({documentos.length})</h2>
        <ul className="space-y-1">
          {documentos.map((d) => (
            <li key={d.id} className="flex items-center gap-2 text-sm">
              <span className="font-mono text-xs">{d.codigoCompleto}</span>
              <span className="text-muted-foreground">{d.descricao}</span>
              <span className="rounded border px-1.5 py-0.5 font-mono text-xs">{d.revisaoLabel}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Destinatários</h2>
        <ul className="space-y-1 text-sm">
          {destinatarios.map((d) => (
            <li key={d.id}>
              {d.nome} <span className="text-muted-foreground">({d.email}{d.empresa ? ` · ${d.empresa}` : ""})</span>
            </li>
          ))}
        </ul>
      </section>

      {grd.status === "pendente" && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Ações</h2>
          <ResponderGrdForm workspaceId={workspaceId} grdId={grdId} />
          <CancelarGrdButton workspaceId={workspaceId} grdId={grdId} />
        </section>
      )}

      {grd.status === "respondido" && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Resposta</h2>
          <p className="text-sm">
            Respondido em {grd.respondidoEm ? new Date(grd.respondidoEm).toLocaleString("pt-BR") : ""}
            {grd.arquivoRespostaUrl && (
              <>
                {" — "}
                <a href={grd.arquivoRespostaUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                  {grd.arquivoRespostaNome ?? "ver arquivo"}
                </a>
              </>
            )}
          </p>
        </section>
      )}
    </div>
  );
}
