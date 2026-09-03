"use client";

import { useState } from "react";
import { Filter, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { AlertaAtualizacoes } from "@/components/alerta-atualizacoes";
import { FiltrosPopover } from "./filtros-popover";
import { ColunasPopover } from "./colunas-popover";
import { LegendaPopover } from "./legenda-popover";
import { BuscaBox } from "./busca-box";
import { DocumentosLista, COLUNAS_PADRAO } from "./documentos-lista";
import type { GrupoSecaoDocumentos } from "@/services/documentoService";
import type { StatusDocumento } from "@/lib/statusGraph";

type StatusOption = [StatusDocumento, string];
type Disciplina = { disciplinaId: string; code: string; name: string; secoes: { id: string; name: string }[] };
type SecaoOption = { id: string; label: string };
type Usuario = { userId: string; name: string | null; email: string };
type Contato = { id: string; nome: string; email: string };

const ICONE_QUADRADO = "flex size-8 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent hover:text-foreground";

export function DocumentosPainel({
  workspaceId,
  projetoId,
  obraId,
  grupos,
  agrupado,
  disciplinas,
  usuarios,
  contatos,
  documentosAtualizadosIds,
  contadores,
  statusOptions,
  secaoOptions,
  status,
  disciplinaId,
  secaoId,
  somenteEmAtraso,
  recentes,
  comRetrabalho,
  favoritos,
  toggleAgrupadoHref,
  filtroAtivo,
  contadoresToggles,
  podeGerenciar,
}: {
  workspaceId: string;
  projetoId: string;
  obraId: string;
  grupos: GrupoSecaoDocumentos[];
  agrupado: boolean;
  disciplinas: Disciplina[];
  usuarios: Usuario[];
  contatos: Contato[];
  documentosAtualizadosIds: Set<string>;
  contadores: { total: number; emElaboracao: number; liberados: number; emAtraso: number; naoConformes: number };
  statusOptions: StatusOption[];
  secaoOptions: SecaoOption[];
  status?: string;
  disciplinaId?: string;
  secaoId?: string;
  somenteEmAtraso: boolean;
  recentes: boolean;
  comRetrabalho: boolean;
  favoritos: boolean;
  toggleAgrupadoHref: string;
  filtroAtivo: boolean;
  contadoresToggles: { somenteEmAtraso: number; recentes: number; comRetrabalho: number; favoritos: number; paraObra: number };
  podeGerenciar: boolean;
}) {
  const [colunasVisiveis, setColunasVisiveis] = useState(COLUNAS_PADRAO);
  const [secoesColapsadas, setSecoesColapsadas] = useState<Set<string>>(new Set());
  const [filtroAberto, setFiltroAberto] = useState(false);

  const todasSecoesIds = grupos.map((g) => g.secaoId);
  const tudoColapsado = todasSecoesIds.length > 0 && todasSecoesIds.every((id) => secoesColapsadas.has(id));

  function toggleSecao(secaoId: string) {
    setSecoesColapsadas((prev) => {
      const next = new Set(prev);
      if (next.has(secaoId)) next.delete(secaoId);
      else next.add(secaoId);
      return next;
    });
  }

  function alternarTodas() {
    setSecoesColapsadas(tudoColapsado ? new Set() : new Set(todasSecoesIds));
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span>
            <span className="font-semibold">{contadores.total}</span> <span className="text-muted-foreground">Total</span>
          </span>
          <span>
            <span className="font-semibold">{contadores.emElaboracao}</span> <span className="text-muted-foreground">Em elaboração</span>
          </span>
          <span>
            <span className="font-semibold">{contadores.liberados}</span> <span className="text-muted-foreground">Liberados</span>
          </span>
          <span>
            <span className="font-semibold">{contadores.emAtraso}</span> <span className="text-muted-foreground">Em atraso</span>
          </span>
          <span>
            <span className="font-semibold">{contadores.naoConformes}</span>{" "}
            <span className="text-muted-foreground">Não conformes</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltroAberto((v) => !v)}
            className={
              filtroAtivo || filtroAberto ? `relative ${ICONE_QUADRADO} border-primary bg-primary/10 text-primary` : `relative ${ICONE_QUADRADO}`
            }
            title="Filtros"
          >
            <Filter className="size-4" />
            {filtroAtivo && <span className="absolute -top-1 -right-1 size-1.5 rounded-full bg-primary" />}
          </button>
          <ColunasPopover value={colunasVisiveis} onChange={setColunasVisiveis} className={ICONE_QUADRADO} />
          {agrupado && grupos.length > 0 && (
            <button
              type="button"
              onClick={alternarTodas}
              className={ICONE_QUADRADO}
              title={tudoColapsado ? "Expandir todas as seções" : "Recolher todas as seções"}
            >
              {tudoColapsado ? <ChevronsUpDown className="size-4" /> : <ChevronsDownUp className="size-4" />}
            </button>
          )}
          <LegendaPopover className={ICONE_QUADRADO} />
          <BuscaBox className={ICONE_QUADRADO} />
        </div>
      </div>

      {filtroAberto && (
        <FiltrosPopover
          statusOptions={statusOptions}
          disciplinas={disciplinas}
          secaoOptions={secaoOptions}
          status={status}
          disciplinaId={disciplinaId}
          secaoId={secaoId}
          somenteEmAtraso={somenteEmAtraso}
          recentes={recentes}
          comRetrabalho={comRetrabalho}
          favoritos={favoritos}
          agrupado={agrupado}
          toggleAgrupadoHref={toggleAgrupadoHref}
          contadoresToggles={contadoresToggles}
        />
      )}

      <AlertaAtualizacoes quantidade={documentosAtualizadosIds.size} />

      <DocumentosLista
        workspaceId={workspaceId}
        projetoId={projetoId}
        obraId={obraId}
        grupos={grupos}
        agrupado={agrupado}
        disciplinas={disciplinas}
        usuarios={usuarios}
        contatos={contatos}
        documentosAtualizadosIds={documentosAtualizadosIds}
        colunasVisiveis={colunasVisiveis}
        secoesColapsadas={secoesColapsadas}
        onToggleSecao={toggleSecao}
        filtroAtivo={filtroAtivo}
        podeGerenciar={podeGerenciar}
      />
    </>
  );
}
