import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listFornecedores } from "@/services/fornecedorService";
import { getWorkspaceRole } from "@/services/permissions";
import { AddFornecedorForm } from "./add-fornecedor-form";

type Params = { params: Promise<{ workspaceId: string }> };

export default async function FornecedoresPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId } = await params;
  const role = await getWorkspaceRole(session.user.id, workspaceId);
  if (!role) redirect("/workspaces");

  const fornecedores = await listFornecedores(workspaceId);

  return (
    <div className="max-w-2xl p-8">
      <h1 className="mb-1 text-2xl font-semibold">Fornecedores</h1>
      <p className="mb-6 text-sm text-muted-foreground">Usados nos itens de Suprimentos.</p>

      <ul className="mb-6 space-y-2">
        {fornecedores.length === 0 && <p className="text-sm text-muted-foreground">Nenhum fornecedor ainda.</p>}
        {fornecedores.map((f) => (
          <li key={f.id} className="rounded-md border px-3 py-2 text-sm">
            <span className="font-medium">{f.nome}</span>{" "}
            <span className="text-muted-foreground">
              {f.cnpj ? `· ${f.cnpj}` : ""}
              {f.email ? ` · ${f.email}` : ""}
            </span>
          </li>
        ))}
      </ul>

      <h2 className="mb-3 text-sm font-medium text-muted-foreground">Adicionar fornecedor</h2>
      <AddFornecedorForm workspaceId={workspaceId} />
    </div>
  );
}
