import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/errors";
import { revisaoCreateSchema } from "@/lib/validators";
import { getDocumentoOrThrow } from "@/services/documentoService";
import { createRevisao, listRevisoes } from "@/services/revisaoService";
import { requireObraAccess } from "@/services/permissions";

type Params = { params: Promise<{ workspaceId: string; documentoId: string }> };

export const GET = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, documentoId } = await params;
  const documento = await getDocumentoOrThrow(workspaceId, documentoId);
  await requireObraAccess(user.id, workspaceId, documento.obraId);
  const revisoes = await listRevisoes(workspaceId, documentoId);
  return NextResponse.json({ data: revisoes });
});

// Bucket B: nova revisão. Letra/número são digitados pelo cliente e validados contra
// a única sequência válida (ver src/lib/statusGraph.ts nextRevisionSpec) — exceto pra
// As Built, que não usa letra/número e é sempre auto-gerada.
export const POST = withErrorHandling(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, documentoId } = await params;
  const documento = await getDocumentoOrThrow(workspaceId, documentoId);
  await requireObraAccess(user.id, workspaceId, documento.obraId);
  const body = await req.json().catch(() => ({}));
  const input = revisaoCreateSchema.parse(body);
  const revisao = await createRevisao(workspaceId, documentoId, user.id, input);
  return NextResponse.json({ data: revisao }, { status: 201 });
});
