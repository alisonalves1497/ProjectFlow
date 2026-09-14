import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMeusDocumentos } from "@/services/painelService";
import { MeusDocumentosCard } from "./meus-documentos-card";

type Params = { params: Promise<{ workspaceId: string }> };

export default async function MeusDocumentosPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId } = await params;
  const documentos = await getMeusDocumentos(workspaceId, session.user.id);

  return (
    <div className="p-8">
      <h1 className="mb-1 text-2xl font-semibold">Meus documentos</h1>
      <p className="mb-6 text-sm text-muted-foreground">Todos os documentos atribuídos a você, qualquer status.</p>

      <MeusDocumentosCard workspaceId={workspaceId} documentos={documentos} />
    </div>
  );
}
