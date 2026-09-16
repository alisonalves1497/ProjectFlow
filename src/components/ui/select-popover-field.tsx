"use client";

import { useState, type ReactNode } from "react";
import { Ban } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type SelectPopoverOption = { value: string; label: ReactNode; icon?: ReactNode };

// Campo "escolher 1 de uma lista" com o mesmo visual em todo canto que usa (Prioridade,
// Projeto, Documento da Lista Pessoal): botão com contorno só no hover/foco, abre popover
// com as opções + "Limpar" no rodapé quando já tem algo selecionado.
export function SelectPopoverField({
  triggerContent,
  triggerClassName,
  options,
  value,
  onChange,
  emptyMessage = "Nenhuma opção disponível.",
  disabled,
  width = "w-52",
}: {
  triggerContent: ReactNode;
  triggerClassName?: string;
  options: SelectPopoverOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  emptyMessage?: string;
  disabled?: boolean;
  width?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={
          <button
            type="button"
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-md border border-transparent px-1.5 text-xs text-muted-foreground transition-colors hover:border-input hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-input focus-visible:outline-none",
              triggerClassName
            )}
          />
        }
      >
        {triggerContent}
      </PopoverTrigger>
      <PopoverContent align="start" className={cn(width, "p-1")}>
        {options.length === 0 ? (
          <p className="px-2 py-2 text-xs text-muted-foreground">{emptyMessage}</p>
        ) : (
          options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
                value === o.value && "bg-accent"
              )}
            >
              {o.icon}
              <span className="min-w-0 truncate">{o.label}</span>
            </button>
          ))
        )}
        {value !== null && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent",
              options.length > 0 && "mt-1 border-t pt-2"
            )}
          >
            <Ban className="size-3.5" />
            Limpar
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
