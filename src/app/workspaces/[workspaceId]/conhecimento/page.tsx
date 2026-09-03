import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getArvoreProjetos, flattenArvoreParaOpcoes } from "@/services/navegacaoService";
import { ObraSelectorRedirect } from "@/components/obra-selector-redirect";

type Params = { params: Promise<{ workspaceId: string }> };

export default async function ConhecimentoSelecionarObraPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId } = await params;
  const arvore = await getArvoreProjetos(workspaceId, session.user.id);
  const obras = flattenArvoreParaOpcoes(arvore);

  return <ObraSelectorRedirect workspaceId={workspaceId} obras={obras} destinoSufixo="conhecimento" titulo="Base de Conhecimento" />;
}
