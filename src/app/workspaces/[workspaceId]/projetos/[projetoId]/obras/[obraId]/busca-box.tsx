"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function BuscaBox({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [aberto, setAberto] = useState(Boolean(searchParams.get("q")));
  const [valor, setValor] = useState(searchParams.get("q") ?? "");

  function aplicar(novoValor: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (novoValor.trim()) params.set("q", novoValor.trim());
    else params.delete("q");
    router.push(`${pathname}?${params.toString()}`);
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        title="Buscar"
        className={cn(
          "flex size-8 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent hover:text-foreground",
          className
        )}
      >
        <Search className="size-4" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-md border bg-card pr-1 pl-2">
      <Search className="size-3.5 shrink-0 text-muted-foreground" />
      <input
        autoFocus
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") aplicar(valor);
          if (e.key === "Escape") {
            setValor("");
            aplicar("");
            setAberto(false);
          }
        }}
        onBlur={() => aplicar(valor)}
        placeholder="Buscar código ou descrição..."
        className="h-8 w-40 bg-transparent text-sm outline-none"
      />
      <button
        type="button"
        onClick={() => {
          setValor("");
          aplicar("");
          setAberto(false);
        }}
        title="Fechar busca"
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
