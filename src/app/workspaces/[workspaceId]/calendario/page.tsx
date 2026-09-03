import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCalendarioEventos, type CalendarioEvento } from "@/services/calendarioService";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Params = {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ mes?: string; escopo?: string }>;
};

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function fmt(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function eventoCor(evento: CalendarioEvento) {
  if (evento.tipo === "grd") return "bg-muted text-muted-foreground";
  if (evento.minhaPendencia) return "bg-primary/10 text-primary";
  return "bg-secondary text-secondary-foreground";
}

export default async function CalendarioPage({ params, searchParams }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId } = await params;
  const sp = await searchParams;
  const escopo = sp.escopo === "projeto" ? "projeto" : "minhas";

  const hoje = new Date();
  const [anoStr, mesStr] = (sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}`).split("-");
  const ano = Number(anoStr);
  const mesNum = Number(mesStr); // 1-12

  const primeiroDiaMes = new Date(ano, mesNum - 1, 1);
  const ultimoDiaMes = new Date(ano, mesNum, 0);
  const inicioGrid = new Date(primeiroDiaMes);
  inicioGrid.setDate(inicioGrid.getDate() - inicioGrid.getDay());
  const fimGrid = new Date(ultimoDiaMes);
  fimGrid.setDate(fimGrid.getDate() + (6 - fimGrid.getDay()));

  const eventos = await getCalendarioEventos(workspaceId, session.user.id, {
    inicio: fmt(inicioGrid),
    fim: fmt(fimGrid),
    escopo,
  });

  const eventosPorDia = new Map<string, CalendarioEvento[]>();
  for (const e of eventos) {
    if (!eventosPorDia.has(e.data)) eventosPorDia.set(e.data, []);
    eventosPorDia.get(e.data)!.push(e);
  }

  const dias: Date[] = [];
  for (let d = new Date(inicioGrid); d <= fimGrid; d.setDate(d.getDate() + 1)) {
    dias.push(new Date(d));
  }
  const semanas: Date[][] = [];
  for (let i = 0; i < dias.length; i += 7) semanas.push(dias.slice(i, i + 7));

  const eventosDoMes = eventos.filter((e) => e.data >= fmt(primeiroDiaMes) && e.data <= fmt(ultimoDiaMes)).sort((a, b) => (a.data < b.data ? -1 : 1));

  const mesAnterior = mesNum === 1 ? { ano: ano - 1, mes: 12 } : { ano, mes: mesNum - 1 };
  const mesProximo = mesNum === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: mesNum + 1 };

  function hrefMes(m: { ano: number; mes: number }) {
    return `?mes=${m.ano}-${pad(m.mes)}&escopo=${escopo}`;
  }
  function hrefEscopo(novoEscopo: "minhas" | "projeto") {
    return `?mes=${ano}-${pad(mesNum)}&escopo=${novoEscopo}`;
  }

  const nomeMes = primeiroDiaMes.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const hojeStr = fmt(hoje);

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-semibold">Calendário</h1>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <a href={hrefMes(mesAnterior)} className="h-9 rounded-md border px-3 text-sm leading-9 hover:bg-accent">
            ← Anterior
          </a>
          <a href={`?mes=${hojeStr.slice(0, 7)}&escopo=${escopo}`} className="h-9 rounded-md border px-3 text-sm leading-9 hover:bg-accent">
            Hoje
          </a>
          <a href={hrefMes(mesProximo)} className="h-9 rounded-md border px-3 text-sm leading-9 hover:bg-accent">
            Próximo →
          </a>
          <span className="ml-2 text-sm font-medium capitalize">{nomeMes}</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={hrefEscopo("minhas")}
            className={cn("h-9 rounded-md border px-3 text-sm leading-9", escopo === "minhas" ? "bg-primary/10 text-primary" : "hover:bg-accent")}
          >
            Minhas atividades
          </a>
          <a
            href={hrefEscopo("projeto")}
            className={cn("h-9 rounded-md border px-3 text-sm leading-9", escopo === "projeto" ? "bg-primary/10 text-primary" : "hover:bg-accent")}
          >
            Projeto
          </a>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-full bg-secondary" /> Documento previsto
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-full bg-primary/40" /> Minha pendência
        </span>
        {escopo === "projeto" && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-full bg-muted-foreground/40" /> GRD emitido
          </span>
        )}
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-6">
        <div className="overflow-hidden rounded-lg border">
          <div className="grid grid-cols-7 border-b bg-muted/50">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">
                {d}
              </div>
            ))}
          </div>
          {semanas.map((semana, i) => (
            <div key={i} className="grid grid-cols-7 border-b last:border-b-0">
              {semana.map((dia) => {
                const diaStr = fmt(dia);
                const eventosDia = eventosPorDia.get(diaStr) ?? [];
                const foraDoMes = dia.getMonth() !== mesNum - 1;
                return (
                  <div key={diaStr} className={cn("min-h-24 border-r p-1.5 last:border-r-0", foraDoMes && "bg-muted/30")}>
                    <span
                      className={cn(
                        "text-xs",
                        foraDoMes ? "text-muted-foreground/50" : "text-foreground",
                        diaStr === hojeStr && "flex size-5 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground"
                      )}
                    >
                      {dia.getDate()}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {eventosDia.slice(0, 3).map((e) => (
                        <Link
                          key={`${e.tipo}-${e.id}`}
                          href={e.href}
                          className={cn("block truncate rounded px-1 py-0.5 text-[11px] hover:underline", eventoCor(e))}
                          title={`${e.codigo} — ${e.descricao}`}
                        >
                          {e.codigo}
                        </Link>
                      ))}
                      {eventosDia.length > 3 && <p className="px-1 text-[11px] text-muted-foreground">+{eventosDia.length - 3}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <aside>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Pendências do mês ({eventosDoMes.length})</h2>
          {eventosDoMes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada previsto neste mês.</p>
          ) : (
            <ul className="space-y-2">
              {eventosDoMes.map((e) => (
                <li key={`${e.tipo}-${e.id}`} className="rounded-md border p-2 text-sm">
                  <Link href={e.href} className="hover:underline">
                    <span className="font-mono text-xs">{e.codigo}</span>
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.data + "T00:00:00").toLocaleDateString("pt-BR")}
                    {e.minhaPendencia && (
                      <Badge variant="warning" className="ml-1">
                        Minha
                      </Badge>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
