"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
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

// Dropdown com checkbox por status (multi-seleção) — separado do resto do formulário
// porque o conteúdo do Popover é renderizado num portal (fora da árvore do <form>), então
// não dá pra depender do FormData do form pai; aplica direto na URL, preservando os
// outros filtros já ativos (mesma ideia do toggle "Agrupar por" logo abaixo).
function StatusMultiSelect({ statusOptions, selecionados }: { statusOptions: StatusOption[]; selecionados: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function alternar(value: string) {
    const novo = selecionados.includes(value) ? selecionados.filter((v) => v !== value) : [...selecionados, value];
    const params = new URLSearchParams(searchParams.toString());
    if (novo.length > 0) params.set("status", novo.join(","));
    else params.delete("status");
    router.push(`${pathname}?${params.toString()}`);
  }

  const rotulo =
    selecionados.length === 0
      ? "Todos os status"
      : selecionados.length === 1
        ? (statusOptions.find(([v]) => v === selecionados[0])?.[1] ?? selecionados[0])
        : `${selecionados.length} status selecionados`;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex h-9 w-full items-center justify-between rounded-md border bg-card px-3 text-sm"
          />
        }
      >
        <span className="truncate">{rotulo}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 max-h-80 overflow-y-auto">
        <div className="space-y-1.5">
          {statusOptions.map(([value, label]) => (
            <label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selecionados.includes(value)}
                onChange={(e) => {
                  // Esse checkbox vive dentro do Popover, que renderiza num portal fora da
                  // árvore DOM do <form> — mas eventos sintéticos do React ainda borbulham
                  // pela árvore de COMPONENTES, então sem isso o onChange do <form> pai
                  // também dispara (com o FormData antigo, sem o status) e sobrescreve a
                  // URL que acabou de ser aplicada aqui.
                  e.stopPropagation();
                  alternar(value);
                }}
                className="checkbox-custom"
              />
              {label}
            </label>
          ))}
        </div>
        {selecionados.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const params = new URLSearchParams(searchParams.toString());
              params.delete("status");
              router.push(`${pathname}?${params.toString()}`);
            }}
            className="mt-3 text-xs text-primary hover:underline"
          >
            Limpar seleção
          </button>
        )}
      </PopoverContent>
    </Popover>
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
  status: string[];
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
    status.length === 0 &&
    !disciplinaId &&
    !secaoId &&
    !responsavelId &&
    !somenteEmAtraso &&
    !recentes &&
    !comRetrabalho &&
    !favoritos;

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
            <StatusMultiSelect statusOptions={statusOptions} selecionados={status} />
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
