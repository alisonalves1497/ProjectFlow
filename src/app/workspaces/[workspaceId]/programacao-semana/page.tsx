import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPainelData } from "@/services/painelService";

type Params = { params: Promise<{ workspaceId: string }> };

export default async function ProgramacaoSemanaPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId } = await params;
  const painel = await getPainelData(workspaceId, session.user.id);
  const { programacaoSemana } = painel;

  return (
    <div className="p-8">
      <Link href={`/workspaces/${workspaceId}`} className="text-sm text-muted-foreground hover:underline">
        ← Painel
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold">Programação da semana</h1>

      {programacaoSemana.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma entrega prevista nos próximos 7 dias.</p>
      ) : (
        <ul className="max-w-2xl space-y-2">
          {programacaoSemana.map((d) => (
            <li key={d.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <Link href={`/workspaces/${workspaceId}/documentos/${d.id}`} className="hover:underline">
                <span className="font-mono text-xs">{d.codigoCompleto}</span>{" "}
                <span className="text-muted-foreground">{d.descricao}</span>
              </Link>
              <span className="text-muted-foreground">
                {new Date(d.dataPrevista).toLocaleDateString("pt-BR")}
                {d.reprogramado && <span className="ml-1 text-xs">(reprogramado)</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
