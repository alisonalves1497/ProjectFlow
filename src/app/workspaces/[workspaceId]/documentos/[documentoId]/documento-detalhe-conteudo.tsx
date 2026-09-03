import Link from "next/link";
import { getDocumentoOrThrow } from "@/services/documentoService";
import { getObraOrThrow, listObraAccessUsers } from "@/services/obraService";
import { listRevisoesComConferidoPorNome } from "@/services/revisaoService";
import { listComentarios } from "@/services/comentarioService";
import { listTimelineComAutorNome } from "@/services/timelineService";
import { listAnexosPorRevisao } from "@/services/anexoService";
import { listDisciplinas, listCategoriasConhecimento, listDisciplinasComSecoesPorObra } from "@/services/catalogoService";
import { nextRevisionSpec, tipoDaRevisao, validNextStatuses, type StatusDocumento } from "@/lib/statusGraph";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentoCabecalho } from "./documento-cabecalho";
import { RevisoesAccordion } from "./revisoes-accordion";
import { LinhaDoTempoTab } from "./linha-do-tempo-tab";
import { AnexosTab } from "./anexos-tab";
import { listFotosPorDocumento } from "@/services/fotoService";
import { UploadFotoDocumentoForm } from "../../projetos/[projetoId]/obras/[obraId]/fotos/upload-foto-documento-form";
import { listItensConhecimento } from "@/services/conhecimentoService";
import { TIPO_LABELS, type StatusItemConhecimento, type TipoItemConhecimento } from "@/lib/conhecimentoStatusGraph";
import { ConhecimentoStatusBadge } from "@/components/conhecimento-status-badge";
import { CreateItemDialog } from "../../projetos/[projetoId]/obras/[obraId]/conhecimento/create-item-dialog";

