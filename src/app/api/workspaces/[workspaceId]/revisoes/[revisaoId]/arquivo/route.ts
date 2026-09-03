import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling, badRequest, notFound } from "@/lib/errors";
import { getRevisaoOrThrow, getArquivoRevisao } from "@/services/revisaoService";
import { getDocumentoOrThrow } from "@/services/documentoService";
import { requireObraAccess } from "@/services/permissions";

type Params = { params: Promise<{ workspaceId: string; revisaoId: string }> };

export const GET = withErrorHandling(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, revisaoId } = await params;

  const tipo = new URL(req.url).searchParams.get("tipo");
  if (tipo !== "original" && tipo !== "pdf") throw badRequest("TIPO_INVALIDO", "tipo deve ser 'original' ou 'pdf'.");

  const revisao = await getRevisaoOrThrow(workspaceId, revisaoId);
  const documento = await getDocumentoOrThrow(workspaceId, revisao.documentoId);
  await requireObraAccess(user.id, workspaceId, documento.obraId);

  const chave = tipo === "original" ? revisao.arquivoOriginalChave : revisao.arquivoPdfChave;
  const nome = tipo === "original" ? revisao.arquivoOriginalNome : revisao.arquivoPdfNome;
  const mimeType = tipo === "original" ? revisao.arquivoOriginalMimeType : revisao.arquivoPdfMimeType;
  const tamanho = tipo === "original" ? revisao.arquivoOriginalTamanho : revisao.arquivoPdfTamanho;
  if (!chave) throw notFound("ARQUIVO_NOT_FOUND", "Esta revisão não tem esse arquivo.");

  const objeto = await getArquivoRevisao(chave);
  const bytes = await objeto.Body!.transformToByteArray();

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": mimeType ?? "application/octet-stream",
      "Content-Length": String(tamanho ?? bytes.length),
      "Content-Disposition": `inline; filename="${encodeURIComponent(nome ?? "arquivo")}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
});
