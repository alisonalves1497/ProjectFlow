import { listProjetos } from "./projetoService";
import { listObras } from "./obraService";
import { listDisciplinasComSecoesPorObra } from "./catalogoService";
import { listAccessibleObraIdsInWorkspace } from "./permissions";

export type ArvoreDisciplina = { disciplinaId: string; code: string; name: string };
export type ArvoreObra = { id: string; projetoId: string; code: string; name: string; disciplinas: ArvoreDisciplina[] };
export type ArvoreProjeto = { id: string; code: string; name: string; obras: ArvoreObra[] };

// Monta a árvore Projeto → Obra → Disciplina inteira de uma vez, já escopada às obras que
// o usuário acessa (administrador: todas; demais papéis: só obra_members) — mesma regra
// usada no Painel/Calendário. Chamada uma vez no layout do workspace, não por navegação.
export async function getArvoreProjetos(workspaceId: string, userId: string): Promise<ArvoreProjeto[]> {
  const obraIdsAcessiveis = new Set(await listAccessibleObraIdsInWorkspace(userId, workspaceId));
  if (obraIdsAcessiveis.size === 0) return [];

  const projetos = await listProjetos(workspaceId);

  const arvore = await Promise.all(
    projetos.map(async (projeto) => {
      const todasObras = await listObras(workspaceId, projeto.id);
      const obrasAcessiveis = todasObras.filter((o) => obraIdsAcessiveis.has(o.id));

      const obrasComDisciplinas = await Promise.all(
        obrasAcessiveis.map(async (obra) => {
          const disciplinas = await listDisciplinasComSecoesPorObra(obra.id);
          return {
            id: obra.id,
            projetoId: projeto.id,
            code: obra.code,
            name: obra.name,
            disciplinas: disciplinas.map((d) => ({ disciplinaId: d.disciplinaId, code: d.code, name: d.name })),
          };
        })
      );

      return { id: projeto.id, code: projeto.code, name: projeto.name, obras: obrasComDisciplinas };
    })
  );

  return arvore.filter((p) => p.obras.length > 0);
}

export type ObraOpcao = {
  id: string;
  projetoId: string;
  label: string;
  projetoNome: string;
  obraNome: string;
  obraCode: string;
};

// Achata a árvore pra popular os seletores "Selecione uma obra..." das páginas soltas
// (GRD/Suprimentos/Cópias/Fotos/Conhecimento) — mesmo escopo de acesso da árvore.
export function flattenArvoreParaOpcoes(arvore: ArvoreProjeto[]): ObraOpcao[] {
  return arvore.flatMap((projeto) =>
    projeto.obras.map((obra) => ({
      id: obra.id,
      projetoId: obra.projetoId,
      label: `${projeto.name} — ${obra.name}`,
      projetoNome: projeto.name.replace(/^projeto\s+/i, ""),
      obraNome: obra.name,
      obraCode: obra.code,
    }))
  );
}
