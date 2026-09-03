"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, FileText, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { ConferidoToggle } from "./conferido-toggle";
import { AddComentarioForm } from "./add-comentario-form";
import { TransitionStatusForm } from "./transition-status-form";
import { CreateRevisaoButton } from "./create-revisao-button";
import { ArquivoRevisaoUpload } from "./arquivo-revisao-upload";
import type { StatusDocumento, StatusDocumento as SD, ProximaRevisaoSpec } from "@/lib/statusGraph";

type Comentario = {
  id: string;
  corpo: string;
  anexoNome: string | null;
  anexoUrl: string | null;
  marcarPendenciaCliente: boolean;
  createdAt: Date;
};

type Revisao = {
  id: string;
  label: string | null;
  status: string;
  ehAsBuilt: boolean;
  letra: string | null;
  numero: number | null;
  arquivoOriginalNome: string | null;
  arquivoOriginalChave: string | null;
  arquivoPdfNome: string | null;
  arquivoPdfChave: string | null;
  conferido: boolean;
  conferidoPorNome: string | null;
  conferidoEm: Date | null;
  autorNome: string | null;
  enviadoClienteEm: Date | null;
  retornadoEm: Date | null;
  createdAt: Date;
};

function ArquivoCard({
  titulo,
  nome,
  url,
  upload,
}: {
  titulo: string;
  nome: string | null;
  url: string | null;
  upload?: { workspaceId: string; documentoId: string; revisaoId: string; tipo: "original" | "pdf" };
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
            {nome ?? "Abrir arquivo"}
          </a>
        ) : (
          <p className="text-sm text-muted-foreground">Sem arquivo anexado</p>
        )}
        {upload && (
          <ArquivoRevisaoUpload
            workspaceId={upload.workspaceId}
            documentoId={upload.documentoId}
            revisaoId={upload.revisaoId}
            tipo={upload.tipo}
            temArquivo={!!url}
          />
        )}
      </CardContent>
    </Card>
  );
}

