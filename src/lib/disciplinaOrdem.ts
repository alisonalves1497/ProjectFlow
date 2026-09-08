// Ordem fixa combinada com o time — não é alfabética (ex: "Geral" vem antes de "Civil",
// e "Eletromecânico" antes de "Elétrica"). Disciplina fora dessa lista (criada depois,
// nome diferente) cai no fim, em ordem alfabética entre elas.
const ORDEM_DISCIPLINAS = ["GERAL", "CIVIL", "ELETROMECANICO", "ELETRICA", "TELECOM"];

function normalizarParaOrdem(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .trim();
}

export function compararNomesDisciplina(a: string, b: string): number {
  const ia = ORDEM_DISCIPLINAS.indexOf(normalizarParaOrdem(a));
  const ib = ORDEM_DISCIPLINAS.indexOf(normalizarParaOrdem(b));
  if (ia === -1 && ib === -1) return a.localeCompare(b);
  if (ia === -1) return 1;
  if (ib === -1) return -1;
  return ia - ib;
}
