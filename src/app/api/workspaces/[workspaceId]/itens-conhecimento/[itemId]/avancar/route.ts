import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/errors";
import { itemConhecimentoAvancarSchema } from "@/lib/validators";
import { getItemConhecimentoOrThrow, avancarStatus } from "@/services/conhecimentoService";
import { requireObraAccess } from "@/services/permissions";

type Params = { params: Promise<{ workspaceId: string; itemId: string }> };

export const POST = withErrorHandling(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, itemId } = await params;

  const item = await getItemConhecimentoOrThrow(workspaceId, itemId);
  await requireObraAccess(user.id, workspaceId, item.obraId);

  const body = await req.json().catch(() => ({}));
  const input = itemConhecimentoAvancarSchema.parse(body);

  const atualizado = await avancarStatus(workspaceId, itemId, user.id, input);
  return NextResponse.json({ data: atualizado });
});
