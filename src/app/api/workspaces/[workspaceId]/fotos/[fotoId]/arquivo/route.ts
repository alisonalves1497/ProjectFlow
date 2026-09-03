import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/errors";
import { getFotoOrThrow, getFotoArquivo } from "@/services/fotoService";
import { requireObraAccess } from "@/services/permissions";

type Params = { params: Promise<{ workspaceId: string; fotoId: string }> };

export const GET = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, fotoId } = await params;

  const foto = await getFotoOrThrow(workspaceId, fotoId);
  await requireObraAccess(user.id, workspaceId, foto.obraId);

  const objeto = await getFotoArquivo(foto.arquivoChave);
  const bytes = await objeto.Body!.transformToByteArray();

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": foto.arquivoMimeType,
      "Content-Length": String(foto.arquivoTamanho),
      "Cache-Control": "private, max-age=3600",
    },
  });
});
