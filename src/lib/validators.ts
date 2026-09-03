import { z } from "zod";

const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const codeRegex = /^[A-Z0-9]+$/;

export const workspaceCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(60).regex(slugRegex, "slug deve ser minúsculo, alfanumérico, separado por hífen"),
});

export const workspaceUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  slug: z.string().trim().min(1).max(60).regex(slugRegex).optional(),
});

export const workspaceRoleSchema = z.enum(["administrador", "coordenador", "lider_aprovador", "analista"]);

export const workspaceMemberAddSchema = z.object({
  email: z.string().trim().email(),
  role: workspaceRoleSchema,
  // Só usados quando o email ainda não tem conta — cria o usuário na hora.
  nome: z.string().trim().min(1).optional(),
  senha: z.string().min(6, "A senha provisória precisa ter pelo menos 6 caracteres.").optional(),
});

export const workspaceMemberRoleUpdateSchema = z.object({
  role: workspaceRoleSchema,
});

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().email(),
});

export const passwordResetConfirmSchema = z.object({
  email: z.string().trim().email(),
  token: z.string().trim().min(1),
  novaSenha: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres."),
});

export const projetoCreateSchema = z.object({
  code: z.string().trim().min(1).max(20).regex(codeRegex, "code deve ser maiúsculo/numérico, ex: GNSE"),
  name: z.string().trim().min(1).max(200),
});

export const projetoUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
});

export const obraCreateSchema = z.object({
  code: z.string().trim().min(1).max(20).regex(codeRegex, "code deve ser maiúsculo/numérico, ex: CTO"),
  name: z.string().trim().min(1).max(200),
});

export const obraUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
});

export const obraMemberAddSchema = z.object({
  email: z.string().trim().email(),
});

export const statusDocumentoSchema = z.enum([
  "previsto",
  "em_elaboracao",
  "devolvido_correcao",
  "em_revisao_interna",
  "aprovacao_lider_tecnico",
  "aguardando_envio_ged",
  "em_analise_cliente",
  "aprovado",
  "aprovado_com_comentarios",
  "reprovado",
  "liberado_para_construcao",
  "devolvido_pelo_cliente",
  "informativo",
  "cancelado",
]);

export const documentoCreateSchema = z.object({
  obraId: z.string().trim().min(1),
  disciplinaId: z.string().trim().min(1),
  secaoId: z.string().trim().min(1),
  faseId: z.string().trim().min(1),
  tipoDocumentoId: z.string().trim().min(1),
  descricao: z.string().trim().min(1).max(500),
  responsavelId: z.string().trim().min(1).optional(),
  dataBaseline: z.string().date().optional(),
  dataReprogramada: z.string().date().optional(),
  dataPrevista: z.string().date().optional(),
});

export const documentoUpdateSchema = z.object({
  descricao: z.string().trim().min(1).max(500).optional(),
  responsavelId: z.string().trim().min(1).nullable().optional(),
  dataBaseline: z.string().date().nullable().optional(),
  dataReprogramada: z.string().date().nullable().optional(),
  dataPrevista: z.string().date().nullable().optional(),
  secaoId: z.string().trim().min(1).optional(),
});

export const documentoListQuerySchema = z.object({
  obraId: z.string().trim().min(1).optional(),
  disciplinaId: z.string().trim().min(1).optional(),
  secaoId: z.string().trim().min(1).optional(),
  status: statusDocumentoSchema.optional(),
});

export const documentoAgrupadoQuerySchema = z.object({
  status: statusDocumentoSchema.optional(),
  disciplinaId: z.string().trim().min(1).optional(),
  secaoId: z.string().trim().min(1).optional(),
  somenteEmAtraso: z.boolean().optional(),
  recentes: z.boolean().optional(),
  comRetrabalho: z.boolean().optional(),
});

export const documentoBulkMoverSchema = z.object({
  documentoIds: z.array(z.string().trim().min(1)).min(1, "Selecione pelo menos um documento."),
  secaoId: z.string().trim().min(1),
});

export const documentoBulkAtribuirSchema = z.object({
  documentoIds: z.array(z.string().trim().min(1)).min(1, "Selecione pelo menos um documento."),
  responsavelId: z.string().trim().min(1),
});

export const documentoBulkReprogramarSchema = z.object({
  documentoIds: z.array(z.string().trim().min(1)).min(1, "Selecione pelo menos um documento."),
  dataReprogramada: z.string().date(),
});

export const transicaoStatusSchema = z.object({
  novoStatus: statusDocumentoSchema,
});

// letra/numero são opcionais aqui porque a revisão As Built não precisa deles
// (o service decide sozinho); quando são exigidos, o service valida a presença.
export const revisaoCreateSchema = z.object({
  letra: z
    .string()
    .trim()
    .regex(/^[A-Z]$/, "letra deve ser uma única letra maiúscula")
    .optional(),
  numero: z.coerce.number().int().min(0).optional(),
});

export const comentarioCreateSchema = z.object({
  corpo: z.string().trim().min(1).max(4000),
  anexoNome: z.string().trim().min(1).optional(),
  anexoUrl: z.string().trim().url().optional(),
  marcarPendenciaCliente: z.boolean().optional(),
});

