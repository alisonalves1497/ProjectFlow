"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { ApiError } from "@/lib/errors";
import { workspaceCreateSchema } from "@/lib/validators";
import { createWorkspace } from "@/services/workspaceService";

export type ActionState = { status: "idle" } | { status: "error"; error: string } | { status: "success" };

export async function createWorkspaceAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  let input;
  try {
    input = workspaceCreateSchema.parse({
      name: formData.get("name"),
      slug: formData.get("slug"),
    });
  } catch (err) {
    if (err instanceof ZodError) return { status: "error", error: err.issues.map((i) => i.message).join("; ") };
    return { status: "error", error: "Dados inválidos." };
  }

  try {
    await createWorkspace(session.user.id, input);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  revalidatePath("/workspaces");
  return { status: "success" };
}
