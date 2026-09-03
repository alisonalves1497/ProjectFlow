import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling, forbidden } from "@/lib/errors";
import { itemSuprimentoCreateSchema, itemSuprimentoListQuerySchema } from "@/lib/validators";
import { createItemSuprimento, listItensSuprimento } from "@/services/itemSuprimentoService";
import { listAccessibleObraIds } from "@/services/obraService";
import { getWorkspaceRole, requireObraAccess } from "@/services/permissions";

type Params = { params: Promise<{ workspaceId: string }> };

export const GET = withErrorHandling(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId } = await params;
  const role = await getWorkspaceRole(user.id, workspaceId);
  if (!role) throw forbidden("WORKSPACE_ACCESS_DENIED", "Você não é membro deste workspace.");

  const { searchParams } = new URL(req.url);
  const filters = itemSuprimentoListQuerySchema.parse({
    obraId: searchParams.get("obraId") ?? undefined,
    disciplinaId: searchParams.get("disciplinaId") ?? undefined,
    fornecedorId: searchParams.get("fornecedorId") ?? undefined,
    comprado: searchParams.get("comprado") ?? undefined,
    critico: searchParams.get("critico") ?? undefined,
  });

  const itens = await listItensSuprimento(workspaceId, filters);
  if (role === "administrador") {
    return NextResponse.json({ data: itens });
  }
  const accessibleIds = new Set(await listAccessibleObraIds(user.id));
  return NextResponse.json({ data: itens.filter((i) => accessibleIds.has(i.obraId)) });
});

export const POST = withErrorHandling(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId } = await params;
  const input = itemSuprimentoCreateSchema.parse(await req.json());
  await requireObraAccess(user.id, workspaceId, input.obraId);
  const item = await createItemSuprimento(workspaceId, user.id, input);
  return NextResponse.json({ data: item }, { status: 201 });
});
