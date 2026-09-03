"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  Pencil,
  Building2,
  Layers,
  CalendarDays,
  CalendarClock,
  UserCog,
  UserSearch,
  Clock,
  History,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import type { StatusDocumento } from "@/lib/statusGraph";
import { updateDocumentoAction, type ActionState } from "../actions";

const initialActionState: ActionState = { status: "idle" };

function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

function Campo({ icon: Icon, label, valor }: { icon: LucideIcon; label: string; valor: string }) {
  return (
    <div>
      <p className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-sm">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        {valor}
      </p>
    </div>
  );
}

function CampoEditavel({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <div className="mt-0.5 flex items-center gap-1.5">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        {children}
      </div>
    </div>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{titulo}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export function DocumentoCabecalho({
  workspaceId,
  documentoId,
  projetoId,
  obraId,
  obraNome,
  disciplinaNome,
  codigoCompleto,
  descricao,
  status,
  secaoId,
  secaoNome,
  secoesDaDisciplina,
  dataBaseline,
  dataReprogramada,
  responsavelId,
  responsavelNome,
  obraUsers,
}: {
  workspaceId: string;
  documentoId: string;
  projetoId: string;
  obraId: string;
  obraNome: string;
  disciplinaNome: string;
  codigoCompleto: string;
  descricao: string;
  status: StatusDocumento;
  secaoId: string;
  secaoNome: string;
  secoesDaDisciplina: { id: string; name: string }[];
  dataBaseline: string | null;
  dataReprogramada: string | null;
  responsavelId: string | null;
  responsavelNome: string | null;
  obraUsers: { userId: string; name: string }[];
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [state, formAction, pending] = useActionState(updateDocumentoAction, initialActionState);

  useEffect(() => {
    if (state.status === "success") {
      setEditando(false);
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só dispara uma vez por submissão bem-sucedida
  }, [state]);

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href={`/workspaces/${workspaceId}/projetos/${projetoId}/obras/${obraId}`} className="hover:text-foreground hover:underline">
          {obraNome}
        </Link>
        <ChevronRight className="size-3.5 shrink-0" />
        <span>{disciplinaNome}</span>
        <ChevronRight className="size-3.5 shrink-0" />
        <span className="font-mono">{codigoCompleto}</span>
      </div>

      <form action={formAction}>
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <input type="hidden" name="documentoId" value={documentoId} />

        <div className="mb-3 flex items-center gap-2">
          {editando ? (
            <select
              name="secaoId"
              defaultValue={secaoId}
              className="h-6 rounded-full border bg-transparent px-2 text-xs"
            >
              {secoesDaDisciplina.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : (
            <Badge variant="outline">{secaoNome}</Badge>
          )}
          <StatusBadge status={status} />
        </div>

        <div className="mb-2 flex items-center gap-3">
          {editando ? (
            <Input name="codigoCompleto" defaultValue={codigoCompleto} required maxLength={120} className="h-9 w-72 font-mono text-xl font-bold" />
          ) : (
            <h1 className="font-mono text-xl font-bold">{codigoCompleto}</h1>
          )}

          {editando ? (
            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Salvando..." : "Salvar"}
              </Button>
              <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => setEditando(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setEditando(true)}
            >
              <Pencil className="size-3.5" />
              Editar
            </Button>
          )}
        </div>

        {editando ? (
          <Input name="descricao" defaultValue={descricao} required maxLength={500} className="mb-1" />
        ) : (
          <p className="mb-6 text-foreground">{descricao}</p>
        )}
        {editando && (
          <p className="mb-6 text-xs text-muted-foreground">
            O código normalmente é gerado automático — editar aqui não afeta a numeração dos próximos documentos, só evite
            duplicar um código já usado.
          </p>
        )}
        {state.status === "error" && <p className="mb-4 text-sm text-destructive">{state.error}</p>}

        <div className="mb-8 rounded-lg border p-4">
          <p className="mb-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Informações gerais</p>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <Grupo titulo="Classificação">
              <Campo icon={Building2} label="Projeto" valor={obraNome} />
              <Campo icon={Layers} label="Disciplina" valor={disciplinaNome} />
            </Grupo>
            <Grupo titulo="Prazos">
              {editando ? (
                <>
                  <CampoEditavel icon={CalendarDays} label="Baseline">
                    <Input name="dataBaseline" type="date" defaultValue={dataBaseline ?? ""} className="h-7 text-sm" />
                  </CampoEditavel>
                  <CampoEditavel icon={CalendarClock} label="Reprogramada">
                    <Input name="dataReprogramada" type="date" defaultValue={dataReprogramada ?? ""} className="h-7 text-sm" />
                  </CampoEditavel>
                </>
              ) : (
                <>
                  <Campo icon={CalendarDays} label="Baseline" valor={formatarData(dataBaseline)} />
                  <Campo icon={CalendarClock} label="Reprogramada" valor={formatarData(dataReprogramada)} />
                </>
              )}
            </Grupo>
            <Grupo titulo="Responsáveis">
              {editando ? (
                <CampoEditavel icon={UserCog} label="Responsável">
                  <select name="responsavelId" defaultValue={responsavelId ?? ""} className="h-7 rounded-md border bg-transparent px-1.5 text-sm">
                    <option value="">Sem responsável</option>
                    {obraUsers.map((u) => (
                      <option key={u.userId} value={u.userId}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </CampoEditavel>
              ) : (
                <Campo icon={UserCog} label="Responsável" valor={responsavelNome ?? "—"} />
              )}
              <Campo icon={UserSearch} label="Análise" valor="—" />
            </Grupo>
            <Grupo titulo="Esforço">
              <Campo icon={Clock} label="Tempo estimado" valor="—" />
              <Campo icon={History} label="Tempo rastreado" valor="—" />
            </Grupo>
          </div>
        </div>
      </form>
    </div>
  );
}
