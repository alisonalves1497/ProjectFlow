"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { CalendarioEvento } from "@/services/calendarioService";

const LIMITE = 10;

export function PendenciasMesList({ eventos }: { eventos: CalendarioEvento[] }) {
  const [mostrarTodos, setMostrarTodos] = useState(false);

  if (eventos.length === 0) {
    return <p className="text-sm text-muted-foreground">Nada previsto neste mês.</p>;
  }

  const visiveis = mostrarTodos ? eventos : eventos.slice(0, LIMITE);

  return (
    <>
      <ul className="space-y-2">
        {visiveis.map((e) => (
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
      {eventos.length > LIMITE && (
        <button
          type="button"
          onClick={() => setMostrarTodos((v) => !v)}
          className="mt-2 text-xs text-primary hover:underline"
        >
          {mostrarTodos ? "Mostrar menos" : `Ver mais (${eventos.length - LIMITE})`}
        </button>
      )}
    </>
  );
}
