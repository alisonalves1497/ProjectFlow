"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { attachDocumentoAction, detachDocumentoAction, type ActionState } from "../../actions";

const initialActionState: ActionState = { status: "idle" };

type DocumentoVinculado = { id: string; documentoId: string; codigoCompleto: string; descricao: string };
type DocumentoOpcao = { id: string; codigoCompleto: string; descricao: string };

function AttachForm({
  workspaceId,
  projetoId,
  obraId,
  itemId,
  opcoes,
}: {
  workspaceId: string;
  projetoId: string;
  obraId: string;
  itemId: string;
  opcoes: DocumentoOpcao[];
}) {
  const [state, formAction, pending] = useActionState(attachDocumentoAction, initialActionState);
  const [documentoId, setDocumentoId] = useState(opcoes[0]?.id ?? "");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "error") toast.error(state.error);
  }, [state]);

  if (opcoes.length === 0) return <p className="text-sm text-muted-foreground">Nenhum outro documento disponível pra vincular.</p>;

  return (
    <form ref={formRef} action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="projetoId" value={projetoId} />
      <input type="hidden" name="obraId" value={obraId} />
      <input type="hidden" name="itemId" value={itemId} />
      <select
        name="documentoId"
        value={documentoId}
        onChange={(e) => setDocumentoId(e.target.value)}
        className="h-9 flex-1 rounded-md border bg-transparent px-3 text-sm"
      >
        {opcoes.map((d) => (
          <option key={d.id} value={d.id}>
            {d.codigoCompleto} — {d.descricao}
          </option>
        ))}
      </select>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Vinculando..." : "Vincular"}
      </Button>
    </form>
  );
}

function DetachButton({
  workspaceId,
  projetoId,
  obraId,
  itemId,
  documentoId,
}: {
  workspaceId: string;
  projetoId: string;
  obraId: string;
  itemId: string;
  documentoId: string;
}) {
  const [state, formAction, pending] = useActionState(detachDocumentoAction, initialActionState);

  useEffect(() => {
    if (state.status === "error") toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="projetoId" value={projetoId} />
      <input type="hidden" name="obraId" value={obraId} />
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="documentoId" value={documentoId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "Removendo..." : "Remover"}
      </Button>
    </form>
  );
}

export function DocumentosVinculadosManager({
  workspaceId,
  projetoId,
  obraId,
  itemId,
  vinculados,
  todosDaObra,
}: {
  workspaceId: string;
  projetoId: string;
  obraId: string;
  itemId: string;
  vinculados: DocumentoVinculado[];
  todosDaObra: DocumentoOpcao[];
}) {
  const vinculadosIds = new Set(vinculados.map((v) => v.documentoId));
  const disponiveis = todosDaObra.filter((d) => !vinculadosIds.has(d.id));

  return (
    <div className="space-y-3">
      {vinculados.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum documento vinculado.</p>
      ) : (
        <ul className="space-y-2">
          {vinculados.map((v) => (
            <li key={v.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>
                <span className="mr-2 font-mono text-xs">{v.codigoCompleto}</span>
                <span className="text-muted-foreground">{v.descricao}</span>
              </span>
              <DetachButton workspaceId={workspaceId} projetoId={projetoId} obraId={obraId} itemId={itemId} documentoId={v.documentoId} />
            </li>
          ))}
        </ul>
      )}
      <AttachForm workspaceId={workspaceId} projetoId={projetoId} obraId={obraId} itemId={itemId} opcoes={disponiveis} />
    </div>
  );
}
