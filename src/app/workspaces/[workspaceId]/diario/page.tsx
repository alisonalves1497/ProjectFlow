import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getHorasSemana, getHorasAcumuladasPorProjeto, getProjetosUsados, getPrazosProximos } from "@/services/diarioService";
import { GradeHoras } from "./grade-horas";

type Params = {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ semana?: string }>;
};

const DIAS_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"] as const;

function segundaDaSemana(data: Date): Date {
  const dia = data.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  const segunda = new Date(data);
  segunda.setDate(data.getDate() + diff);
  segunda.setHours(0, 0, 0, 0);
  return segunda;
}

function paraISO(data: Date): string {
  return data.toISOString().slice(0, 10);
}

export default async function DiarioPage({ params, searchParams }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId } = await params;
  const sp = await searchParams;

  const segunda = sp.semana && /^\d{4}-\d{2}-\d{2}$/.test(sp.semana) ? segundaDaSemana(new Date(`${sp.semana}T00:00:00`)) : segundaDaSemana(new Date());
  const dias = DIAS_SEMANA.map((label, i) => {
    const d = new Date(segunda);
    d.setDate(segunda.getDate() + i);
    return { label, iso: paraISO(d) };
  });
  const segundaISO = dias[0].iso;
  const sextaISO = dias[4].iso;

  const semanaAnterior = new Date(segunda);
  semanaAnterior.setDate(segunda.getDate() - 7);
  const semanaSeguinte = new Date(segunda);
  semanaSeguinte.setDate(segunda.getDate() + 7);

  const [horas, horasAcumuladas, projetosUsados, prazos] = await Promise.all([
    getHorasSemana(workspaceId, session.user.id, segundaISO, sextaISO),
    getHorasAcumuladasPorProjeto(workspaceId, session.user.id),
    getProjetosUsados(workspaceId, session.user.id),
    getPrazosProximos(workspaceId, session.user.id, 4),
  ]);

  const primeiroNome = (session.user.name ?? session.user.email ?? "").split(" ")[0];

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Olá, {primeiroNome}!</h1>

      <h2 className="mb-2 text-sm font-semibold text-muted-foreground uppercase">Seus lembretes</h2>
      <div className="mb-8 overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Lista de projetos</th>
              <th className="w-32 px-3 py-2 text-left font-medium">Prazo</th>
            </tr>
          </thead>
          <tbody>
            {prazos.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-3 py-4 text-center text-muted-foreground">
                  Nenhum prazo atribuído a você no momento.
                </td>
              </tr>
            ) : (
              prazos.map((p) => (
                <tr key={p.documentoId} className="border-t">
                  <td className="px-3 py-2">
                    {p.obraNome} — {p.descricao}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(`${p.dataPrevista}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <GradeHoras
        workspaceId={workspaceId}
        dias={dias}
        segundaISO={segundaISO}
        semanaAnteriorISO={paraISO(semanaAnterior)}
        semanaSeguinteISO={paraISO(semanaSeguinte)}
        horasIniciais={horas}
        projetosUsados={projetosUsados}
      />

      <h2 className="mt-8 mb-2 text-sm font-semibold text-muted-foreground uppercase">Horas acumuladas por projeto</h2>
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
  );
}
