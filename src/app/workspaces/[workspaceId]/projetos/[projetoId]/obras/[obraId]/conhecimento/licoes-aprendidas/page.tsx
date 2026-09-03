import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getObraOrThrow } from "@/services/obraService";
import { requireObraAccess } from "@/services/permissions";
import { listItensConhecimento } from "@/services/conhecimentoService";
import { listCategoriasConhecimento } from "@/services/catalogoService";
import { ApiError } from "@/lib/errors";
import { TIPO_LABELS, type TipoItemConhecimento } from "@/lib/conhecimentoStatusGraph";
import { ConhecimentoTabs } from "../conhecimento-tabs";

type Params = { params: Promise<{ workspaceId: string; projetoId: string; obraId: string }> };

export default async function LicoesAprendidasPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId, projetoId, obraId } = await params;

  try {
    await requireObraAccess(session.user.id, workspaceId, obraId);
  } catch (err) {
    if (err instanceof ApiError) redirect(`/workspaces/${workspaceId}/projetos/${projetoId}`);
    throw err;
  }

  const obra = await getObraOrThrow(workspaceId, obraId);
  const base = `/workspaces/${workspaceId}/projetos/${projetoId}/obras/${obraId}/conhecimento`;

  const [itens, categorias] = await Promise.all([
    listItensConhecimento(workspaceId, { obraId, apenasLicoesAprendidas: true }),
    listCategoriasConhecimento(workspaceId),
  ]);

  const categoriaMap = new Map(categorias.map((c) => [c.id, c]));
  const porCategoria = new Map<string, typeof itens>();
  for (const item of itens) {
    const key = item.categoriaId ?? "";
    if (!porCategoria.has(key)) porCategoria.set(key, []);
    porCategoria.get(key)!.push(item);
  }

  return (
    <div className="p-8">
      <p className="text-sm text-muted-foreground">
        {obra.name} · {obra.code}
      </p>
      <h1 className="mt-1 mb-4 text-2xl font-semibold">Base de Conhecimento</h1>

      <ConhecimentoTabs base={base} />

      {itens.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma lição aprendida ainda — só RFI/RNC fechadas com categoria aparecem aqui.
        </p>
      ) : (
        <div className="space-y-6">
          {Array.from(porCategoria.entries()).map(([categoriaId, itensDaCategoria]) => (
            <section key={categoriaId}>
              <h2 className="mb-2 text-sm font-medium text-muted-foreground">
                {categoriaMap.get(categoriaId)?.name ?? "Sem categoria"}
              </h2>
              <ul className="space-y-2">
                {itensDaCategoria.map((i) => (
                  <li key={i.id} className="rounded-md border p-3 text-sm">
                    <Link href={`${base}/${i.id}`} className="hover:underline">
                      <span className="font-mono text-xs">{i.codigoCompleto}</span>{" "}
                      <span className="text-muted-foreground">{TIPO_LABELS[i.tipo as TipoItemConhecimento]}</span>
                    </Link>
                    <p className="mt-1">{i.titulo}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
