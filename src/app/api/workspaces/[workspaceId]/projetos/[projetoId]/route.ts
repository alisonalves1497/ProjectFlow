import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/errors";
import { projetoUpdateSchema } from "@/lib/validators";
import { getProjetoOrThrow, softDeleteProjeto, updateProjeto } from "@/services/projetoService";
import { requireWorkspaceRole } from "@/services/permissions";

type Params = { params: Promise<{ workspaceId: string; projetoId: string }> };

export const GET = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, projetoId } = await params;
  await requireWorkspaceRole(user.id, workspaceId, ["administrador", "coordenador", "lider_aprovador", "analista"]);
  const projeto = await getProjetoOrThrow(workspaceId, projetoId);
  return NextResponse.json({ data: projeto });
});

export const PATCH = withErrorHandling(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, projetoId } = await params;
  await requireWorkspaceRole(user.id, workspaceId, ["administrador", "coordenador"]);
  const input = projetoUpdateSchema.parse(await req.json());
  const projeto = await updateProjeto(workspaceId, projetoId, input);
  return NextResponse.json({ data: projeto });
});

export const DELETE = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, projetoId } = await params;
  await requireWorkspaceRole(user.id, workspaceId, ["administrador", "coordenador"]);
  await softDeleteProjeto(workspaceId, projetoId);
  return new NextResponse(null, { status: 204 });
});
