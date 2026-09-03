import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling, badRequest } from "@/lib/errors";
import { fotoCreateSchema } from "@/lib/validators";
import { createFoto, listFotosPorObra } from "@/services/fotoService";
import { requireObraAccess } from "@/services/permissions";

type Params = { params: Promise<{ workspaceId: string }> };

export const GET = withErrorHandling(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId } = await params;

  const { searchParams } = new URL(req.url);
  const obraId = searchParams.get("obraId");
  if (!obraId) return NextResponse.json({ error: { code: "OBRA_ID_REQUIRED", message: "obraId é obrigatório." } }, { status: 400 });

  await requireObraAccess(user.id, workspaceId, obraId);
  const fotos = await listFotosPorObra(workspaceId, obraId);
  return NextResponse.json({ data: fotos });
});

export const POST = withErrorHandling(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId } = await params;

  const formData = await req.formData();
  const obraId = String(formData.get("obraId") ?? "");
  await requireObraAccess(user.id, workspaceId, obraId);

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File)) throw badRequest("ARQUIVO_OBRIGATORIO", "Envie um arquivo de imagem em 'arquivo'.");

  const input = fotoCreateSchema.parse({
    legenda: formData.get("legenda") || undefined,
    documentoIds: formData.getAll("documentoIds").map(String).filter(Boolean),
    itemConhecimentoIds: formData.getAll("itemConhecimentoIds").map(String).filter(Boolean),
  });

  const buffer = Buffer.from(await arquivo.arrayBuffer());
  const foto = await createFoto(workspaceId, obraId, user.id, {
    legenda: input.legenda,
    documentoIds: input.documentoIds ?? [],
    itemConhecimentoIds: input.itemConhecimentoIds ?? [],
    arquivo: { buffer, nome: arquivo.name, mimeType: arquivo.type, tamanho: arquivo.size },
  });
  return NextResponse.json({ data: foto }, { status: 201 });
});
