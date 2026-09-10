// Semeia o catálogo de Seções sugeridas (secoes_padrao) do workspace com a estrutura enxuta
// + regras de palavra-chave, pras 3 disciplinas (CIVIL, ELÉTRICA, ELETROMECÂNICO).
//
// Uso (rodar da raiz do repo):
//   node scripts/seed-catalogo-secoes.mjs local        -> banco local
//   node scripts/seed-catalogo-secoes.mjs prod         -> banco de produção (lê PROD_DATABASE_URL do .env)
//   node scripts/seed-catalogo-secoes.mjs prod --dry   -> só mostra o que faria, sem gravar
//
// Idempotente: apaga as secoes_padrao das 3 disciplinas e reinsere. Não toca em Seções reais
// (secoes), documentos, nem em nenhum outro dado.

import fs from "fs";
import pg from "pg";
import { ulid } from "ulid";

const alvo = process.argv[2];
const dry = process.argv.includes("--dry");
if (alvo !== "local" && alvo !== "prod") {
  console.error("Informe 'local' ou 'prod' como primeiro argumento.");
  process.exit(1);
}

let url;
if (alvo === "local") {
  url = "postgresql://postgres:projectflow-local-dev@127.0.0.1:5433/projectflow";
} else {
  const env = fs.readFileSync(".env", "utf8");
  const line = env.split("\n").find((l) => l.startsWith("PROD_DATABASE_URL="));
  url = line.slice("PROD_DATABASE_URL=".length).trim().replace(/^"|"$/g, "");
}

const catalogo = JSON.parse(fs.readFileSync(new URL("./catalogo-secoes-enxuto.json", import.meta.url), "utf8"));
const SECAO_SEM_ATRIBUICAO = "Sem Seção atribuída";
const newId = (p) => `${p}_${ulid()}`;
const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  // 1 workspace só (o do time). Se houver mais de um, aborta pra não semear no lugar errado.
  const ws = await client.query("select id, name from workspaces");
  if (ws.rows.length !== 1) {
    console.error(`Esperava 1 workspace, achei ${ws.rows.length}. Abortando.`);
    process.exit(1);
  }
  const workspaceId = ws.rows[0].id;
  console.log(`Workspace: ${ws.rows[0].name} (${workspaceId})${dry ? "  [DRY RUN]" : ""}\n`);

  const discs = await client.query("select id, name, code from disciplinas where workspace_id = $1", [workspaceId]);

  for (const [sheetNome, secoes] of Object.entries(catalogo)) {
    const alvoNorm = norm(sheetNome);
    let disc = discs.rows.find((d) => norm(d.name) === alvoNorm || norm(d.code) === alvoNorm);
    if (!disc) {
      console.log(`  disciplina "${sheetNome}" não existe ainda — pulei (ela é criada na 1ª sincronização que tiver documento dessa disciplina; rode o seed de novo depois).`);
      continue;
    }

    const linhas = [
      ...secoes.map((s) => ({ name: s.nome, ordem: s.ordem, palavras: s.grupos, fallback: !!s.fallback })),
      { name: SECAO_SEM_ATRIBUICAO, ordem: 999, palavras: null, fallback: true },
    ];

    console.log(`${sheetNome} -> disciplina ${disc.name} (${disc.id}): ${linhas.length} seções`);
    if (dry) {
      for (const l of linhas) console.log(`   ${String(l.ordem).padStart(3)} ${l.fallback ? "[fb] " : "     "}${l.name}`);
      continue;
    }

    await client.query("delete from secoes_padrao where workspace_id = $1 and disciplina_id = $2", [workspaceId, disc.id]);
    for (const l of linhas) {
      await client.query(
        `insert into secoes_padrao (id, workspace_id, disciplina_id, name, ordem, palavras_chave, fallback)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [newId("secpad"), workspaceId, disc.id, l.name, l.ordem, l.palavras ? JSON.stringify(l.palavras) : null, l.fallback]
      );
    }
    console.log(`   ok`);
  }
  console.log(`\n${dry ? "DRY RUN — nada gravado." : "Seed concluído."}`);
} catch (e) {
  console.log("falhou:", e.message);
} finally {
  await client.end();
}
