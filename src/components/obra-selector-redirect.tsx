"use client";

import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";

type ObraOpcao = { id: string; projetoId: string; label: string };

export function ObraSelectorRedirect({
  workspaceId,
  obras,
  destinoSufixo,
  titulo,
}: {
  workspaceId: string;
  obras: ObraOpcao[];
  destinoSufixo: string;
  titulo: string;
}) {
  const router = useRouter();

  return (
    <div className="max-w-md p-8">
      <h1 className="mb-4 text-2xl font-semibold">{titulo}</h1>
      {obras.length === 0 ? (
        <p className="text-sm text-muted-foreground">Você não tem acesso a nenhuma obra ainda.</p>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="obraId">Selecione uma obra</Label>
          <select
            id="obraId"
            defaultValue=""
            onChange={(e) => {
              const obra = obras.find((o) => o.id === e.target.value);
              if (!obra) return;
              router.push(`/workspaces/${workspaceId}/projetos/${obra.projetoId}/obras/${obra.id}/${destinoSufixo}`);
            }}
            className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="" disabled>
              Selecione uma obra...
            </option>
            {obras.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
