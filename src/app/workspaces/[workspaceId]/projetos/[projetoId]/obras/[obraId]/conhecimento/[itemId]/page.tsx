import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getObraOrThrow } from "@/services/obraService";
import { requireObraAccess } from "@/services/permissions";
import { getItemConhecimentoOrThrow, listDocumentosVinculados } from "@/services/conhecimentoService";
import { listFotosPorItemConhecimento } from "@/services/fotoService";
import { ApiError } from "@/lib/errors";
import { validNextStatuses, TIPO_LABELS, type StatusItemConhecimento, type TipoItemConhecimento } from "@/lib/conhecimentoStatusGraph";
import { ConhecimentoStatusBadge } from "@/components/conhecimento-status-badge";
import { AvancarForm } from "./avancar-form";

type Params = { params: Promise<{ workspaceId: string; projetoId: string; obraId: string; itemId: string }> };

export default async function ItemConhecimentoDetailPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId, projetoId, obraId, itemId } = await params;
  const item = await getItemConhecimentoOrThrow(workspaceId, itemId);

  try {
    await requireObraAccess(session.user.id, workspaceId, item.obraId);
  } catch (err) {
    if (err instanceof ApiError) redirect(`/workspaces/${workspaceId}/projetos/${projetoId}`);
    throw err;
  }

  const obra = await getObraOrThrow(workspaceId, obraId);
  const base = `/workspaces/${workspaceId}/projetos/${projetoId}/obras/${obraId}/conhecimento`;

  const [documentos, fotos] = await Promise.all([listDocumentosVinculados(itemId), listFotosPorItemConhecimento(workspaceId, itemId)]);

  const proximos = validNextStatuses(item.tipo as TipoItemConhecimento, item.status as StatusItemConhecimento);
  const proximoStatus = proximos[0] ?? null;

  return (
    <div className="mx-auto max-w-2xl p-8">
      <Link href={base} className="text-sm text-muted-foreground hover:underline">
        ← Base de Conhecimento
      </Link>

      <div className="mt-2 mb-2 flex items-center gap-3">
        <h1 className="font-mono text-xl font-semibold">{item.codigoCompleto}</h1>
        <ConhecimentoStatusBadge status={item.status as StatusItemConhecimento} />
        <span className="text-xs text-muted-foreground">{TIPO_LABELS[item.tipo as TipoItemConhecimento]}</span>
      </div>
      <p className="mb-1 font-medium">{item.titulo}</p>
      <p className="mb-6 text-sm text-muted-foreground">
        {obra.name} · {obra.code}
      </p>

      <section className="mb-8 rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Descrição</h2>
        <p className="text-sm whitespace-pre-wrap">{item.descricao}</p>
      </section>

      {item.resposta && (
        <section className="mb-8 rounded-lg border p-4">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Resposta</h2>
          <p className="text-sm whitespace-pre-wrap">{item.resposta}</p>
          {item.respondidoEm && <p className="mt-2 text-xs text-muted-foreground">Respondida em {new Date(item.respondidoEm).toLocaleString("pt-BR")}</p>}
        </section>
      )}

      {item.acaoCorretiva && (
        <section className="mb-8 rounded-lg border p-4">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Ação corretiva</h2>
          <p className="text-sm whitespace-pre-wrap">{item.acaoCorretiva}</p>
          {item.corrigidoEm && <p className="mt-2 text-xs text-muted-foreground">Corrigida em {new Date(item.corrigidoEm).toLocaleString("pt-BR")}</p>}
          {item.verificadoEm && <p className="text-xs text-muted-foreground">Verificada em {new Date(item.verificadoEm).toLocaleString("pt-BR")}</p>}
        </section>
      )}

      <section className="mb-8 rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Avançar status</h2>
        <AvancarForm workspaceId={workspaceId} projetoId={projetoId} obraId={obraId} itemId={itemId} proximoStatus={proximoStatus} />
      </section>

      {documentos.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Documentos vinculados</h2>
          <ul className="space-y-1">
            {documentos.map((d) => (
              <li key={d.id} className="text-sm">
                <Link href={`/workspaces/${workspaceId}/documentos/${d.id}`} className="hover:underline">
                  <span className="font-mono text-xs">{d.codigoCompleto}</span> <span className="text-muted-foreground">{d.descricao}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {fotos.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Fotos / evidências</h2>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {fotos.map((f) => (
              <div key={f.id} className="overflow-hidden rounded-md border">
                {/* eslint-disable-next-line @next/next/no-img-element -- imagem vem de uma rota de streaming autenticada */}
                <img src={`/api/workspaces/${workspaceId}/fotos/${f.id}/arquivo`} alt={f.legenda ?? f.arquivoNome} className="aspect-square w-full object-cover" />
                {f.legenda && <p className="truncate p-1 text-xs text-muted-foreground">{f.legenda}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
