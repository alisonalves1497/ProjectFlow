import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getObraOrThrow, listObraAccessUsers } from "@/services/obraService";
import { requireObraAccess, getWorkspaceRole } from "@/services/permissions";
import { listDocumentosAgrupadosPorSecao } from "@/services/documentoService";
import { listDisciplinasComSecoesPorObra, listSecoesPadraoDoWorkspace, listFases, listTiposDocumento } from "@/services/catalogoService";
import { listContatosExternos } from "@/services/contatoExternoService";
import { getArvoreProjetos, flattenArvoreParaOpcoes } from "@/services/navegacaoService";
import { getUltimaVisita, registrarVisita } from "@/services/visitaService";
import { ApiError } from "@/lib/errors";
import { STATUS_LABELS, type StatusDocumento } from "@/lib/statusGraph";
import { ObraSwitcher } from "@/components/obra-switcher";
import { CreateDocumentoDialog } from "../../../../documentos/create-documento-dialog";
import { DocumentosPainel } from "./documentos-painel";
import { ObraMaisOpcoes } from "./obra-mais-opcoes";

type Params = {
  params: Promise<{ workspaceId: string; projetoId: string; obraId: string }>;
  searchParams: Promise<{
    status?: string;
    disciplinaId?: string;
    secaoId?: string;
    responsavelId?: string;
    somenteEmAtraso?: string;
    recentes?: string;
    comRetrabalho?: string;
    favoritos?: string;
    q?: string;
    agrupado?: string;
  }>;
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS) as [StatusDocumento, string][];

