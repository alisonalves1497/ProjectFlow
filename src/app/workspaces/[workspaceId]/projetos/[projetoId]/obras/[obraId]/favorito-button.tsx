"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleFavoritoAction } from "../../../../documentos/actions";

export function FavoritoButton({
  workspaceId,
  documentoId,
  favoritoInicial,
}: {
  workspaceId: string;
  documentoId: string;
  favoritoInicial: boolean;
}) {
  const [favorito, setFavorito] = useState(favoritoInicial);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const novoValorOtimista = !favorito;
        setFavorito(novoValorOtimista);
        startTransition(async () => {
          try {
            const novo = await toggleFavoritoAction(workspaceId, documentoId);
            setFavorito(novo);
          } catch {
            setFavorito(!novoValorOtimista);
          }
        });
      }}
      title={favorito ? "Remover dos favoritos" : "Favoritar"}
      className="shrink-0 text-muted-foreground hover:text-amber-500 disabled:opacity-50"
    >
      <Star className={cn("size-3.5", favorito && "fill-amber-400 text-amber-400")} />
    </button>
  );
}
