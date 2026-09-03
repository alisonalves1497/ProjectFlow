import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/errors";
import { contatoExternoCreateSchema } from "@/lib/validators";
import { createContatoExterno, listContatosExternos } from "@/services/contatoExternoService";
import { requireWorkspaceRole } from "@/services/permissions";

type Params = { params: Promise<{ workspaceId: string }> };

export const GET = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId } = await params;
  await requireWorkspaceRole(user.id, workspaceId, ["administrador", "coordenador", "lider_aprovador", "analista"]);
  const contatos = await listContatosExternos(workspaceId);
  return NextResponse.json({ data: contatos });
});

export const POST = withErrorHandling(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId } = await params;
  await requireWorkspaceRole(user.id, workspaceId, ["administrador", "coordenador", "lider_aprovador", "analista"]);
  const input = contatoExternoCreateSchema.parse(await req.json());
  const contato = await createContatoExterno(workspaceId, input);
  return NextResponse.json({ data: contato }, { status: 201 });
});
