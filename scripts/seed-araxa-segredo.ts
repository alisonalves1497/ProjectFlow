// Seed de dados de exemplo: obras SE Araxá e SE Segredo (Projeto GRAÚNA), disciplinas
// Civil / Eletromecânico / Elétrica. Reaproveita os serviços reais (createProjeto, createObra,
// createDocumento, createRevisao, transitionRevisaoStatus) pra criação de projeto/obra/documento/
// revisão passar pelas mesmas validações e pelo contador de sequencial de verdade.
//
// As tabelas de catálogo (disciplinas, fases, tipos_documento, obra_disciplinas, secoes) não têm
// nenhum service/API ainda no app (foram populadas originalmente via SQL direto também) — aqui
// seguem o mesmo caminho, via insert direto no Drizzle.
//
// Rodar: npx tsx scripts/seed-araxa-segredo.ts

import { eq, and } from "drizzle-orm";
import { db } from "../src/db/client";
import { workspaces, disciplinas, fases, tiposDocumento, obraDisciplinas, secoes, documentos } from "../src/db/schema";
import { newId } from "../src/lib/id";
import { createProjeto } from "../src/services/projetoService";
import { createObra } from "../src/services/obraService";
import { createDocumento } from "../src/services/documentoService";
import { createRevisao, transitionRevisaoStatus } from "../src/services/revisaoService";

type StatusBucket = "previsto" | "em_elaboracao" | "devolvido_correcao" | "liberado_para_construcao";
const BUCKETS: StatusBucket[] = ["previsto", "em_elaboracao", "devolvido_correcao", "liberado_para_construcao"];

type SecaoDef = { nome: string; tipoCode: string; tipoName: string; documentos: string[] };
type DisciplinaDef = { code: string; name: string; secoes: SecaoDef[] };

const CIVIL: DisciplinaDef = {
  code: "C",
  name: "Civil",
  secoes: [
    {
      nome: "Sondagem",
      tipoCode: "SOND",
      tipoName: "Sondagem",
      documentos: [
        "Relatório de Sondagem SPT - Fundação Principal",
        "Relatório de Sondagem SPT - Pátio de Equipamentos",
        "Levantamento Planialtimétrico",
        "Laudo de Investigação Geotécnica",
      ],
    },
    {
      nome: "Terraplenagem",
      tipoCode: "TERR",
      tipoName: "Terraplenagem",
      documentos: [
        "Projeto de Terraplenagem - Plataforma Geral",
        "Memorial de Cálculo de Terraplenagem",
        "Planta de Cortes e Aterros",
        "Cronograma de Movimentação de Terra",
      ],
    },
    {
      nome: "Fundações - Planta",
      tipoCode: "FUDE",
      tipoName: "Fundações",
      documentos: [
        "Planta Geral de Fundações",
        "Detalhamento de Fundações - Pórtico de Entrada",
        "Fundação - Casa de Controle - Formas e Armaduras",
      ],
    },
    {
      nome: "Fundações - Setor 525 kV",
      tipoCode: "FUDE",
      tipoName: "Fundações",
      documentos: [
        "Fundação - Setor 525 kV - Reator Monofásico Barra (50 MVAr) - Formas e Armaduras",
        "Fundação - Setor 525 kV - Disjuntor - Formas e Armaduras",
        "Fundação - Setor 525 kV - Pórtico Estrutural - Formas e Armaduras",
        "Fundação - Setor 525 kV - Transformador de Potência - Formas e Armaduras",
      ],
    },
  ],
};

const ELETROMECANICO: DisciplinaDef = {
  code: "EM",
  name: "Eletromecânico",
  secoes: [
    {
      nome: "Equipamentos de Pátio",
      tipoCode: "ESPT",
      tipoName: "Especificação Técnica",
      documentos: [
        "Especificação Técnica - Transformador de Potência",
        "Especificação Técnica - Disjuntor 525 kV",
        "Especificação Técnica - Seccionador Tripolar",
        "Especificação Técnica - Para-raios",
        "Especificação Técnica - Transformador de Corrente (TC)",
        "Especificação Técnica - Transformador de Potencial (TP)",
      ],
    },
    {
      nome: "Montagem Eletromecânica",
      tipoCode: "MONT",
      tipoName: "Montagem",
      documentos: ["Memorial Descritivo de Montagem", "Plano de Montagem de Equipamentos", "Procedimento de Ensaios de Comissionamento"],
    },
    {
      nome: "Diagramas",
      tipoCode: "DIAG",
      tipoName: "Diagrama",
      documentos: ["Diagrama Unifilar Geral", "Diagrama Trifilar", "Lista de Materiais Eletromecânicos"],
    },
  ],
};

