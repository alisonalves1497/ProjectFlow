import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/errors";
import { getItemConhecimentoOrThrow, listDocumentosVinculados } from "@/services/conhecimentoService";
import { listFotosPorItemConhecimento } from "@/services/fotoService";
import { requireObraAccess } from "@/services/permissions";

type Params = { params: Promise<{ workspaceId: string; itemId: string }> };

export const GET = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, itemId } = await params;

  const item = await getItemConhecimentoOrThrow(workspaceId, itemId);
  await requireObraAccess(user.id, workspaceId, item.obraId);

  const [documentos, fotos] = await Promise.all([listDocumentosVinculados(itemId), listFotosPorItemConhecimento(workspaceId, itemId)]);
  return NextResponse.json({ data: { ...item, documentos, fotos } });
});
