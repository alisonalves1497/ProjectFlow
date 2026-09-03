import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getItemSuprimentoOrThrow, listItemDocumentos } from "@/services/itemSuprimentoService";
import { listDisciplinas } from "@/services/catalogoService";
import { listFornecedores } from "@/services/fornecedorService";
import { listDocumentos } from "@/services/documentoService";
import { requireObraAccess } from "@/services/permissions";
import { Badge } from "@/components/ui/badge";
import { EditItemForm } from "./edit-item-form";
import { DocumentosVinculadosManager } from "./documentos-vinculados-manager";

type Params = { params: Promise<{ workspaceId: string; projetoId: string; obraId: string; itemId: string }> };

export default async function ItemSuprimentoDetailPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId, projetoId, obraId, itemId } = await params;
  const item = await getItemSuprimentoOrThrow(workspaceId, itemId);
  await requireObraAccess(session.user.id, workspaceId, item.obraId);

  const [disciplinas, fornecedores, vinculados, documentosDaObra] = await Promise.all([
    listDisciplinas(workspaceId),
    listFornecedores(workspaceId),
    listItemDocumentos(itemId),
    listDocumentos(workspaceId, { obraId }),
  ]);

  const base = `/workspaces/${workspaceId}/projetos/${projetoId}/obras/${obraId}/suprimentos`;

  return (
    <div className="max-w-2xl p-8">
      <Link href={`${base}/itens`} className="text-sm text-muted-foreground hover:underline">
        ← Itens
      </Link>

      <div className="mt-2 mb-6 flex items-center gap-3">
        <h1 className="text-xl font-semibold">{item.nome}</h1>
        <Badge variant={item.comprado ? "success" : "warning"}>{item.comprado ? "Comprado" : "Pendente"}</Badge>
        {item.critico && <Badge variant="destructive">Crítico</Badge>}
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Dados do item</h2>
        <EditItemForm
          workspaceId={workspaceId}
          projetoId={projetoId}
          obraId={obraId}
          item={item}
          disciplinas={disciplinas}
          fornecedores={fornecedores}
        />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Documentos de origem</h2>
        <DocumentosVinculadosManager
          workspaceId={workspaceId}
          projetoId={projetoId}
          obraId={obraId}
          itemId={itemId}
          vinculados={vinculados}
          todosDaObra={documentosDaObra.map((d) => ({ id: d.id, codigoCompleto: d.codigoCompleto, descricao: d.descricao }))}
        />
      </section>
    </div>
  );
}
