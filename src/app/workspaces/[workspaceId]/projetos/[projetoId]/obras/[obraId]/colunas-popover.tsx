"use client";

import { Menu } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { COLUNAS_PADRAO, type ColunasVisiveis } from "./documentos-lista";

const OPCOES: { key: keyof ColunasVisiveis; label: string }[] = [
  { key: "resp", label: "Resp." },
  { key: "prazo", label: "Prazo" },
  { key: "fluxo", label: "Fluxo" },
  { key: "rev", label: "Rev." },
  { key: "status", label: "Status" },
];

export function ColunasPopover({
  value,
  onChange,
  className,
}: {
  value: ColunasVisiveis;
  onChange: (v: ColunasVisiveis) => void;
  className?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger render={<button type="button" className={className ?? "text-muted-foreground hover:text-foreground"} title="Colunas visíveis" />}>
        <Menu className="size-4" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56">
        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Colunas visíveis</p>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked disabled className="checkbox-custom opacity-60" />
            Código / Descrição
          </label>
          {OPCOES.map((o) => (
            <label key={o.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={value[o.key]}
                onChange={() => onChange({ ...value, [o.key]: !value[o.key] })}
                className="checkbox-custom"
              />
              {o.label}
            </label>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onChange(COLUNAS_PADRAO)}
          className="mt-3 text-xs text-primary hover:underline"
        >
          Restaurar padrão
        </button>
      </PopoverContent>
    </Popover>
  );
}
