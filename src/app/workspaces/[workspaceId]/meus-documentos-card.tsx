"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { STATUS_LABELS, type StatusDocumento } from "@/lib/statusGraph";

type Documento = { id: string; codigoCompleto: string; descricao: string; status: StatusDocumento; obraId: string };

export function MeusDocumentosCard({
  workspaceId,
  documentos,
  className,
}: {
  workspaceId: string;
  documentos: Documento[];
  className?: string;
}) {
  const [statusFiltro, setStatusFiltro] = useState<string>("");

  const filtrados = statusFiltro ? documentos.filter((d) => d.status === statusFiltro) : documentos;
  // Status realmente usados por esses documentos — não faz sentido oferecer no filtro um
  // status que não aparece em nenhum documento atribuído a essa pessoa.
  const statusDisponiveis = [...new Set(documentos.map((d) => d.status))];

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FolderKanban className="size-4 text-primary" />
          <CardTitle>Meus documentos</CardTitle>
        </div>
        <CardAction>
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            className="h-8 rounded-md border bg-card px-2 text-xs"
          >
            <option value="">Todos os status ({documentos.length})</option>
            {statusDisponiveis.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]} ({documentos.filter((d) => d.status === s).length})
              </option>
            ))}
          </select>
        </CardAction>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        {filtrados.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {documentos.length === 0 ? "Nenhum documento atribuído a você." : "Nenhum documento com esse status."}
          </p>
        ) : (
          // min-h: garante uns 10 itens visíveis mesmo se o card ficar baixo (esticado só até
          // a altura da "Programação da semana" ao lado, que pode ter pouca coisa) — flex-1
          // ainda deixa crescer além disso quando o card fica mais alto. Sem corte por
          // quantidade: rola pra ver o resto em vez de esconder atrás de "Mostrando N de M".
          <ul className="min-h-[480px] flex-1 space-y-2 overflow-y-auto">
            {filtrados.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                <Link href={`/workspaces/${workspaceId}/documentos/${d.id}`} className="min-w-0 hover:underline">
                  <span className="font-mono text-xs">{d.codigoCompleto}</span>{" "}
                  <span className="text-muted-foreground">{d.descricao}</span>
                </Link>
                <StatusBadge status={d.status} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
