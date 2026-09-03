import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listAtividadeRecente } from "@/services/painelService";
import { EVENTO_LABELS } from "@/lib/timelineLabels";

const LIMITE_ATIVIDADE = 100;

type Params = { params: Promise<{ workspaceId: string }> };

export default async function AtividadePage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId } = await params;
  const eventos = await listAtividadeRecente(workspaceId, session.user.id, LIMITE_ATIVIDADE);

  return (
    <div className="p-8">
      <Link href={`/workspaces/${workspaceId}`} className="text-sm text-muted-foreground hover:underline">
        ← Painel
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold">Atividade recente</h1>

      {eventos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma atividade ainda.</p>
      ) : (
        <ul className="max-w-2xl space-y-2">
          {eventos.map((e) => (
            <li key={e.id} className="rounded-md border px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span>{EVENTO_LABELS[e.evento] ?? e.evento}</span>
                <span className="text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString("pt-BR")}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                <Link href={`/workspaces/${workspaceId}/documentos/${e.documentoId}`} className="font-mono hover:underline">
                  {e.documentoCodigo}
                </Link>{" "}
                {e.autorNome ? `· ${e.autorNome}` : ""}
              </p>
            </li>
          ))}
          {eventos.length === LIMITE_ATIVIDADE && (
            <li className="pt-2 text-center text-xs text-muted-foreground">Mostrando os {LIMITE_ATIVIDADE} eventos mais recentes.</li>
          )}
        </ul>
      )}
    </div>
  );
}
