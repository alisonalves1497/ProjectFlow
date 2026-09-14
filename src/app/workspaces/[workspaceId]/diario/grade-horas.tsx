"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { salvarHoraCelulaAction } from "./actions";
import type { CelulaHora } from "@/services/diarioService";

const HORAS = Array.from({ length: 10 }, (_, i) => 8 + i); // 08h-09h ... 17h-18h

function chave(data: string, horaInicio: number): string {
  return `${data}|${horaInicio}`;
}

function formatarSemana(segundaISO: string, sextaISO: string): string {
  const seg = new Date(`${segundaISO}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const sex = new Date(`${sextaISO}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${seg} a ${sex}`;
}

export function GradeHoras({
  workspaceId,
  dias,
  segundaISO,
  semanaAnteriorISO,
  semanaSeguinteISO,
  horasIniciais,
  projetosUsados,
}: {
  workspaceId: string;
  dias: { label: string; iso: string }[];
  segundaISO: string;
  semanaAnteriorISO: string;
  semanaSeguinteISO: string;
  horasIniciais: CelulaHora[];
  projetosUsados: string[];
}) {
  const [celulas, setCelulas] = useState<Record<string, string>>(() => {
    const mapa: Record<string, string> = {};
    for (const h of horasIniciais) mapa[chave(h.data, h.horaInicio)] = h.projeto;
    return mapa;
  });
  // Incrementado a cada mudança confirmada (sucesso ou revert de falha) — usado no `key` do
  // input pra forçar remount e o defaultValue refletir o valor de verdade, já que o campo é
  // não controlado (evita recriar o input a cada tecla digitada).
  const [versao, setVersao] = useState(0);
  const [, startTransition] = useTransition();

  function salvar(data: string, horaInicio: number, projeto: string) {
    const original = celulas[chave(data, horaInicio)] ?? "";
    if (projeto === original) return;

    setCelulas((prev) => {
      const proximo = { ...prev };
      if (projeto) proximo[chave(data, horaInicio)] = projeto;
      else delete proximo[chave(data, horaInicio)];
      return proximo;
    });

    startTransition(async () => {
      const res = await salvarHoraCelulaAction(workspaceId, { data, horaInicio, projeto });
      if (!res.ok) {
        toast.error(res.error);
        setCelulas((prev) => ({ ...prev, [chave(data, horaInicio)]: original }));
        setVersao((v) => v + 1);
      }
    });
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase">Semana de {formatarSemana(segundaISO, dias[4].iso)}</h2>
        <div className="flex items-center gap-1">
          <Link
            href={`?semana=${semanaAnteriorISO}`}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Semana anterior"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <Link
            href={`?semana=${semanaSeguinteISO}`}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Próxima semana"
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[640px] table-fixed text-sm">
          <colgroup>
            <col className="w-20" />
            {dias.map((d) => (
              <col key={d.iso} />
            ))}
          </colgroup>
          <thead className="bg-muted/50">
            <tr>
              <th className="px-2 py-2 text-left font-medium"></th>
              {dias.map((d) => (
                <th key={d.iso} className="px-2 py-2 text-left font-medium">
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HORAS.map((hora) => (
              <tr key={hora} className="border-t">
                <td className="px-2 py-1 text-xs whitespace-nowrap text-muted-foreground">
                  {hora}h-{hora + 1}h
                </td>
                {dias.map((d) => (
                  <td key={d.iso} className="border-l p-0">
                    <input
                      key={`${chave(d.iso, hora)}-${versao}`}
                      type="text"
                      defaultValue={celulas[chave(d.iso, hora)] ?? ""}
                      onBlur={(e) => salvar(d.iso, hora, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                      list="diario-projetos-sugestoes"
                      className="h-8 w-full truncate bg-transparent px-2 text-xs outline-none focus:bg-accent"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <datalist id="diario-projetos-sugestoes">
        {projetosUsados.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
    </div>
  );
}
