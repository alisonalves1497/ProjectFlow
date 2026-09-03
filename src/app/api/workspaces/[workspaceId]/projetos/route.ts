import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/errors";
import { projetoCreateSchema } from "@/lib/validators";
import { createProjeto, listProjetos } from "@/services/projetoService";
import { requireWorkspaceRole } from "@/services/permissions";

type Params = { params: Promise<{ workspaceId: string }> };

export const GET = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId } = await params;
  await requireWorkspaceRole(user.id, workspaceId, ["administrador", "coordenador", "lider_aprovador", "analista"]);
  const projetos = await listProjetos(workspaceId);
  return NextResponse.json({ data: projetos });
});

export const POST = withErrorHandling(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId } = await params;
  await requireWorkspaceRole(user.id, workspaceId, ["administrador", "coordenador"]);
  const input = projetoCreateSchema.parse(await req.json());
  const projeto = await createProjeto(workspaceId, input);
  return NextResponse.json({ data: projeto }, { status: 201 });
});
