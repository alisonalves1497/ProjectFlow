"use client";

import { useState } from "react";
import { TriangleAlert, BellRing } from "lucide-react";

export function AlertaAtualizacoes({ quantidade }: { quantidade: number }) {
  const [dispensado, setDispensado] = useState(false);
  if (quantidade === 0 || dispensado) return null;

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-950/40 dark:text-amber-300">
      <span className="flex items-center gap-2">
        <TriangleAlert className="size-4 shrink-0" />
        {quantidade} documento{quantidade > 1 ? "s" : ""} com atualizações desde a sua última visita — marcados com{" "}
        <BellRing className="inline size-3.5 shrink-0 text-primary" /> na lista.
      </span>
      <button type="button" onClick={() => setDispensado(true)} className="shrink-0 font-medium hover:underline">
        Entendi
      </button>
    </div>
  );
}
