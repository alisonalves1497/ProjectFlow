"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { StatusDocumento } from "@/lib/statusGraph";

type StatusOption = [StatusDocumento, string];
type Disciplina = { disciplinaId: string; code: string; name: string };
type SecaoOption = { id: string; label: string };
type UsuarioOption = { userId: string; name: string | null; email: string };

function CampoFiltro({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-36 flex-1 flex-col gap-1">
      <span className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
      {children}
    </div>
  );
}

function ChipToggle({ name, label, count, defaultChecked }: { name: string; label: string; count: number; defaultChecked: boolean }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
        defaultChecked ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
      )}
    >
      <input type="checkbox" name={name} value="1" defaultChecked={defaultChecked} className="sr-only" />
      {label} ({count})
    </label>
  );
}

// Painel inline (não é popup) — fica "ativo/oculto" via toggle no ícone de Filtros,
// empurrando a tabela pra baixo em vez de flutuar por cima do conteúdo. Aplica via
// client-side navigation (router.push), não submit nativo — um submit nativo recarrega a
// página inteira e reseta o estado "painel aberto" do componente pai a cada mudança.
export function FiltrosPopover({
  statusOptions,
  disciplinas,
  secaoOptions,
  usuarios,
  status,
  disciplinaId,
  secaoId,
  responsavelId,
  somenteEmAtraso,
  recentes,
  comRetrabalho,
  favoritos,
  agrupado,
  toggleAgrupadoHref,
  contadoresToggles,
}: {
  statusOptions: StatusOption[];
  disciplinas: Disciplina[];
  secaoOptions: SecaoOption[];
  usuarios: UsuarioOption[];
  status?: string;
  disciplinaId?: string;
  secaoId?: string;
  responsavelId?: string;
  somenteEmAtraso: boolean;
  recentes: boolean;
  comRetrabalho: boolean;
  favoritos: boolean;
  agrupado: boolean;
  toggleAgrupadoHref: string;
  contadoresToggles: { somenteEmAtraso: number; recentes: number; comRetrabalho: number; favoritos: number; paraObra: number };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const nenhumFiltroAtivo =
    !status && !disciplinaId && !secaoId && !responsavelId && !somenteEmAtraso && !recentes && !comRetrabalho && !favoritos;

  function aplicar(form: HTMLFormElement) {
    const dados = new FormData(form);
    const params = new URLSearchParams();
    const q = searchParams.get("q");
    if (q) params.set("q", q);
    for (const [chave, valor] of dados.entries()) {
      if (valor) params.set(chave, String(valor));
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mb-4 rounded-lg border bg-primary/5 p-3">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => e.preventDefault()}
        onChange={(e) => aplicar(e.currentTarget)}
      >
        <div className="flex flex-wrap gap-3">
          <CampoFiltro label="Status">
            <select name="status" defaultValue={status ?? ""} className="h-9 w-full rounded-md border bg-card px-3 text-sm">
              <option value="">Todos os status</option>
              {statusOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </CampoFiltro>
          <CampoFiltro label="Disciplina">
            <select name="disciplinaId" defaultValue={disciplinaId ?? ""} className="h-9 w-full rounded-md border bg-card px-3 text-sm">
              <option value="">Todas</option>
              {disciplinas.map((d) => (
                <option key={d.disciplinaId} value={d.disciplinaId}>
                  {d.code} — {d.name}
                </option>
              ))}
            </select>
          </CampoFiltro>
          <CampoFiltro label="Grupo / Seção">
            <select name="secaoId" defaultValue={secaoId ?? ""} className="h-9 w-full rounded-md border bg-card px-3 text-sm">
              <option value="">Todas as seções</option>
              {secaoOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </CampoFiltro>
          <CampoFiltro label="Responsável">
            <select name="responsavelId" defaultValue={responsavelId ?? ""} className="h-9 w-full rounded-md border bg-card px-3 text-sm">
              <option value="">Todos</option>
              {usuarios.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.name ?? u.email}
                </option>
              ))}
            </select>
          </CampoFiltro>
          <CampoFiltro label="Agrupar por">
            <select
              defaultValue={agrupado ? "secao" : "flat"}
              onChange={(e) => {
                // stopPropagation: esse select não tem `name` (não é um filtro de verdade, é
                // uma navegação separada) — sem isso, o onChange do <form> (aplicar) também
                // dispara pro mesmo evento e sobrescreve a navegação com o `agrupado` antigo.
                e.stopPropagation();
                const querSecao = e.target.value === "secao";
                if (querSecao !== agrupado) router.push(toggleAgrupadoHref);
              }}
              className="h-9 w-full rounded-md border bg-card px-3 text-sm"
            >
              <option value="secao">Seção / grupo</option>
              <option value="flat">Lista flat</option>
            </select>
          </CampoFiltro>
        </div>

        <input type="hidden" name="agrupado" value={agrupado ? "1" : "0"} />

        <div className="flex flex-wrap gap-2 border-t border-primary/10 pt-3">
          <button
            type="button"
            onClick={() => router.push(pathname)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
              nenhumFiltroAtivo ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
            )}
          >
            Para obra ({contadoresToggles.paraObra})
          </button>
          <ChipToggle name="favoritos" label="Favoritos" count={contadoresToggles.favoritos} defaultChecked={favoritos} />
          <ChipToggle
            name="somenteEmAtraso"
            label="Somente em atraso"
            count={contadoresToggles.somenteEmAtraso}
            defaultChecked={somenteEmAtraso}
          />
          <ChipToggle name="recentes" label="Recentes" count={contadoresToggles.recentes} defaultChecked={recentes} />
          <ChipToggle
            name="comRetrabalho"
            label="Com retrabalho"
            count={contadoresToggles.comRetrabalho}
            defaultChecked={comRetrabalho}
          />
        </div>
      </form>
    </div>
  );
}