export const contatoExternoCreateSchema = z.object({
  nome: z.string().trim().min(1).max(200),
  email: z.string().trim().email(),
  empresa: z.string().trim().min(1).max(200).optional(),
  telefone: z.string().trim().min(1).max(40).optional(),
});

export const grdCreateSchema = z.object({
  obraId: z.string().trim().min(1),
  dataEmissao: z.string().date(),
  documentoIds: z.array(z.string().trim().min(1)).min(1, "Selecione pelo menos um documento."),
  contatoExternoIds: z.array(z.string().trim().min(1)).min(1, "Selecione pelo menos um destinatário."),
});

export const grdListQuerySchema = z.object({
  obraId: z.string().trim().min(1).optional(),
  status: z.enum(["pendente", "respondido", "cancelado"]).optional(),
});

export const grdResponderSchema = z.object({
  arquivoRespostaNome: z.string().trim().min(1).optional(),
  arquivoRespostaUrl: z.string().trim().url(),
});

const booleanQueryParam = z
  .enum(["true", "false"])
  .transform((v) => v === "true")
  .optional();

export const fornecedorCreateSchema = z.object({
  nome: z.string().trim().min(1).max(200),
  cnpj: z.string().trim().min(1).max(30).optional(),
  email: z.string().trim().email().optional(),
  telefone: z.string().trim().min(1).max(40).optional(),
});

export const itemSuprimentoCreateSchema = z.object({
  obraId: z.string().trim().min(1),
  disciplinaId: z.string().trim().min(1),
  codigo: z.string().trim().min(1).max(60).optional(),
  categoria: z.string().trim().min(1).max(120).optional(),
  nome: z.string().trim().min(1).max(300),
  quantidade: z.coerce.number().positive(),
  unidadeMedida: z.string().trim().min(1).max(20),
  valorUnitario: z.coerce.number().nonnegative(),
  fornecedorId: z.string().trim().min(1).optional(),
  prazoPrevisto: z.string().date().optional(),
  critico: z.boolean().optional(),
  numeroPedidoCompra: z.string().trim().min(1).max(60).optional(),
  documentoIds: z.array(z.string().trim().min(1)).optional(),
});

export const itemSuprimentoUpdateSchema = z.object({
  disciplinaId: z.string().trim().min(1).optional(),
  codigo: z.string().trim().min(1).max(60).nullable().optional(),
  categoria: z.string().trim().min(1).max(120).nullable().optional(),
  nome: z.string().trim().min(1).max(300).optional(),
  quantidade: z.coerce.number().positive().optional(),
  unidadeMedida: z.string().trim().min(1).max(20).optional(),
  valorUnitario: z.coerce.number().nonnegative().optional(),
  fornecedorId: z.string().trim().min(1).nullable().optional(),
  prazoPrevisto: z.string().date().nullable().optional(),
  critico: z.boolean().optional(),
  numeroPedidoCompra: z.string().trim().min(1).max(60).nullable().optional(),
});

export const itemSuprimentoListQuerySchema = z.object({
  obraId: z.string().trim().min(1).optional(),
  disciplinaId: z.string().trim().min(1).optional(),
  fornecedorId: z.string().trim().min(1).optional(),
  comprado: booleanQueryParam,
  critico: booleanQueryParam,
});

export const fotoCreateSchema = z.object({
  legenda: z.string().trim().min(1).max(500).optional(),
  documentoIds: z.array(z.string().trim().min(1)).optional(),
  itemConhecimentoIds: z.array(z.string().trim().min(1)).optional(),
});

export const marcarCompradoSchema = z.object({
  compradoEm: z.string().date().optional(),
});

export const copiaControladaCreateSchema = z.object({
  documentoId: z.string().trim().min(1),
  detentorId: z.string().trim().min(1),
});

export const copiaControladaListQuerySchema = z.object({
  obraId: z.string().trim().min(1).optional(),
  documentoId: z.string().trim().min(1).optional(),
});

const tipoItemConhecimentoSchema = z.enum(["rfi", "rnc"]);
const statusItemConhecimentoSchema = z.enum(["aberta", "em_analise", "respondida", "em_correcao", "corrigida", "verificada", "fechada"]);

export const itemConhecimentoCreateSchema = z.object({
  tipo: tipoItemConhecimentoSchema,
  titulo: z.string().trim().min(1).max(300),
  descricao: z.string().trim().min(1).max(4000),
  categoriaId: z.string().trim().min(1).optional(),
  documentoIds: z.array(z.string().trim().min(1)).optional(),
});

export const itemConhecimentoAvancarSchema = z.object({
  resposta: z.string().trim().min(1).max(4000).optional(),
  acaoCorretiva: z.string().trim().min(1).max(4000).optional(),
});

export const itemConhecimentoListQuerySchema = z.object({
  obraId: z.string().trim().min(1).optional(),
  tipo: tipoItemConhecimentoSchema.optional(),
  status: statusItemConhecimentoSchema.optional(),
  categoriaId: z.string().trim().min(1).optional(),
  documentoId: z.string().trim().min(1).optional(),
  busca: z.string().trim().min(1).optional(),
  apenasLicoesAprendidas: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});