const ELETRICA: DisciplinaDef = {
  code: "EL",
  name: "Elétrica",
  secoes: [
    {
      nome: "Proteção e Controle",
      tipoCode: "PROT",
      tipoName: "Proteção e Controle",
      documentos: [
        "Diagrama de Proteção e Controle",
        "Diagrama Lógico de Proteção",
        "Lista de Entradas/Saídas (I/O List)",
        "Especificação de Painéis de Controle e Proteção",
      ],
    },
    {
      nome: "Aterramento",
      tipoCode: "ATER",
      tipoName: "Aterramento",
      documentos: ["Projeto de Malha de Aterramento", "Memorial de Cálculo de Malha de Terra"],
    },
    {
      nome: "Cabeamento",
      tipoCode: "CABO",
      tipoName: "Cabeamento",
      documentos: ["Lista de Cabos", "Projeto de Cabeamento de Controle", "Diagrama de Iluminação"],
    },
    {
      nome: "Supervisão",
      tipoCode: "SCAD",
      tipoName: "Supervisão (SCADA)",
      documentos: ["Especificação de Sistema de Supervisão (SCADA)", "Diagrama de Sincronismo"],
    },
  ],
};

const DISCIPLINAS_DEF = [CIVIL, ELETROMECANICO, ELETRICA];

function dataPrevistaOffset(diasOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + diasOffset);
  return d.toISOString().slice(0, 10);
}

async function garantirDisciplina(workspaceId: string, code: string, name: string) {
  const [existing] = await db
    .select()
    .from(disciplinas)
    .where(and(eq(disciplinas.workspaceId, workspaceId), eq(disciplinas.code, code)))
    .limit(1);
  if (existing) return existing;
  const [created] = await db.insert(disciplinas).values({ id: newId("disc"), workspaceId, code, name }).returning();
  return created;
}

async function garantirTipoDocumento(workspaceId: string, code: string, name: string) {
  const [existing] = await db
    .select()
    .from(tiposDocumento)
    .where(and(eq(tiposDocumento.workspaceId, workspaceId), eq(tiposDocumento.code, code)))
    .limit(1);
  if (existing) return existing;
  const [created] = await db.insert(tiposDocumento).values({ id: newId("tipo"), workspaceId, code, name }).returning();
  return created;
}

async function garantirObraDisciplina(obraId: string, disciplinaId: string) {
  const [existing] = await db
    .select()
    .from(obraDisciplinas)
    .where(and(eq(obraDisciplinas.obraId, obraId), eq(obraDisciplinas.disciplinaId, disciplinaId)))
    .limit(1);
  if (existing) return existing;
  const [created] = await db.insert(obraDisciplinas).values({ id: newId("od"), obraId, disciplinaId }).returning();
  return created;
}

async function criarSecao(obraDisciplinaId: string, nome: string, position: string) {
  const [created] = await db.insert(secoes).values({ id: newId("sec"), obraDisciplinaId, name: nome, position }).returning();
  return created;
}

// Avança um documento recém-criado até o bucket de status pedido, usando só os serviços reais
// (createRevisao / transitionRevisaoStatus), seguindo o grafo de statusGraph.ts.
async function avancarParaBucket(workspaceId: string, userId: string, documentoId: string, bucket: StatusBucket) {
  if (bucket === "previsto") return;

  // Primeira revisão (current=null) é sempre interna A1 — nextRevisionSpec é determinístico,
  // mas createRevisao exige letra/número explícitos (só as_built preenche sozinho).
  const rev1 = await createRevisao(workspaceId, documentoId, userId, { letra: "A", numero: 1 });

  if (bucket === "em_elaboracao") return;

  await transitionRevisaoStatus(workspaceId, documentoId, rev1.id, userId, "em_revisao_interna");

  if (bucket === "devolvido_correcao") {
    await transitionRevisaoStatus(workspaceId, documentoId, rev1.id, userId, "devolvido_correcao");
    return;
  }

  // liberado_para_construcao: segue o caminho real até "aprovado" (formal A0)...
  await transitionRevisaoStatus(workspaceId, documentoId, rev1.id, userId, "aprovacao_lider_tecnico");
  // Terminal interno "aprovacao_lider_tecnico" -> nextRevisionSpec vira formal, mesma letra, número 0.
  const rev2 = await createRevisao(workspaceId, documentoId, userId, { letra: "A", numero: 0 });
  await transitionRevisaoStatus(workspaceId, documentoId, rev2.id, userId, "em_analise_cliente");
  await transitionRevisaoStatus(workspaceId, documentoId, rev2.id, userId, "aprovado");

  // ...e só então marca "liberado_para_construcao" no documento: é um status pós-aprovação que
  // ainda não tem transição própria na camada de serviço (statusGraph.ts não alcança esse status
  // a partir de nenhum grafo hoje — só o enum permite). Atualiza só documentos.status, a revisão
  // usada de verdade (rev2) continua registrada como "aprovado".
  await db.update(documentos).set({ status: "liberado_para_construcao", updatedAt: new Date() }).where(eq(documentos.id, documentoId));
}

