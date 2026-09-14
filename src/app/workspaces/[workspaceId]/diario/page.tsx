import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listEntradasDiario } from "@/services/diarioService";
import { DiarioLista } from "./diario-lista";

type Params = { params: Promise<{ workspaceId: string }> };

export default async function DiarioPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId } = await params;
  const entradas = await listEntradasDiario(workspaceId, session.user.id);

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-1 text-2xl font-semibold">Meu Espaço</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Só você vê isso aqui. Registre o que fez, sem hora nem vínculo obrigatório com projeto ou documento.
      </p>

      <DiarioLista workspaceId={workspaceId} entradasIniciais={entradas} />
    </div>
  );
}
