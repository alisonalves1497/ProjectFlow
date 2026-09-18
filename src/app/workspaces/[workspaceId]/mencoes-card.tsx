"use client";

import { useState } from "react";
import Link from "next/link";
import { AtSign, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dispensarMencaoAction } from "./mencoes/actions";

export type MencaoPendente = {
  id: string;
  documentoId: string;
  documentoCodigo: string;
  corpo: string;
  autorNome: string | null;
  createdAt: Date;
};

export function MencoesCard({ workspaceId, mencoes }: { workspaceId: string; mencoes: MencaoPendente[] }) {
  const [dispensadas, setDispensadas] = useState<Set<string>>(new Set());
  const visiveis = mencoes.filter((m) => !dispensadas.has(m.id));

  if (visiveis.length === 0) return null;

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AtSign className="size-4 text-primary" />
          <CardTitle>Menções ({visiveis.length})</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {visiveis.map((m) => (
            <li key={m.id} className="flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm">
              <Link href={`/workspaces/${workspaceId}/documentos/${m.documentoId}`} className="min-w-0 hover:underline">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{m.autorNome ?? "Alguém"}</span> citou você em{" "}
                  <span className="font-mono">{m.documentoCodigo}</span> · {new Date(m.createdAt).toLocaleString("pt-BR")}
                </p>
                <p className="line-clamp-2 whitespace-pre-wrap">{m.corpo}</p>
              </Link>
              <button
                type="button"
                title="Dispensar"
                onClick={async () => {
                  setDispensadas((prev) => new Set(prev).add(m.id));
                  await dispensarMencaoAction(workspaceId, m.id);
                }}
                className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
