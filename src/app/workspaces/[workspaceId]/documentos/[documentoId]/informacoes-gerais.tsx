import { Building2, Layers, CalendarDays, CalendarClock, UserCog, UserSearch, Clock, History } from "lucide-react";
import type { LucideIcon } from "lucide-react";

function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

function Campo({ icon: Icon, label, valor }: { icon: LucideIcon; label: string; valor: string }) {
  return (
    <div>
      <p className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-sm">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        {valor}
      </p>
    </div>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{titulo}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export function InformacoesGerais({
  obraNome,
  disciplinaNome,
  dataBaseline,
  dataReprogramada,
  responsavelNome,
}: {
  obraNome: string;
  disciplinaNome: string;
  dataBaseline: string | null;
  dataReprogramada: string | null;
  responsavelNome: string | null;
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="mb-4 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Informações gerais
      </p>
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        <Grupo titulo="Classificação">
          <Campo icon={Building2} label="Projeto" valor={obraNome} />
          <Campo icon={Layers} label="Disciplina" valor={disciplinaNome} />
        </Grupo>
        <Grupo titulo="Prazos">
          <Campo icon={CalendarDays} label="Baseline" valor={formatarData(dataBaseline)} />
          <Campo icon={CalendarClock} label="Reprogramada" valor={formatarData(dataReprogramada)} />
        </Grupo>
        <Grupo titulo="Responsáveis">
          <Campo icon={UserCog} label="Responsável" valor={responsavelNome ?? "—"} />
          <Campo icon={UserSearch} label="Análise" valor="—" />
        </Grupo>
        <Grupo titulo="Esforço">
          <Campo icon={Clock} label="Tempo estimado" valor="—" />
          <Campo icon={History} label="Tempo rastreado" valor="—" />
        </Grupo>
      </div>
    </div>
  );
}
