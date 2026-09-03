"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { updateMemberRoleAction, type ActionState } from "./actions";
import { WORKSPACE_ROLE_LABELS } from "@/lib/roles";

const ROLES = ["administrador", "coordenador", "lider_aprovador", "analista"] as const;
const initialActionState: ActionState = { status: "idle" };

export function MemberRoleSelect({ workspaceId, userId, role }: { workspaceId: string; userId: string; role: string }) {
  const [state, formAction] = useActionState(updateMemberRoleAction, initialActionState);

  useEffect(() => {
    if (state.status === "error") toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="userId" value={userId} />
      <select
        name="role"
        defaultValue={role}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-8 rounded-md border bg-transparent px-2 text-sm"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {WORKSPACE_ROLE_LABELS[r]}
          </option>
        ))}
      </select>
    </form>
  );
}
