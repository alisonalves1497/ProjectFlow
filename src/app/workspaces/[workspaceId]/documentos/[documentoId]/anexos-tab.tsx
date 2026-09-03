"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Paperclip, UploadCloud, X, FileIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uploadAnexosAction, deleteAnexoAction, type ActionState } from "../actions";

const initialActionState: ActionState = { status: "idle" };

type Anexo = { id: string; arquivoNome: string; arquivoTamanho: number; createdAt: Date };

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DeleteAnexoButton({ workspaceId, documentoId, anexoId }: { workspaceId: string; documentoId: string; anexoId: string }) {
  const [state, formAction, pending] = useActionState(deleteAnexoAction, initialActionState);

  useEffect(() => {
    if (state.status === "error") toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="documentoId" value={documentoId} />
      <input type="hidden" name="anexoId" value={anexoId} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
        title="Remover anexo"
      >
        <X className="size-3.5" />
      </button>
    </form>
  );
}

export function AnexosTab({
  workspaceId,
  documentoId,
  revisoes,
  anexosPorRevisao,
  revisaoIdInicial,
}: {
  workspaceId: string;
  documentoId: string;
  revisoes: { id: string; label: string | null }[];
  anexosPorRevisao: Record<string, Anexo[]>;
  revisaoIdInicial: string | null;
}) {
  const [revisaoId, setRevisaoId] = useState(revisaoIdInicial ?? revisoes[0]?.id ?? "");
  const [arrastando, setArrastando] = useState(false);
  const [state, formAction, pending] = useActionState(uploadAnexosAction, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.status === "error") toast.error(state.error);
    if (state.status === "success" && inputRef.current) inputRef.current.value = "";
  }, [state]);

  const anexos = anexosPorRevisao[revisaoId] ?? [];

  function enviarArquivos(files: FileList | File[]) {
    if (!inputRef.current) return;
    const dt = new DataTransfer();
    for (const f of files) dt.items.add(f);
    inputRef.current.files = dt.files;
    formRef.current?.requestSubmit();
  }

  if (revisoes.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma revisão criada ainda — anexos ficam vinculados a uma revisão.</p>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Paperclip className="size-4 shrink-0 text-foreground" />
          <p className="text-sm">
            <span className="font-bold">Anexos</span>
            <span className="text-muted-foreground"> — arquivos de apoio da revisão</span>
          </p>
        </div>
        <Select value={revisaoId} onValueChange={(value) => value && setRevisaoId(value)}>
          <SelectTrigger size="sm">
            <SelectValue>
              {(value: string) => {
                const r = revisoes.find((rv) => rv.id === value);
                return r ? `Rev. ${r.label} (${anexosPorRevisao[r.id]?.length ?? 0})` : "Selecione a revisão";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {revisoes.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                Rev. {r.label} ({anexosPorRevisao[r.id]?.length ?? 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <form ref={formRef} action={formAction}>
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <input type="hidden" name="documentoId" value={documentoId} />
        <input type="hidden" name="revisaoId" value={revisaoId} />
        <input
          ref={inputRef}
          type="file"
          name="arquivos"
          multiple
          className="hidden"
          onChange={(e) => e.currentTarget.files && e.currentTarget.files.length > 0 && formRef.current?.requestSubmit()}
        />
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastando(false);
            if (e.dataTransfer.files.length > 0) enviarArquivos(e.dataTransfer.files);
          }}
          className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            arrastando ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          <UploadCloud className="mb-1 size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {pending ? (
              "Enviando..."
            ) : (
              <>
                Arraste arquivos aqui ou{" "}
                <button type="button" onClick={() => inputRef.current?.click()} className="font-medium text-primary hover:underline">
                  clique para selecionar
                </button>
              </>
            )}
          </p>
          <p className="text-xs text-muted-foreground/70">Vários arquivos, qualquer formato — vinculados à revisão selecionada</p>
        </div>
      </form>

      {anexos.length > 0 && (
        <ul className="mt-4 space-y-1">
          {anexos.map((a) => (
            <li key={a.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <FileIcon className="size-4 shrink-0 text-muted-foreground" />
              <a
                href={`/api/workspaces/${workspaceId}/anexos/${a.id}/arquivo`}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-primary hover:underline"
              >
                {a.arquivoNome}
              </a>
              <span className="shrink-0 text-xs text-muted-foreground">{formatarTamanho(a.arquivoTamanho)}</span>
              <DeleteAnexoButton workspaceId={workspaceId} documentoId={documentoId} anexoId={a.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
