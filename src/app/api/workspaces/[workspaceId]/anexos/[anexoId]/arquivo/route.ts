import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/errors";
import { getAnexoOrThrow, getAnexoArquivo } from "@/services/anexoService";
import { getRevisaoOrThrow } from "@/services/revisaoService";
import { getDocumentoOrThrow } from "@/services/documentoService";
import { requireObraAccess } from "@/services/permissions";

type Params = { params: Promise<{ workspaceId: string; anexoId: string }> };

export const GET = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, anexoId } = await params;

  const anexo = await getAnexoOrThrow(workspaceId, anexoId);
  const revisao = await getRevisaoOrThrow(workspaceId, anexo.revisaoId);
  const documento = await getDocumentoOrThrow(workspaceId, revisao.documentoId);
  await requireObraAccess(user.id, workspaceId, documento.obraId);

  const objeto = await getAnexoArquivo(anexo.arquivoChave);
  const bytes = await objeto.Body!.transformToByteArray();

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": anexo.arquivoMimeType,
      "Content-Length": String(anexo.arquivoTamanho),
      "Content-Disposition": `inline; filename="${encodeURIComponent(anexo.arquivoNome)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
});