export default async function ObraDocumentosPage({ params, searchParams }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId, projetoId, obraId } = await params;
  const sp = await searchParams;

  try {
    await requireObraAccess(session.user.id, workspaceId, obraId);
  } catch (err) {
    if (err instanceof ApiError) redirect(`/workspaces/${workspaceId}/projetos/${projetoId}`);
    throw err;
  }

  const obra = await getObraOrThrow(workspaceId, obraId);
  const role = await getWorkspaceRole(session.user.id, workspaceId);
  const canManage = role === "administrador" || role === "coordenador";
  const agrupado = sp.agrupado !== "0";

  const [grupos, gruposBase, disciplinasComSecoes, secoesPadrao, fases, tipos, usuarios, contatos, arvore] = await Promise.all([
    listDocumentosAgrupadosPorSecao(workspaceId, obraId, session.user.id, {
      status: sp.status as StatusDocumento | undefined,
      disciplinaId: sp.disciplinaId || undefined,
      secaoId: sp.secaoId || undefined,
      responsavelId: sp.responsavelId || undefined,
      somenteEmAtraso: sp.somenteEmAtraso === "1",
      recentes: sp.recentes === "1",
      comRetrabalho: sp.comRetrabalho === "1",
      favoritos: sp.favoritos === "1",
      busca: sp.q || undefined,
    }),
    // Mesmo escopo (status/disciplina/seção/responsável/busca), mas sem os toggles — usado só
    // pra calcular as contagens dos próprios toggles no popover de filtro ("Somente em atraso
    // (N)" etc.), que precisam refletir "se eu ligar isso, quantos apareceriam" independente
    // uns dos outros.
    listDocumentosAgrupadosPorSecao(workspaceId, obraId, session.user.id, {
      status: sp.status as StatusDocumento | undefined,
      disciplinaId: sp.disciplinaId || undefined,
      secaoId: sp.secaoId || undefined,
      responsavelId: sp.responsavelId || undefined,
      busca: sp.q || undefined,
    }),
    listDisciplinasComSecoesPorObra(obraId),
    listSecoesPadraoDoWorkspace(workspaceId),
    listFases(workspaceId),
    listTiposDocumento(workspaceId),
    listObraAccessUsers(workspaceId, obraId),
    listContatosExternos(workspaceId),
    getArvoreProjetos(workspaceId, session.user.id),
  ]);

  const secaoOptions = disciplinasComSecoes.flatMap((d) => d.secoes.map((s) => ({ id: s.id, label: `${d.name} - ${s.name}` })));

  // Só pro form de "Novo documento": além das Seções que essa Obra já tem de verdade, oferece
  // também os nomes sugeridos do catálogo (workspace inteiro) que ainda não viraram Seção
  // aqui — prefixados pra createDocumentoAction saber que precisa materializar na hora.
  const disciplinasParaNovoDocumento = disciplinasComSecoes.map((d) => {
    const nomesJaReais = new Set(d.secoes.map((s) => s.name));
    const sugeridas = secoesPadrao
      .filter((sp) => sp.disciplinaId === d.disciplinaId && !nomesJaReais.has(sp.name))
      .map((sp) => ({ id: `padrao:${sp.id}`, name: sp.name }));
    return { ...d, secoes: [...d.secoes, ...sugeridas] };
  });
  const obraOpcoes = flattenArvoreParaOpcoes(arvore);

  const disciplinaSelecionada = disciplinasComSecoes.find((d) => d.disciplinaId === sp.disciplinaId);
  const subtitulo = disciplinaSelecionada ? disciplinaSelecionada.name : "Todas as disciplinas";

  const todosDocumentos = grupos.flatMap((g) => g.documentos);
  const todosDocumentosBase = gruposBase.flatMap((g) => g.documentos);
  const contadoresToggles = {
    somenteEmAtraso: todosDocumentosBase.filter((d) => d.emAtraso).length,
    recentes: todosDocumentosBase.filter((d) => d.recentes).length,
    comRetrabalho: todosDocumentosBase.filter((d) => d.comRetrabalho).length,
    favoritos: todosDocumentosBase.filter((d) => d.favorito).length,
    paraObra: todosDocumentosBase.length,
  };
  const contadores = {
    total: todosDocumentos.length,
    emElaboracao: todosDocumentos.filter((d) => d.status === "em_elaboracao").length,
    liberados: todosDocumentos.filter((d) => d.status === "liberado_para_construcao").length,
    emAtraso: todosDocumentos.filter((d) => d.emAtraso).length,
    naoConformes: todosDocumentos.filter((d) => d.naoConforme).length,
  };

  // "Visita" = abrir esta lista (obra inteira, não por disciplina). Lê a visita anterior pra
  // calcular o que mudou de status/revisão desde então, e só depois grava a visita de agora —
  // se gravasse antes, o próprio carregamento já "consumiria" o alerta que estava mostrando.
  const ultimaVisita = await getUltimaVisita(session.user.id, obraId);
  const documentosAtualizadosIds = new Set(
    ultimaVisita ? todosDocumentos.filter((d) => d.statusUpdatedAt > ultimaVisita).map((d) => d.id) : []
  );
  await registrarVisita(session.user.id, obraId);

  const toggleAgrupadoParams = new URLSearchParams();
  if (sp.status) toggleAgrupadoParams.set("status", sp.status);
  if (sp.disciplinaId) toggleAgrupadoParams.set("disciplinaId", sp.disciplinaId);
  if (sp.secaoId) toggleAgrupadoParams.set("secaoId", sp.secaoId);
  if (sp.somenteEmAtraso) toggleAgrupadoParams.set("somenteEmAtraso", sp.somenteEmAtraso);
  if (sp.recentes) toggleAgrupadoParams.set("recentes", sp.recentes);
  if (sp.comRetrabalho) toggleAgrupadoParams.set("comRetrabalho", sp.comRetrabalho);
  if (sp.favoritos) toggleAgrupadoParams.set("favoritos", sp.favoritos);
  if (sp.q) toggleAgrupadoParams.set("q", sp.q);
  toggleAgrupadoParams.set("agrupado", agrupado ? "0" : "1");

  const filtroAtivo = Boolean(
    sp.status ||
      sp.disciplinaId ||
      sp.secaoId ||
      sp.responsavelId ||
      sp.somenteEmAtraso === "1" ||
      sp.recentes === "1" ||
      sp.comRetrabalho === "1" ||
      sp.favoritos === "1" ||
      sp.q
  );

  return (
    <div className="p-8">
      <div className="mb-4 grid grid-cols-1 items-start gap-4 sm:grid-cols-[1fr_auto_1fr]">
        <div>
          <h1 className="text-2xl font-semibold">Lista de Documentos</h1>
          <p className="mt-1 text-xs text-muted-foreground">‹ {subtitulo}</p>
        </div>
        <div className="justify-self-start sm:justify-self-center">
          <ObraSwitcher workspaceId={workspaceId} obras={obraOpcoes} obraAtualId={obraId} disciplinaAtual={disciplinaSelecionada?.name} />
        </div>
        <div className="flex items-center gap-2 justify-self-start sm:justify-self-end">
          <CreateDocumentoDialog workspaceId={workspaceId} projetoId={projetoId} obraId={obraId} disciplinas={disciplinasParaNovoDocumento} fases={fases} tipos={tipos} />
          {canManage && <ObraMaisOpcoes workspaceId={workspaceId} projetoId={projetoId} obraId={obraId} obraNome={obra.name} />}
        </div>
      </div>

      <DocumentosPainel
        workspaceId={workspaceId}
        projetoId={projetoId}
        obraId={obraId}
        grupos={grupos}
        agrupado={agrupado}
        disciplinas={disciplinasComSecoes}
        usuarios={usuarios}
        contatos={contatos}
        documentosAtualizadosIds={documentosAtualizadosIds}
        contadores={contadores}
        statusOptions={STATUS_OPTIONS}
        secaoOptions={secaoOptions}
        status={sp.status}
        disciplinaId={sp.disciplinaId}
        secaoId={sp.secaoId}
        responsavelId={sp.responsavelId}
        somenteEmAtraso={sp.somenteEmAtraso === "1"}
        recentes={sp.recentes === "1"}
        comRetrabalho={sp.comRetrabalho === "1"}
        favoritos={sp.favoritos === "1"}
        toggleAgrupadoHref={`?${toggleAgrupadoParams.toString()}`}
        filtroAtivo={filtroAtivo}
        contadoresToggles={contadoresToggles}
        podeGerenciar={canManage}
      />
    </div>
  );
}
