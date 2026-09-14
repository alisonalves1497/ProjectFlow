"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { STATUS_LABELS, type StatusDocumento } from "@/lib/statusGraph";
import {
  setStatusDiretoAction,
  updateDocumentoAction,
  type ActionState,
} from "@/app/workspaces/[workspaceId]/documentos/actions";

// Células editáveis inline reaproveitadas em qualquer tabela de documentos que precise
// delas — hoje: Lista de Documentos de uma Obra e Meus Documentos (que junta várias obras
// numa lista só). Todas seguem o mesmo padrão: badge/texto normal → clica → vira um
// campinho → salva sozinho (sem botão "Salvar") → toast com "Desfazer".

const initialActionState: ActionState = { status: "idle" };

type Usuario = { userId: string; name: string | null; email: string };

// Reconstrói um FormData igual ao que o <form> das células editáveis manda — usado pra
// re-disparar a mesma action com o valor ANTERIOR quando clica em "Desfazer" no toast.
function formDataDoDesfazer(campos: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [chave, valor] of Object.entries(campos)) fd.set(chave, valor);
  return fd;
}

// Campos hidden comuns às células que chamam updateDocumentoAction.
function CamposOcultosDocumento({
  workspaceId,
  projetoId,
  obraId,
  documentoId,
}: {
  workspaceId: string;
  projetoId: string;
  obraId: string;
  documentoId: string;
}) {
  return (
    <>
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="projetoId" value={projetoId} />
      <input type="hidden" name="obraId" value={obraId} />
      <input type="hidden" name="documentoId" value={documentoId} />
    </>
  );
}

