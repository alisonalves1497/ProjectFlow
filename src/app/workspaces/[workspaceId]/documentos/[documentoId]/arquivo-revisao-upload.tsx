"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { uploadArquivoRevisaoAction, type ActionState } from "../actions";

const initialActionState: ActionState = { status: "idle" };

export function ArquivoRevisaoUpload({
  workspaceId,
  documentoId,
  revisaoId,
  tipo,
  temArquivo,
}: {
  workspaceId: string;
  documentoId: string;
  revisaoId: string;
  tipo: "original" | "pdf";
  temArquivo: boolean;
}) {
  const [state, formAction, pending] = useActionState(uploadArquivoRevisaoAction, initialActionState);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "error") toast.error(state.error);
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="mt-1">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="documentoId" value={documentoId} />
      <input type="hidden" name="revisaoId" value={revisaoId} />
      <input type="hidden" name="tipo" value={tipo} />
      <input
        ref={inputRef}
        type="file"
        name="arquivo"
        className="hidden"
        accept={tipo === "pdf" ? "application/pdf" : undefined}
        onChange={() => formRef.current?.requestSubmit()}
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
      >
        <Upload className="size-3" />
        {pending ? "Enviando..." : temArquivo ? "Substituir arquivo" : "Enviar arquivo"}
      </button>
    </form>
  );
}
