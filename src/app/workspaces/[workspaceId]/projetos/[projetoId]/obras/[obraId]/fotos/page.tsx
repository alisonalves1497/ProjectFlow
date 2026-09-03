import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getObraOrThrow } from "@/services/obraService";
import { requireObraAccess } from "@/services/permissions";
import { listFotosPorObra } from "@/services/fotoService";
import { listDocumentos } from "@/services/documentoService";
import { ApiError } from "@/lib/errors";
import { UploadFotosDialog } from "./upload-fotos-dialog";

type Params = { params: Promise<{ workspaceId: string; projetoId: string; obraId: string }> };

export default async function FotosPage({ params }: Params) {
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
  const [fotos, documentos] = await Promise.all([listFotosPorObra(workspaceId, obraId), listDocumentos(workspaceId, { obraId })]);

  const revalidatePathTarget = `/workspaces/${workspaceId}/projetos/${projetoId}/obras/${obraId}/fotos`;

  return (
    <div className="p-8">
      <p className="text-sm text-muted-foreground">
        {obra.name} · {obra.code}
      </p>
      <div className="mt-1 mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Registro Fotográfico</h1>
        <UploadFotosDialog
          workspaceId={workspaceId}
          obraId={obraId}
          revalidatePathTarget={revalidatePathTarget}
          documentos={documentos.map((d) => ({ id: d.id, codigoCompleto: d.codigoCompleto, descricao: d.descricao }))}
        />
      </div>

      {fotos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma foto registrada ainda.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {fotos.map((f) => (
            <div key={f.id} className="overflow-hidden rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element -- imagem vem de uma rota de streaming autenticada, não do otimizador de imagens do Next */}
              <img src={`/api/workspaces/${workspaceId}/fotos/${f.id}/arquivo`} alt={f.legenda ?? f.arquivoNome} className="aspect-square w-full object-cover" />
              <div className="p-2">
                {f.legenda && <p className="truncate text-xs">{f.legenda}</p>}
                <p className="text-xs text-muted-foreground">{new Date(f.createdAt).toLocaleDateString("pt-BR")}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