// Pedido explícito do time: trocar o Status direto na linha da tabela, sem passar pela
// revisão. Só administrador/coordenador vê o lápis — pra quem não pode, é só o badge normal.
export function StatusCell({
  workspaceId,
  projetoId,
  obraId,
  documentoId,
  status,
  podeGerenciar,
}: {
  workspaceId: string;
  projetoId: string;
  obraId: string;
  documentoId: string;
  status: StatusDocumento;
  podeGerenciar: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [statusAnterior, setStatusAnterior] = useState(status);
  const [state, formAction, pending] = useActionState(setStatusDiretoAction, initialActionState);
  // `state` do useActionState não volta sozinho pra "idle" depois de um sucesso — fechar
  // aqui SEM resetar editando via effect fazia o lápis travar pra sempre depois da primeira
  // troca (mostrandoSelect derivado de state.status ficava preso em "success" e nunca mais
  // reabria o select, só um F5 recarregava o estado do zero).
  useEffect(() => {
    if (state.status === "success") {
      setEditando(false);
      const valorAntes = statusAnterior;
      toast("Status alterado.", {
        action: {
          label: "Desfazer",
          onClick: () =>
            formAction(formDataDoDesfazer({ workspaceId, projetoId, obraId, documentoId, status: valorAntes })),
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só dispara uma vez por submissão bem-sucedida
  }, [state]);

  if (!podeGerenciar) return <StatusBadge status={status} />;

  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => {
          setStatusAnterior(status);
          setEditando(true);
        }}
        className="group/status inline-flex items-center gap-1"
      >
        <StatusBadge status={status} />
        <Pencil className="size-3 shrink-0 text-muted-foreground opacity-0 group-hover/status:opacity-100" />
      </button>
    );
  }

  return (
    <form action={formAction} className="max-w-full">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="projetoId" value={projetoId} />
      <input type="hidden" name="obraId" value={obraId} />
      <input type="hidden" name="documentoId" value={documentoId} />
      <select
        name="status"
        defaultValue={status}
        disabled={pending}
        autoFocus
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        // w-full + min-w-0: sem isso o <select> pega a largura do texto mais comprido das
        // opções ("Aprovação do líder técnico"...) e estoura pra fora da célula, que corta
        // ele (a TableCell tem overflow-hidden) — precisa ficar preso na largura da coluna.
        className="h-7 w-full min-w-0 max-w-full rounded-md border bg-transparent px-1 text-xs"
      >
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {state.status === "error" && <p className="mt-0.5 text-xs text-destructive">{state.error}</p>}
    </form>
  );
}

export function ResponsavelCell({
  workspaceId,
  projetoId,
  obraId,
  documentoId,
  responsavelId,
  responsavelNome,
  usuarios,
}: {
  workspaceId: string;
  projetoId: string;
  obraId: string;
  documentoId: string;
  responsavelId: string | null;
  responsavelNome: string | null;
  usuarios: Usuario[];
}) {
  const [editando, setEditando] = useState(false);
  const [responsavelIdAnterior, setResponsavelIdAnterior] = useState(responsavelId);
  const [state, formAction, pending] = useActionState(updateDocumentoAction, initialActionState);
  useEffect(() => {
    if (state.status === "success") {
      setEditando(false);
      const valorAntes = responsavelIdAnterior;
      toast("Responsável alterado.", {
        action: {
          label: "Desfazer",
          onClick: () =>
            formAction(
              formDataDoDesfazer({ workspaceId, projetoId, obraId, documentoId, responsavelId: valorAntes ?? "" })
            ),
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só dispara uma vez por submissão bem-sucedida
  }, [state]);

  // Responsável pode ser alterado por qualquer pessoa com acesso à obra (pedido do time) —
  // sem o gate de administrador/coordenador que as outras células inline têm.
  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => {
          setResponsavelIdAnterior(responsavelId);
          setEditando(true);
        }}
        className="group/resp inline-flex items-center gap-1"
      >
        <span className={responsavelNome ? "" : "text-muted-foreground"}>{responsavelNome ?? "—"}</span>
        <Pencil className="size-3 shrink-0 text-muted-foreground opacity-0 group-hover/resp:opacity-100" />
      </button>
    );
  }

  return (
    <form action={formAction} className="max-w-full">
      <CamposOcultosDocumento workspaceId={workspaceId} projetoId={projetoId} obraId={obraId} documentoId={documentoId} />
      <select
        name="responsavelId"
        defaultValue={responsavelId ?? ""}
        disabled={pending}
        autoFocus
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-7 w-full min-w-0 max-w-full rounded-md border bg-transparent px-1 text-xs"
      >
        <option value="">Ninguém</option>
        {usuarios.map((u) => (
          <option key={u.userId} value={u.userId}>
            {u.name ?? u.email}
          </option>
        ))}
      </select>
      {state.status === "error" && <p className="mt-0.5 text-xs text-destructive">{state.error}</p>}
    </form>
  );
}

export function PrazoCell({
  workspaceId,
  projetoId,
  obraId,
  documentoId,
  dataPrevista,
  reprogramado,
  podeGerenciar,
}: {
  workspaceId: string;
  projetoId: string;
  obraId: string;
  documentoId: string;
  dataPrevista: string | null;
  reprogramado: boolean;
  podeGerenciar: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [anterior, setAnterior] = useState({ campo: reprogramado ? "dataReprogramada" : "dataPrevista", valor: dataPrevista });
  const [state, formAction, pending] = useActionState(updateDocumentoAction, initialActionState);
  useEffect(() => {
    if (state.status === "success") {
      setEditando(false);
      const valorAntes = anterior;
      toast("Prazo alterado.", {
        action: {
          label: "Desfazer",
          onClick: () =>
            formAction(
              formDataDoDesfazer({ workspaceId, projetoId, obraId, documentoId, [valorAntes.campo]: valorAntes.valor ?? "" })
            ),
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só dispara uma vez por submissão bem-sucedida
  }, [state]);

  // +"T00:00:00": sem isso, `new Date("2026-12-25")` é interpretado como meia-noite UTC, que em
  // fusos atrás do UTC (ex: Brasil) vira o dia anterior ao formatar pro horário local.
  const rotulo = dataPrevista ? new Date(dataPrevista + "T00:00:00").toLocaleDateString("pt-BR") : "—";

  if (!podeGerenciar) return <>{rotulo}</>;

  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => {
          setAnterior({ campo: reprogramado ? "dataReprogramada" : "dataPrevista", valor: dataPrevista });
          setEditando(true);
        }}
        className="group/prazo inline-flex items-center gap-1"
      >
        <span className={dataPrevista ? "" : "text-muted-foreground"}>{rotulo}</span>
        <Pencil className="size-3 shrink-0 text-muted-foreground opacity-0 group-hover/prazo:opacity-100" />
      </button>
    );
  }

  // Se já tem data reprogramada, o Prazo mostrado vem dela — editar aqui tem que continuar
  // mexendo nessa mesma data, não na baseline original (dataPrevista), senão a edição
  // pareceria "não fazer nada" (a reprogramada continuaria mandando no valor exibido).
  const campo = reprogramado ? "dataReprogramada" : "dataPrevista";

  return (
    <form action={formAction} className="max-w-full">
      <CamposOcultosDocumento workspaceId={workspaceId} projetoId={projetoId} obraId={obraId} documentoId={documentoId} />
      <input
        type="date"
        name={campo}
        defaultValue={dataPrevista ?? ""}
        disabled={pending}
        autoFocus
        onBlur={(e) => e.currentTarget.value && e.currentTarget.form?.requestSubmit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.form?.requestSubmit();
        }}
        className="h-7 w-full min-w-0 max-w-full rounded-md border bg-transparent px-1 text-xs"
      />
      {state.status === "error" && <p className="mt-0.5 text-xs text-destructive">{state.error}</p>}
    </form>
  );
}

export function RevisaoCell({
  workspaceId,
  projetoId,
  obraId,
  documentoId,
  revisaoLabel,
  temRevisao,
  podeGerenciar,
}: {
  workspaceId: string;
  projetoId: string;
  obraId: string;
  documentoId: string;
  revisaoLabel: string | null;
  temRevisao: boolean;
  podeGerenciar: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [revisaoAnterior, setRevisaoAnterior] = useState(revisaoLabel);
  const [state, formAction, pending] = useActionState(updateDocumentoAction, initialActionState);
  useEffect(() => {
    if (state.status === "success") {
      setEditando(false);
      const valorAntes = revisaoAnterior;
      toast("Revisão alterada.", {
        action: {
          label: "Desfazer",
          onClick: () =>
            formAction(
              formDataDoDesfazer({ workspaceId, projetoId, obraId, documentoId, revisaoExterna: valorAntes ?? "" })
            ),
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só dispara uma vez por submissão bem-sucedida
  }, [state]);

  // Documento com revisão de verdade (currentRevisionId) tem o rótulo governado pelo fluxo
  // de revisões (letra/número, aprovação...) — não dá pra sobrescrever isso livremente aqui,
  // só o rótulo "solto" que vem de sincronização externa (GED) quando não tem revisão ainda.
  if (!podeGerenciar || temRevisao) return <>{revisaoLabel ?? "—"}</>;

  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => {
          setRevisaoAnterior(revisaoLabel);
          setEditando(true);
        }}
        className="group/rev inline-flex items-center gap-1"
      >
        <span className={revisaoLabel ? "" : "text-muted-foreground"}>{revisaoLabel ?? "—"}</span>
        <Pencil className="size-3 shrink-0 text-muted-foreground opacity-0 group-hover/rev:opacity-100" />
      </button>
    );
  }

  return (
    <form action={formAction} className="max-w-full">
      <CamposOcultosDocumento workspaceId={workspaceId} projetoId={projetoId} obraId={obraId} documentoId={documentoId} />
      <input
        type="text"
        name="revisaoExterna"
        defaultValue={revisaoLabel ?? ""}
        disabled={pending}
        autoFocus
        onBlur={(e) => e.currentTarget.form?.requestSubmit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.form?.requestSubmit();
        }}
        className="h-7 w-full min-w-0 max-w-full rounded-md border bg-transparent px-1 font-mono text-xs"
      />
      {state.status === "error" && <p className="mt-0.5 text-xs text-destructive">{state.error}</p>}
    </form>
  );
}

// GED: campo solto (não tem fluxo por trás, diferente de Revisão) que guarda de onde veio
// o documento no GED do cliente — sempre editável por quem gerencia, sem exceção de "já
// tem revisão" (que só se aplica à Revisão).
export function GedCell({
  workspaceId,
  projetoId,
  obraId,
  documentoId,
  gedOrigem,
  podeGerenciar,
}: {
  workspaceId: string;
  projetoId: string;
  obraId: string;
  documentoId: string;
  gedOrigem: string | null;
  podeGerenciar: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [gedAnterior, setGedAnterior] = useState(gedOrigem);
  const [state, formAction, pending] = useActionState(updateDocumentoAction, initialActionState);
  useEffect(() => {
    if (state.status === "success") {
      setEditando(false);
      const valorAntes = gedAnterior;
      toast("GED alterado.", {
        action: {
          label: "Desfazer",
          onClick: () =>
            formAction(formDataDoDesfazer({ workspaceId, projetoId, obraId, documentoId, gedOrigem: valorAntes ?? "" })),
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só dispara uma vez por submissão bem-sucedida
  }, [state]);

  if (!podeGerenciar) return <>{gedOrigem ?? "—"}</>;

  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => {
          setGedAnterior(gedOrigem);
          setEditando(true);
        }}
        className="group/ged inline-flex items-center gap-1"
      >
        <span className={gedOrigem ? "" : "text-muted-foreground"}>{gedOrigem ?? "—"}</span>
        <Pencil className="size-3 shrink-0 text-muted-foreground opacity-0 group-hover/ged:opacity-100" />
      </button>
    );
  }

  return (
    <form action={formAction} className="max-w-full">
      <CamposOcultosDocumento workspaceId={workspaceId} projetoId={projetoId} obraId={obraId} documentoId={documentoId} />
      <input
        type="text"
        name="gedOrigem"
        defaultValue={gedOrigem ?? ""}
        disabled={pending}
        autoFocus
        onBlur={(e) => e.currentTarget.form?.requestSubmit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.form?.requestSubmit();
        }}
        className="h-7 w-full min-w-0 max-w-full rounded-md border bg-transparent px-1 text-xs"
      />
      {state.status === "error" && <p className="mt-0.5 text-xs text-destructive">{state.error}</p>}
    </form>
  );
}
