import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMeuTrabalho, listTarefasPessoais, getHorasAcumuladasPorProjeto } from "@/services/diarioService";
import { listProjetos } from "@/services/projetoService";
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
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold">
        {saudacao()}, {primeiroNome}
      </h1>

      <MeuTrabalho workspaceId={workspaceId} dados={meuTrabalho} />

      <ListaPessoal workspaceId={workspaceId} tarefasIniciais={tarefas} projetos={projetos.map((p) => ({ id: p.id, name: p.name }))} />

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground uppercase">Horas acumuladas por projeto</h2>
        {horasAcumuladas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma hora registrada ainda.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {horasAcumuladas.map((h) => (
              <li key={h.projeto} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>{h.projeto}</span>
                <span className="font-medium">{h.horas}h</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
