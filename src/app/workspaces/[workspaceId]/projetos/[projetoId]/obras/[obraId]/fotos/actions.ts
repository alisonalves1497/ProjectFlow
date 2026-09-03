"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { ApiError } from "@/lib/errors";
import { fotoCreateSchema } from "@/lib/validators";
import { createFoto } from "@/services/fotoService";
import { requireObraAccess } from "@/services/permissions";

export type ActionState = { status: "idle" } | { status: "error"; error: string } | { status: "success" };

export async function uploadFotosAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const obraId = String(formData.get("obraId") ?? "");
  const revalidatePathTarget = String(formData.get("revalidatePathTarget") ?? "");

  const arquivos = formData.getAll("arquivos").filter((a): a is File => a instanceof File && a.size > 0);
  if (arquivos.length === 0) return { status: "error", error: "Selecione ao menos uma foto." };

  let input;
  try {
    input = fotoCreateSchema.parse({
      legenda: formData.get("legenda") || undefined,
      documentoIds: formData.getAll("documentoIds").map(String).filter(Boolean),
      itemConhecimentoIds: formData.getAll("itemConhecimentoIds").map(String).filter(Boolean),
    });
  } catch (err) {
    if (err instanceof ZodError) return { status: "error", error: err.issues.map((i) => i.message).join("; ") };
    return { status: "error", error: "Dados inválidos." };
  }

  try {
    await requireObraAccess(session.user.id, workspaceId, obraId);
    for (const arquivo of arquivos) {
      const buffer = Buffer.from(await arquivo.arrayBuffer());
      await createFoto(workspaceId, obraId, session.user.id, {
        legenda: input.legenda,
        documentoIds: input.documentoIds ?? [],
        itemConhecimentoIds: input.itemConhecimentoIds ?? [],
        arquivo: { buffer, nome: arquivo.name, mimeType: arquivo.type, tamanho: arquivo.size },
      });
    }
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  revalidatePath(revalidatePathTarget);
  return { status: "success" };
}
