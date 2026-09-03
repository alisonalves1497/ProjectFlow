"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadFotosAction, type ActionState } from "./actions";

const initialActionState: ActionState = { status: "idle" };

export function UploadFotoDocumentoForm({
  workspaceId,
  obraId,
  documentoId,
  revalidatePathTarget,
}: {
  workspaceId: string;
  obraId: string;
  documentoId: string;
  revalidatePathTarget: string;
}) {
  const [state, formAction, pending] = useActionState(uploadFotosAction, initialActionState);
  const [legenda, setLegenda] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const arquivosInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.status === "error") toast.error(state.error);
    if (state.status === "success" && formRef.current) {
      formRef.current.reset();
      setLegenda("");
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="obraId" value={obraId} />
      <input type="hidden" name="documentoIds" value={documentoId} />
      <input type="hidden" name="revalidatePathTarget" value={revalidatePathTarget} />
      <input type="hidden" name="legenda" value={legenda} />
      <Input
        value={legenda}
        onChange={(e) => setLegenda(e.target.value)}
        placeholder="Legenda (opcional, aplicada às próximas fotos)..."
        className="min-w-0 flex-1"
      />

      {/* dois inputs de arquivo escondidos: um com capture (câmera do dispositivo), outro sem (seletor comum) */}
      <input
        ref={cameraInputRef}
        type="file"
        name="arquivos"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={() => formRef.current?.requestSubmit()}
      />
      <input
        ref={arquivosInputRef}
        type="file"
        name="arquivos"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={() => formRef.current?.requestSubmit()}
      />

      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => cameraInputRef.current?.click()}>
        <Camera className="size-4" /> Câmera
      </Button>
      <Button type="button" size="sm" disabled={pending} onClick={() => arquivosInputRef.current?.click()}>
        <Upload className="size-4" /> {pending ? "Enviando..." : "Arquivos"}
      </Button>
    </form>
  );
}
