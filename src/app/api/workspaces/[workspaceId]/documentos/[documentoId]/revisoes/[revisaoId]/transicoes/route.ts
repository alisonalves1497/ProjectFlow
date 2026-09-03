import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/errors";
import { transicaoStatusSchema } from "@/lib/validators";
import { getDocumentoOrThrow } from "@/services/documentoService";
import { transitionRevisaoStatus } from "@/services/revisaoService";
import { requireObraAccess } from "@/services/permissions";

type Params = { params: Promise<{ workspaceId: string; documentoId: string; revisaoId: string }> };

// Bucket A: transição in-place (muta a revisão atual, sem gerar letra/número novo).
export const POST = withErrorHandling(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, documentoId, revisaoId } = await params;
  const documento = await getDocumentoOrThrow(workspaceId, documentoId);
  await requireObraAccess(user.id, workspaceId, documento.obraId);
  const input = transicaoStatusSchema.parse(await req.json());
  const revisao = await transitionRevisaoStatus(workspaceId, documentoId, revisaoId, user.id, input.novoStatus);
  return NextResponse.json({ data: revisao });
});
