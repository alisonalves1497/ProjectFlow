import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listWorkspacesForUser } from "@/services/workspaceService";
import { WORKSPACE_ROLE_LABELS } from "@/services/permissions";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignOutButton } from "@/components/sign-out-button";
import { CreateWorkspaceDialog } from "./create-workspace-dialog";

export default async function WorkspacesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const workspaces = await listWorkspacesForUser(session.user.id);

  if (workspaces.length === 1) redirect(`/workspaces/${workspaces[0].id}`);

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Workspaces</h1>
          <p className="text-sm text-muted-foreground">{session.user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <CreateWorkspaceDialog />
          <SignOutButton />
        </div>
      </div>

      {workspaces.length === 0 ? (
        <p className="text-muted-foreground">Você ainda não faz parte de nenhum workspace.</p>
      ) : (
        <div className="grid gap-3">
          {workspaces.map((ws) => (
            <Link key={ws.id} href={`/workspaces/${ws.id}`}>
              <Card className="transition hover:border-foreground/40">
                <CardHeader className="flex-row items-center justify-between">
                  <div>
                    <CardTitle>{ws.name}</CardTitle>
                    <CardDescription>/{ws.slug}</CardDescription>
                  </div>
                  <Badge variant="secondary">{WORKSPACE_ROLE_LABELS[ws.role]}</Badge>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
