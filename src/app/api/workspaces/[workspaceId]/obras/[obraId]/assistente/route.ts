import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { withErrorHandling, ApiError } from "@/lib/errors";
import { perguntarAssistente } from "@/services/assistenteService";
import { requireObraAccess } from "@/services/permissions";
import { isAssistenteIaAtivo } from "@/lib/anthropic";

type Params = { params: Promise<{ workspaceId: string; obraId: string }> };

const bodySchema = z.object({
  mensagens: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) }))
    .min(1)
    .max(40),
});

export const POST = withErrorHandling(async (req: Request, { params }: Params) => {
  if (!isAssistenteIaAtivo()) throw new ApiError(404, "ASSISTENTE_IA_DESATIVADO", "O Assistente IA está desativado no momento.");

  const user = await requireUser();
  const { workspaceId, obraId } = await params;
  await requireObraAccess(user.id, workspaceId, obraId);

  const { mensagens } = bodySchema.parse(await req.json());
  const resposta = await perguntarAssistente(workspaceId, obraId, mensagens);

  return NextResponse.json({ data: { resposta } });
});