async function main() {
  const [workspace] = await db.select().from(workspaces).limit(1);
  if (!workspace) throw new Error("Nenhum workspace encontrado.");
  const workspaceId = workspace.id;

  const [alice] = await db.query.users.findMany({ where: (u, { eq }) => eq(u.email, "alice@example.com"), limit: 1 });
  if (!alice) throw new Error("Usuária alice@example.com não encontrada.");
  const userId = alice.id;

  const [faseEnt] = await db.select().from(fases).where(and(eq(fases.workspaceId, workspaceId), eq(fases.code, "ENT"))).limit(1);
  if (!faseEnt) throw new Error("Fase 'ENT' não encontrada no catálogo do workspace.");

  const projeto = await createProjeto(workspaceId, { code: "GRAU", name: "Projeto Graúna" });
  console.log(`Projeto criado: ${projeto.code} - ${projeto.name} (${projeto.id})`);

  const obraAraxa = await createObra(workspaceId, projeto.id, { code: "ARX", name: "SE Araxá" }, userId);
  const obraSegredo = await createObra(workspaceId, projeto.id, { code: "SEG", name: "SE Segredo" }, userId);
  console.log(`Obras criadas: ${obraAraxa.code} - ${obraAraxa.name} / ${obraSegredo.code} - ${obraSegredo.name}`);

  // Garante disciplinas e tipos de documento no catálogo do workspace (reaproveita o que já existe).
  const disciplinaRows = new Map<string, { id: string }>();
  for (const d of DISCIPLINAS_DEF) {
    disciplinaRows.set(d.code, await garantirDisciplina(workspaceId, d.code, d.name));
  }

  const tipoRows = new Map<string, { id: string }>();
  for (const d of DISCIPLINAS_DEF) {
    for (const s of d.secoes) {
      if (!tipoRows.has(s.tipoCode)) {
        tipoRows.set(s.tipoCode, await garantirTipoDocumento(workspaceId, s.tipoCode, s.tipoName));
      }
    }
  }

  let totalDocumentos = 0;
  let bucketCursor = 0;

  for (const obra of [obraAraxa, obraSegredo]) {
    for (const disciplinaDef of DISCIPLINAS_DEF) {
      const disciplina = disciplinaRows.get(disciplinaDef.code)!;
      const od = await garantirObraDisciplina(obra.id, disciplina.id);

      for (let i = 0; i < disciplinaDef.secoes.length; i++) {
        const secaoDef = disciplinaDef.secoes[i];
        const secao = await criarSecao(od.id, secaoDef.nome, `a${i}`);
        const tipo = tipoRows.get(secaoDef.tipoCode)!;

        for (let j = 0; j < secaoDef.documentos.length; j++) {
          const descricao = secaoDef.documentos[j];
          const bucket = BUCKETS[bucketCursor % BUCKETS.length];
          bucketCursor++;

          const documento = await createDocumento(workspaceId, userId, {
            obraId: obra.id,
            disciplinaId: disciplina.id,
            secaoId: secao.id,
            faseId: faseEnt.id,
            tipoDocumentoId: tipo.id,
            descricao,
            dataPrevista: dataPrevistaOffset(-30 + ((totalDocumentos * 7) % 90)),
          });

          await avancarParaBucket(workspaceId, userId, documento.id, bucket);
          totalDocumentos++;
        }
      }
    }
  }

  console.log(`\nTotal de documentos criados: ${totalDocumentos}`);
  console.log("Distribuição de status: previsto / em_elaboracao / devolvido_correcao / liberado_para_construcao, em rodízio.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
