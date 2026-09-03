import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listContatosExternos } from "@/services/contatoExternoService";
import { getWorkspaceRole } from "@/services/permissions";
import { AddContatoForm } from "./add-contato-form";

type Params = { params: Promise<{ workspaceId: string }> };

export default async function ContatosPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId } = await params;
  const role = await getWorkspaceRole(session.user.id, workspaceId);
  if (!role) redirect("/workspaces");

  const contatos = await listContatosExternos(workspaceId);

  return (
    <div className="max-w-2xl p-8">
      <h1 className="mb-1 text-2xl font-semibold">Contatos externos</h1>
      <p className="mb-6 text-sm text-muted-foreground">Usados como destinatários em GRDs — não têm login no sistema.</p>

      <ul className="mb-6 space-y-2">
        {contatos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum contato ainda.</p>}
        {contatos.map((c) => (
          <li key={c.id} className="rounded-md border px-3 py-2 text-sm">
            <span className="font-medium">{c.nome}</span>{" "}
            <span className="text-muted-foreground">
              ({c.email}
              {c.empresa ? ` · ${c.empresa}` : ""})
            </span>
          </li>
        ))}
      </ul>

      <h2 className="mb-3 text-sm font-medium text-muted-foreground">Adicionar contato</h2>
      <AddContatoForm workspaceId={workspaceId} />
    </div>
  );
}
