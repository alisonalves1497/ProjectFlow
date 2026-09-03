import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/errors";
import { itemConhecimentoCreateSchema, itemConhecimentoListQuerySchema } from "@/lib/validators";
import { createItemConhecimento, listItensConhecimento } from "@/services/conhecimentoService";
import { requireObraAccess } from "@/services/permissions";

type Params = { params: Promise<{ workspaceId: string }> };

export const GET = withErrorHandling(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId } = await params;

  const { searchParams } = new URL(req.url);
  const filters = itemConhecimentoListQuerySchema.parse({
    obraId: searchParams.get("obraId") ?? undefined,
    tipo: searchParams.get("tipo") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    categoriaId: searchParams.get("categoriaId") ?? undefined,
    documentoId: searchParams.get("documentoId") ?? undefined,
    busca: searchParams.get("busca") ?? undefined,
    apenasLicoesAprendidas: searchParams.get("apenasLicoesAprendidas") ?? undefined,
  });
  if (!filters.obraId) {
    return NextResponse.json({ error: { code: "OBRA_ID_REQUIRED", message: "obraId é obrigatório." } }, { status: 400 });
  }
  await requireObraAccess(user.id, workspaceId, filters.obraId);

  const itens = await listItensConhecimento(workspaceId, filters);
  return NextResponse.json({ data: itens });
});

export const POST = withErrorHandling(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId } = await params;
  const body = await req.json();
  const obraId = String(body.obraId ?? "");
  await requireObraAccess(user.id, workspaceId, obraId);

  const input = itemConhecimentoCreateSchema.parse(body);
  const item = await createItemConhecimento(workspaceId, obraId, user.id, input);
  return NextResponse.json({ data: item }, { status: 201 });
});
