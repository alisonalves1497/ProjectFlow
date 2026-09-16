"use client";

import { useState } from "react";
import { CalendarDays, ChevronUp, ChevronDown, X } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const DIAS_SEMANA = ["do", "2ª", "3ª", "4ª", "5ª", "6ª", "sá"];

function paraISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isoHoje(): string {
  return paraISO(new Date());
}

function matrizMes(ano: number, mes: number) {
  const primeiro = new Date(ano, mes, 1);
  const cursor = new Date(primeiro);
  cursor.setDate(primeiro.getDate() - primeiro.getDay());

  const semanas: { iso: string; dia: number; noMes: boolean }[][] = [];
  for (let semana = 0; semana < 6; semana++) {
    const linha: { iso: string; dia: number; noMes: boolean }[] = [];
    for (let dia = 0; dia < 7; dia++) {
      linha.push({ iso: paraISO(cursor), dia: cursor.getDate(), noMes: cursor.getMonth() === mes });
      cursor.setDate(cursor.getDate() + 1);
    }
    semanas.push(linha);
  }
  return semanas;
}

function formatarRotulo(iso: string): string {
  const hoje = isoHoje();
  const ontem = paraISO(new Date(Date.now() - 86_400_000));
  const amanha = paraISO(new Date(Date.now() + 86_400_000));
  if (iso === hoje) return "Hoje";
  if (iso === ontem) return "Ontem";
  if (iso === amanha) return "Amanhã";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

// Campo de data com popover de calendário próprio (em vez do date picker nativo do
// navegador) — usado em Vencimento/Início/Conclusão da Lista Pessoal. Contorno some só no
// hover/foco, pra não competir visualmente quando a célula está vazia.
export function DatePickerField({ value, onChange }: { value: string | null; onChange: (iso: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [cursorMes, setCursorMes] = useState(() => {
    const base = value ? new Date(`${value}T00:00:00`) : new Date();
    return { ano: base.getFullYear(), mes: base.getMonth() };
  });

  function abrir(estaAbrindo: boolean) {
    if (estaAbrindo) {
      const base = value ? new Date(`${value}T00:00:00`) : new Date();
      setCursorMes({ ano: base.getFullYear(), mes: base.getMonth() });
    }
    setOpen(estaAbrindo);
  }

  function mudarMes(delta: number) {
    setCursorMes((prev) => {
      const d = new Date(prev.ano, prev.mes + delta, 1);
      return { ano: d.getFullYear(), mes: d.getMonth() };
    });
  }

  const semanas = matrizMes(cursorMes.ano, cursorMes.mes);
  const rotuloMes = new Date(cursorMes.ano, cursorMes.mes, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const hoje = isoHoje();

  return (
    <Popover open={open} onOpenChange={abrir}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex h-7 items-center gap-1.5 rounded-md border border-transparent px-1.5 text-xs text-muted-foreground transition-colors hover:border-input hover:bg-accent focus-visible:border-input focus-visible:outline-none"
          />
        }
      >
        <CalendarDays className="size-3.5 shrink-0" />
        {value && <span className="text-foreground">{formatarRotulo(value)}</span>}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        {value && (
          <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
            <span className="text-sm text-primary">{formatarRotulo(value)}</span>
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Limpar data"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        <div className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium capitalize">{rotuloMes}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  setCursorMes({ ano: d.getFullYear(), mes: d.getMonth() });
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Hoje
              </button>
              <button type="button" onClick={() => mudarMes(-1)} className="text-muted-foreground hover:text-foreground" aria-label="Mês anterior">
                <ChevronUp className="size-3.5" />
              </button>
              <button type="button" onClick={() => mudarMes(1)} className="text-muted-foreground hover:text-foreground" aria-label="Próximo mês">
                <ChevronDown className="size-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
            {DIAS_SEMANA.map((d) => (
              <span key={d} className="text-muted-foreground">
                {d}
              </span>
            ))}
            {semanas.map((semana, i) =>
              semana.map((d) => (
                <button
                  key={`${i}-${d.iso}`}
                  type="button"
                  onClick={() => {
                    onChange(d.iso);
                    setOpen(false);
                  }}
                  className={cn(
                    "mx-auto flex size-7 items-center justify-center rounded-md hover:bg-accent",
                    !d.noMes && "text-muted-foreground/40",
                    d.iso === hoje && d.iso !== value && "ring-1 ring-inset ring-primary/50",
                    d.iso === value && "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  {d.dia}
                </button>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
