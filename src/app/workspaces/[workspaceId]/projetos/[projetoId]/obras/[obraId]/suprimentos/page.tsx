import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getObraOrThrow } from "@/services/obraService";
import { requireObraAccess } from "@/services/permissions";
import { getSuprimentosDashboard } from "@/services/suprimentosDashboardService";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SuprimentosTabs } from "./suprimentos-tabs";
import { CurvaAbc } from "./curva-abc";

type Params = { params: Promise<{ workspaceId: string; projetoId: string; obraId: string }> };

function formatBRL(v: number | null) {
  if (v === null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function SuprimentosDashboardPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId, projetoId, obraId } = await params;
  await requireObraAccess(session.user.id, workspaceId, obraId);

  const obra = await getObraOrThrow(workspaceId, obraId);
  const dashboard = await getSuprimentosDashboard(workspaceId, obraId);
  const base = `/workspaces/${workspaceId}/projetos/${projetoId}/obras/${obraId}/suprimentos`;

  return (
    <div className="p-8">
      <p className="text-sm text-muted-foreground">
        {obra.name} · {obra.code}
      </p>
      <h1 className="mt-1 mb-4 text-2xl font-semibold text-foreground">Suprimentos</h1>

      <SuprimentosTabs base={base} />

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Orçamento</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{formatBRL(dashboard.resumo.orcamentoTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Comprometido</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{formatBRL(dashboard.resumo.valorComprometido)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>% Cobertura</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">
              {dashboard.resumo.percentualCobertura !== null ? `${dashboard.resumo.percentualCobertura.toFixed(1)}%` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Críticos sem previsão</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{dashboard.resumo.itensCriticosSemPrevisao}</p>
          </CardContent>
        </Card>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Curva ABC</h2>
        <CurvaAbc itens={dashboard.curvaAbc} />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Risco & Prazo</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <h3 className="mb-2 text-xs font-medium text-muted-foreground">
              Em atraso ({dashboard.riscoPrazo.itensEmAtraso.length})
            </h3>
            <ul className="space-y-1 text-sm">
              {dashboard.riscoPrazo.itensEmAtraso.map((i) => (
                <li key={i.itemId}>{i.nome}</li>
              ))}
              {dashboard.riscoPrazo.itensEmAtraso.length === 0 && <li className="text-muted-foreground">Nenhum</li>}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-medium text-muted-foreground">
              Prazo vencido ({dashboard.riscoPrazo.itensPrazoVencido.length})
            </h3>
            <ul className="space-y-1 text-sm">
              {dashboard.riscoPrazo.itensPrazoVencido.map((i) => (
                <li key={i.itemId}>{i.nome}</li>
              ))}
              {dashboard.riscoPrazo.itensPrazoVencido.length === 0 && <li className="text-muted-foreground">Nenhum</li>}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-medium text-muted-foreground">
              Críticos a comprar ({dashboard.riscoPrazo.itensCriticosAComprar.length})
            </h3>
            <ul className="space-y-1 text-sm">
              {dashboard.riscoPrazo.itensCriticosAComprar.map((i) => (
                <li key={i.itemId}>{i.nome}</li>
              ))}
              {dashboard.riscoPrazo.itensCriticosAComprar.length === 0 && <li className="text-muted-foreground">Nenhum</li>}
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Por disciplina</h2>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Disciplina</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Comprados</TableHead>
                <TableHead>Valor orçado</TableHead>
                <TableHead>% comprado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dashboard.porDisciplina.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum item ainda.
                  </TableCell>
                </TableRow>
              ) : (
                dashboard.porDisciplina.map((d) => (
                  <TableRow key={d.disciplinaId}>
                    <TableCell>
                      {d.disciplinaCode} — {d.disciplinaName}
                    </TableCell>
                    <TableCell>{d.totalItens}</TableCell>
                    <TableCell>{d.itensComprados}</TableCell>
                    <TableCell>{formatBRL(d.valorOrcado)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                          <div className="h-full bg-foreground" style={{ width: `${d.percentualComprado}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{d.percentualComprado.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
