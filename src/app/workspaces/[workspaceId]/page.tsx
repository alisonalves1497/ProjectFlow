import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPainelData } from "@/services/painelService";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { FileText, AlertTriangle, Clock, Lightbulb, CalendarDays, ListTodo, Activity } from "lucide-react";
import { EVENTO_LABELS } from "@/lib/timelineLabels";

type Params = { params: Promise<{ workspaceId: string }> };

const LIMITE_PENDENCIAS_PAINEL = 8;

// Gira uma por dia (mesma pra todo mundo, mesma o dia inteiro) — não é aleatório a cada
// carregamento, senão "frase do dia" vira "frase a cada F5".
const FRASES_DO_DIA = [
  "Documentação em dia é obra sem retrabalho.",
  "Revisão bem feita hoje é problema que não aparece na obra amanhã.",
  "Documento sem dono é documento que não anda.",
  "Prazo cumprido começa com status atualizado.",
  "Um RFI respondido rápido custa menos que um retrabalho.",
  "Padronizar a nomenclatura hoje poupa uma busca amanhã.",
  "Registro fotográfico é memória que não falha.",
  "Cópia controlada desatualizada é risco, não detalhe.",
  "Comentário claro na revisão poupa reunião depois.",
  "Cada seção organizada é tempo a menos procurando arquivo.",
];

function fraseDoDia(): string {
  const diaDoAno = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000);
  return FRASES_DO_DIA[diaDoAno % FRASES_DO_DIA.length];
}

function saudacao(): string {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function PainelPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId } = await params;
  const painel = await getPainelData(workspaceId, session.user.id);
  const primeiroNome = (session.user.name ?? session.user.email ?? "").split(" ")[0];
  const totalPendencias = painel.minhasPendencias.documentos.length + painel.minhasPendencias.copiasControladas.length;

  return (
    <div className="p-8">
      <div className="mb-1">
        <h1 className="text-2xl font-semibold">
          {saudacao()}, {primeiroNome}!
        </h1>
      </div>

      <div className="mb-6 flex items-start gap-2 rounded-lg border border-primary/10 bg-primary/5 p-3">
        <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" />
        <div>
          <p className="text-xs font-medium tracking-wide text-primary uppercase">Frase do dia</p>
          <p className="text-sm text-muted-foreground">{fraseDoDia()}</p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card size="sm">
          <CardHeader className="pb-1">
            <CardDescription>Documentos ativos</CardDescription>
            <CardAction>
              <FileText className="size-4 text-primary/50" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{painel.documentosAtivos}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader className="pb-1">
            <CardDescription>Em atraso</CardDescription>
            <CardAction>
              <AlertTriangle className="size-4 text-primary/50" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{painel.documentosEmAtraso}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader className="pb-1">
            <CardDescription>Minhas pendências</CardDescription>
            <CardAction>
              <Clock className="size-4 text-primary/50" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{totalPendencias}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ListTodo className="size-4 text-primary" />
                <CardTitle>Minhas pendências</CardTitle>
              </div>
              {totalPendencias > LIMITE_PENDENCIAS_PAINEL && (
                <CardAction>
                  <Link href={`/workspaces/${workspaceId}/pendencias`} className="text-xs text-primary hover:underline">
                    Ver tudo ({totalPendencias}) →
                  </Link>
                </CardAction>
              )}
            </CardHeader>
            <CardContent>
              {totalPendencias === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma pendência sua no momento.</p>
              ) : (
                <ul className="space-y-2">
                  {/* Documentos já vêm ordenados por status mais adiantado primeiro (ver
                      painelService); cópias controladas completam a lista até o limite. */}
                  {painel.minhasPendencias.documentos.slice(0, LIMITE_PENDENCIAS_PAINEL).map((d) => (
                    <li key={d.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <Link href={`/workspaces/${workspaceId}/documentos/${d.id}`} className="hover:underline">
                        <span className="font-mono text-xs">{d.codigoCompleto}</span>{" "}
                        <span className="text-muted-foreground">{d.descricao}</span>
                      </Link>
                      <StatusBadge status={d.status} />
                    </li>
                  ))}
                  {painel.minhasPendencias.copiasControladas
                    .slice(0, Math.max(0, LIMITE_PENDENCIAS_PAINEL - painel.minhasPendencias.documentos.length))
                    .map((c) => (
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-primary" />
                <CardTitle>Programação da semana</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {painel.programacaoSemana.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma entrega prevista nos próximos 7 dias.</p>
              ) : (
                <ul className="space-y-2">
                  {painel.programacaoSemana.map((d) => (
                    <li key={d.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <Link href={`/workspaces/${workspaceId}/documentos/${d.id}`} className="hover:underline">
                        <span className="font-mono text-xs">{d.codigoCompleto}</span>{" "}
                        <span className="text-muted-foreground">{d.descricao}</span>
                      </Link>
                      <span className="text-muted-foreground">
                        {new Date(d.dataPrevista).toLocaleDateString("pt-BR")}
                        {d.reprogramado && <span className="ml-1 text-xs">(reprogramado)</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* self-start: sem isso o grid estica o card pra altura da coluna da esquerda
            (Minhas pendências + Programação da semana somadas), deixando um vazio enorme
            embaixo da lista curta de atividade — assim ele só ocupa o que o conteúdo pede. */}
        <Card className="self-start">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-primary" />
              <CardTitle>Atividade recente</CardTitle>
            </div>
            <CardAction>
              <Link href={`/workspaces/${workspaceId}/atividade`} className="text-xs text-primary hover:underline">
                Ver tudo →
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent>
            {painel.atividadeRecente.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma atividade ainda.</p>
            ) : (
              <ul className="space-y-2">
                {painel.atividadeRecente.map((e) => (
                  <li key={e.id} className="rounded-md border px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>{EVENTO_LABELS[e.evento] ?? e.evento}</span>
                      <span className="text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString("pt-BR")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-mono">{e.documentoCodigo}</span> {e.autorNome ? `· ${e.autorNome}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
