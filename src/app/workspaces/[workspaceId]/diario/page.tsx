import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Clock } from "lucide-react";
import { getMeuTrabalho, listTarefasPessoais, getHorasAcumuladasPorProjeto } from "@/services/diarioService";
import { listProjetos } from "@/services/projetoService";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MeuTrabalho } from "./meu-trabalho";
import { ListaPessoal } from "./lista-pessoal";

type Params = { params: Promise<{ workspaceId: string }> };

function saudacao(): string {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function DiarioPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId } = await params;

  const [meuTrabalho, tarefas, horasAcumuladas, projetos] = await Promise.all([
    getMeuTrabalho(workspaceId, session.user.id),
    listTarefasPessoais(workspaceId, session.user.id),
    getHorasAcumuladasPorProjeto(workspaceId, session.user.id),
    listProjetos(workspaceId),
  ]);

  const primeiroNome = (session.user.name ?? session.user.email ?? "").split(" ")[0];

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-semibold text-primary">
        {saudacao()}, {primeiroNome}
      </h1>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <MeuTrabalho workspaceId={workspaceId} dados={meuTrabalho} />
          <ListaPessoal workspaceId={workspaceId} tarefasIniciais={tarefas} projetos={projetos.map((p) => ({ id: p.id, name: p.name }))} />
        </div>

        <Card className="self-start">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              <CardTitle>Horas acumuladas por projeto</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {horasAcumuladas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma hora registrada ainda.</p>
            ) : (
              <ul className="space-y-2">
                {horasAcumuladas.map((h) => (
                  <li key={h.projeto} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <span className="min-w-0 truncate">{h.projeto}</span>
                    <span className="shrink-0 font-semibold text-primary">{h.horas}h</span>
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
