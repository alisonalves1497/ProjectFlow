import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/errors";
import { fornecedorCreateSchema } from "@/lib/validators";
import { createFornecedor, listFornecedores } from "@/services/fornecedorService";
import { requireWorkspaceRole } from "@/services/permissions";

type Params = { params: Promise<{ workspaceId: string }> };

export const GET = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId } = await params;
  await requireWorkspaceRole(user.id, workspaceId, ["administrador", "coordenador", "lider_aprovador", "analista"]);
  const fornecedores = await listFornecedores(workspaceId);
  return NextResponse.json({ data: fornecedores });
});

export const POST = withErrorHandling(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId } = await params;
  await requireWorkspaceRole(user.id, workspaceId, ["administrador", "coordenador", "lider_aprovador", "analista"]);
  const input = fornecedorCreateSchema.parse(await req.json());
  const fornecedor = await createFornecedor(workspaceId, input);
  return NextResponse.json({ data: fornecedor }, { status: 201 });
});
