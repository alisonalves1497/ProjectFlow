"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function MonthPicker({
  ano,
  mesNum,
  escopo,
  label,
}: {
  ano: number;
  mesNum: number;
  escopo: string;
  label: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [anoExibido, setAnoExibido] = useState(ano);

  function escolherMes(mesIdx: number) {
    router.push(`?mes=${anoExibido}-${pad(mesIdx + 1)}&escopo=${escopo}`);
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setAnoExibido(ano);
      }}
    >
      <PopoverTrigger
        render={<button type="button" className="h-9 px-2 text-sm font-medium capitalize hover:bg-accent" />}
      >
        {label}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setAnoExibido((a) => a - 1)}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Ano anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-sm font-semibold">{anoExibido}</span>
          <button
            type="button"
            onClick={() => setAnoExibido((a) => a + 1)}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Próximo ano"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {MESES_ABREV.map((nome, idx) => {
            const selecionado = anoExibido === ano && idx + 1 === mesNum;
            return (
              <button
                key={nome}
                type="button"
                onClick={() => escolherMes(idx)}
                className={cn(
                  "rounded-md py-1.5 text-sm",
                  selecionado ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                )}
              >
                {nome}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