function RevisaoCard({
  workspaceId,
  documentoId,
  revisao,
  ehAtual,
  labelAtual,
  aberta,
  onToggle,
  comentarios,
  validNextStatuses,
  proximaRevisaoSpec,
  cardRef,
}: {
  workspaceId: string;
  documentoId: string;
  revisao: Revisao;
  ehAtual: boolean;
  labelAtual: string | null;
  aberta: boolean;
  onToggle: () => void;
  comentarios: Comentario[];
  validNextStatuses: SD[];
  proximaRevisaoSpec: ProximaRevisaoSpec | null;
  cardRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div ref={cardRef} className={cn("rounded-lg border", ehAtual && "border-primary/30 bg-primary/5")}>
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 p-3 text-left">
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", aberta && "rotate-180")} />
        <Badge variant="outline" className="font-mono">
          {revisao.label}
        </Badge>
        <StatusBadge status={revisao.status as StatusDocumento} />
        {revisao.autorNome && (
          <span className="text-xs text-muted-foreground">
            {revisao.autorNome} · {new Date(revisao.createdAt).toLocaleDateString("pt-BR")}
          </span>
        )}
        <span className="flex-1" />
        {ehAtual ? (
          <Badge>ATUAL</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Superada · Rev {labelAtual ?? "—"}</span>
        )}
      </button>

      {aberta && (
        <div className="space-y-4 border-t p-3">
          {(revisao.enviadoClienteEm || revisao.retornadoEm) && (
            <p className="flex flex-wrap items-center gap-1 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              {revisao.enviadoClienteEm && (
                <span className="inline-flex items-center gap-1">
                  Enviado ao cliente em {new Date(revisao.enviadoClienteEm).toLocaleDateString("pt-BR")}
                  <Pencil className="size-3 shrink-0" />
                </span>
              )}
              {revisao.enviadoClienteEm && revisao.retornadoEm && <span>·</span>}
              {revisao.retornadoEm && (
                <span className="inline-flex items-center gap-1">
                  retornou em {new Date(revisao.retornadoEm).toLocaleDateString("pt-BR")}
                  <Pencil className="size-3 shrink-0" />
                </span>
              )}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <ArquivoCard
              titulo="Documento original"
              nome={revisao.arquivoOriginalNome}
              url={revisao.arquivoOriginalChave ? `/api/workspaces/${workspaceId}/revisoes/${revisao.id}/arquivo?tipo=original` : null}
              upload={ehAtual ? { workspaceId, documentoId, revisaoId: revisao.id, tipo: "original" } : undefined}
            />
            <ArquivoCard
              titulo="PDF"
              nome={revisao.arquivoPdfNome}
              url={revisao.arquivoPdfChave ? `/api/workspaces/${workspaceId}/revisoes/${revisao.id}/arquivo?tipo=pdf` : null}
              upload={ehAtual ? { workspaceId, documentoId, revisaoId: revisao.id, tipo: "pdf" } : undefined}
            />
          </div>

          <ConferidoToggle
            workspaceId={workspaceId}
            documentoId={documentoId}
            revisaoId={revisao.id}
            conferido={revisao.conferido}
            conferidoPorNome={revisao.conferidoPorNome}
            conferidoEm={revisao.conferidoEm}
          />

          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">Comentários ({revisao.label})</p>
            {comentarios.length > 0 && (
              <ul className="mb-3 space-y-2">
                {comentarios.map((c) => (
                  <li key={c.id} className="rounded-md border p-3 text-sm">
                    <p>{c.corpo}</p>
                    {c.anexoUrl && (
                      <a href={c.anexoUrl} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-primary hover:underline">
                        📎 {c.anexoNome ?? "Anexo"}
                      </a>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(c.createdAt).toLocaleString("pt-BR")}
                      {c.marcarPendenciaCliente && " · Pendência do cliente"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {ehAtual ? (
              <AddComentarioForm workspaceId={workspaceId} documentoId={documentoId} revisaoId={revisao.id} />
            ) : (
              comentarios.length === 0 && <p className="text-sm text-muted-foreground">Nenhum comentário nesta revisão.</p>
            )}
          </div>

          {ehAtual && (
            <div className="flex flex-wrap items-end gap-2 border-t pt-3">
              <TransitionStatusForm workspaceId={workspaceId} documentoId={documentoId} revisaoId={revisao.id} validNextStatuses={validNextStatuses} />
              {proximaRevisaoSpec && <CreateRevisaoButton workspaceId={workspaceId} documentoId={documentoId} spec={proximaRevisaoSpec} />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function RevisoesAccordion({
  workspaceId,
  documentoId,
  revisoes,
  comentariosPorRevisao,
  currentRevisionId,
  validNextStatuses,
  proximaRevisaoSpec,
}: {
  workspaceId: string;
  documentoId: string;
  revisoes: Revisao[];
  comentariosPorRevisao: Record<string, Comentario[]>;
  currentRevisionId: string | null;
  validNextStatuses: SD[];
  proximaRevisaoSpec: ProximaRevisaoSpec | null;
}) {
  // A mais recente (revisoes[0], já vem ordenada desc) começa aberta; o resto, fechado.
  const [abertas, setAbertas] = useState<Set<string>>(new Set(revisoes[0] ? [revisoes[0].id] : []));
  const cardEls = useRef<Record<string, HTMLDivElement | null>>({});

  // Uma nova revisão pode surgir sem remontar o componente (revalidatePath re-renderiza
  // com as mesmas props do React, não desmonta) — garante que ela também abra por padrão.
  useEffect(() => {
    if (currentRevisionId) setAbertas((prev) => (prev.has(currentRevisionId) ? prev : new Set(prev).add(currentRevisionId)));
  }, [currentRevisionId]);

  function alternar(id: string) {
    setAbertas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function irParaRevisao(id: string) {
    setAbertas((prev) => new Set(prev).add(id));
    requestAnimationFrame(() => cardEls.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  const labelAtual = revisoes.find((r) => r.id === currentRevisionId)?.label ?? null;

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <FileText className="size-4 shrink-0 text-foreground" />
        <p className="text-sm">
          <span className="font-bold">Revisões e arquivos</span>
          <span className="text-muted-foreground"> — visualize e baixe os documentos aqui</span>
        </p>
      </div>

      {revisoes.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="font-semibold tracking-wide uppercase">Histórico</span>
          {revisoes.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => irParaRevisao(r.id)}
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <span className={cn("size-1.5 rounded-full", r.id === currentRevisionId ? "bg-primary" : "bg-muted-foreground/50")} />
              {r.label}
            </button>
          ))}
        </div>
      )}

      {revisoes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma revisão criada ainda.</p>
      ) : (
        <div className="space-y-2">
          {revisoes.map((r) => (
            <RevisaoCard
              key={r.id}
              workspaceId={workspaceId}
              documentoId={documentoId}
              revisao={r}
              ehAtual={r.id === currentRevisionId}
              labelAtual={labelAtual}
              aberta={abertas.has(r.id)}
              onToggle={() => alternar(r.id)}
              comentarios={comentariosPorRevisao[r.id] ?? []}
              validNextStatuses={r.id === currentRevisionId ? validNextStatuses : []}
              proximaRevisaoSpec={r.id === currentRevisionId ? proximaRevisaoSpec : null}
              cardRef={(el) => {
                cardEls.current[r.id] = el;
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
