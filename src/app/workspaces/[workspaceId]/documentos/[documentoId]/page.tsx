import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDocumentoOrThrow } from "@/services/documentoService";
import { requireObraAccess } from "@/services/permissions";
import { ApiError } from "@/lib/errors";
import { DocumentoDetalheConteudo } from "./documento-detalhe-conteudo";

type Params = { params: Promise<{ workspaceId: string; documentoId: string }> };

export default async function DocumentoDetailPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId, documentoId } = await params;
  const documento = await getDocumentoOrThrow(workspaceId, documentoId);

  try {
    await requireObraAccess(session.user.id, workspaceId, documento.obraId);
  } catch (err) {
    if (err instanceof ApiError) redirect(`/workspaces/${workspaceId}`);
    throw err;
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <Link href={`/workspaces/${workspaceId}`} className="text-sm text-muted-foreground hover:underline">
        ← Workspace
      </Link>
      <div className="mt-2">
        <DocumentoDetalheConteudo workspaceId={workspaceId} documentoId={documentoId} />
      </div>
    </div>
  );
}