export async function DocumentoDetalheConteudo({ workspaceId, documentoId }: { workspaceId: string; documentoId: string }) {
  const documento = await getDocumentoOrThrow(workspaceId, documentoId);
  const obra = await getObraOrThrow(workspaceId, documento.obraId);

  const [revisoes, timeline, disciplinas, obraUsers, fotos, itensConhecimento, categoriasConhecimento, disciplinasComSecoes] =
    await Promise.all([
      listRevisoesComConferidoPorNome(workspaceId, documentoId),
      listTimelineComAutorNome(workspaceId, documentoId),
      listDisciplinas(workspaceId),
      listObraAccessUsers(workspaceId, documento.obraId),
      listFotosPorDocumento(workspaceId, documentoId),
      listItensConhecimento(workspaceId, { documentoId }),
      listCategoriasConhecimento(workspaceId),
      listDisciplinasComSecoesPorObra(documento.obraId),
    ]);

  const comentariosPorRevisaoEntries = await Promise.all(
    revisoes.map(async (r) => [r.id, await listComentarios(workspaceId, r.id)] as const)
  );
  const comentariosPorRevisao = Object.fromEntries(comentariosPorRevisaoEntries);

  const anexosPorRevisaoEntries = await Promise.all(
    revisoes.map(async (r) => [r.id, await listAnexosPorRevisao(workspaceId, r.id)] as const)
  );
  const anexosPorRevisao = Object.fromEntries(anexosPorRevisaoEntries);
  const revisaoLabelPorId = Object.fromEntries(revisoes.map((r) => [r.id, r.label ?? "—"]));

  const revisaoAtual = revisoes.find((r) => r.id === documento.currentRevisionId) ?? null;
  const tipoAtual = revisaoAtual ? tipoDaRevisao({ ehAsBuilt: revisaoAtual.ehAsBuilt, numero: revisaoAtual.numero }) : null;
  const nextStatuses = revisaoAtual && tipoAtual ? validNextStatuses(tipoAtual, revisaoAtual.status as StatusDocumento) : [];
  const proximaRevisaoSpec = nextRevisionSpec(
    revisaoAtual
      ? { ehAsBuilt: revisaoAtual.ehAsBuilt, letra: revisaoAtual.letra, numero: revisaoAtual.numero, status: revisaoAtual.status as StatusDocumento }
      : null
  );

  const disciplinaNome = disciplinas.find((d) => d.id === documento.disciplinaId)?.name ?? "—";
  const responsavelNome = obraUsers.find((u) => u.userId === documento.responsavelId)?.name ?? null;
  const secoesDaDisciplina = disciplinasComSecoes.find((d) => d.disciplinaId === documento.disciplinaId)?.secoes ?? [];
  const secaoNome = secoesDaDisciplina.find((s) => s.id === documento.secaoId)?.name ?? "—";

  return (
    <div>
      <DocumentoCabecalho
        workspaceId={workspaceId}
        documentoId={documentoId}
        projetoId={obra.projetoId}
        obraId={documento.obraId}
        obraNome={obra.name}
        disciplinaNome={disciplinaNome}
        codigoCompleto={documento.codigoCompleto}
        descricao={documento.descricao}
        status={documento.status as StatusDocumento}
        secaoId={documento.secaoId}
        secaoNome={secaoNome}
        secoesDaDisciplina={secoesDaDisciplina}
        dataBaseline={documento.dataBaseline}
        dataReprogramada={documento.dataReprogramada}
        responsavelId={documento.responsavelId}
        responsavelNome={responsavelNome}
        obraUsers={obraUsers.map((u) => ({ userId: u.userId, name: u.name ?? u.email }))}
      />

      <Tabs defaultValue="revisoes">
        <TabsList variant="line" className="mb-6 w-full justify-start border-b">
          <TabsTrigger value="revisoes">Revisões ({revisoes.length})</TabsTrigger>
          <TabsTrigger value="linha-do-tempo">Linha do tempo</TabsTrigger>
          <TabsTrigger value="rfi-rnc">RFI/RNC</TabsTrigger>
          <TabsTrigger value="anexos">Anexos</TabsTrigger>
          <TabsTrigger value="fotos">Fotos</TabsTrigger>
        </TabsList>

        <TabsContent value="revisoes">
          <RevisoesAccordion
            workspaceId={workspaceId}
            documentoId={documentoId}
            revisoes={revisoes}
            comentariosPorRevisao={comentariosPorRevisao}
            currentRevisionId={documento.currentRevisionId}
            validNextStatuses={nextStatuses}
            proximaRevisaoSpec={proximaRevisaoSpec}
          />
        </TabsContent>

        <TabsContent value="linha-do-tempo">
          <LinhaDoTempoTab
            eventos={timeline}
            revisaoLabelPorId={revisaoLabelPorId}
            documentoStatus={documento.status as StatusDocumento}
            labelAtual={revisaoAtual?.label ?? null}
          />
        </TabsContent>

        <TabsContent value="rfi-rnc">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">RFI/RNC</h2>
            <CreateItemDialog
              workspaceId={workspaceId}
              projetoId={obra.projetoId}
              obraId={documento.obraId}
              documentos={[]}
              categorias={categoriasConhecimento}
              revalidatePathTarget={`/workspaces/${workspaceId}/documentos/${documentoId}`}
              documentoIdFixo={documentoId}
            />
          </div>
          {itensConhecimento.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma RFI/RNC vinculada ainda.</p>
          ) : (
            <ul className="space-y-1">
              {itensConhecimento.map((i) => (
                <li key={i.id} className="flex items-center gap-3 text-sm">
                  <Link
                    href={`/workspaces/${workspaceId}/projetos/${obra.projetoId}/obras/${documento.obraId}/conhecimento/${i.id}`}
                    className="font-mono text-xs hover:underline"
                  >
                    {i.codigoCompleto}
                  </Link>
                  <span className="text-muted-foreground">{TIPO_LABELS[i.tipo as TipoItemConhecimento]}</span>
                  <span>{i.titulo}</span>
                  <ConhecimentoStatusBadge status={i.status as StatusItemConhecimento} />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="anexos">
          <AnexosTab
            workspaceId={workspaceId}
            documentoId={documentoId}
            revisoes={revisoes.map((r) => ({ id: r.id, label: r.label }))}
            anexosPorRevisao={anexosPorRevisao}
            revisaoIdInicial={documento.currentRevisionId}
          />
        </TabsContent>

        <TabsContent value="fotos">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Fotos</h2>
          {fotos.length === 0 ? (
            <p className="mb-3 text-sm text-muted-foreground">Nenhuma foto vinculada ainda.</p>
          ) : (
            <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {fotos.map((f) => (
                <div key={f.id} className="overflow-hidden rounded-md border">
                  {/* eslint-disable-next-line @next/next/no-img-element -- imagem vem de uma rota de streaming autenticada */}
                  <img
                    src={`/api/workspaces/${workspaceId}/fotos/${f.id}/arquivo`}
                    alt={f.legenda ?? f.arquivoNome}
                    className="aspect-square w-full object-cover"
                  />
                  {f.legenda && <p className="truncate p-1 text-xs text-muted-foreground">{f.legenda}</p>}
                </div>
              ))}
            </div>
          )}
          <UploadFotoDocumentoForm
            workspaceId={workspaceId}
            obraId={documento.obraId}
            documentoId={documentoId}
            revalidatePathTarget={`/workspaces/${workspaceId}/documentos/${documentoId}`}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
