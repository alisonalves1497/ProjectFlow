"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { removeMemberAction, type ActionState } from "./actions";

const initialActionState: ActionState = { status: "idle" };

export function RemoveMemberButton({ workspaceId, userId }: { workspaceId: string; userId: string }) {
  const [state, formAction, pending] = useActionState(removeMemberAction, initialActionState);

  useEffect(() => {
    if (state.status === "error") toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="userId" value={userId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "Removendo..." : "Remover"}
      </Button>
    </form>
  );
}
