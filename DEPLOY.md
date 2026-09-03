# Deploy do ProjectFlow na web (custo zero)

Guia pra colocar o app no ar sem gastar nada, usando planos gratuitos de três serviços
diferentes. Cada serviço abaixo você precisa criar a conta você mesmo (não posso criar
contas por você) — o resto eu preparo/executo.

## As três peças

| Peça | Serviço (free tier) | Por quê |
|---|---|---|
| App Next.js | [Vercel](https://vercel.com) | Feito pra Next.js, deploy automático a cada push. |
| Banco Postgres | [Neon](https://neon.tech) ou [Supabase](https://supabase.com) | Postgres gerenciado, sem cartão. |
| Arquivos (fotos, documentos, anexos) | [Cloudflare R2](https://developers.cloudflare.com/r2/) | S3-compatível — o código já usa um cliente S3 genérico, então é só trocar variáveis de ambiente. |

**Ressalva importante:** o plano Hobby da Vercel é, pelos termos deles, pra uso
pessoal/não-comercial. Pra uso interno de uma empresa de verdade, o certo é migrar pro
plano Pro (pago) mais cedo ou mais tarde — mas pra testar, validar com a equipe, ou uso
pessoal, o Hobby serve bem.

## Passo a passo

### 1. Criar o banco (Neon)
1. Crie uma conta em neon.tech (dá pra usar login do GitHub).
2. Crie um projeto novo. Copie a **connection string com pooling** (a que tem `-pooler`
   no nome do host) — é a que funciona bem com funções serverless da Vercel.

### 2. Criar o bucket de arquivos (Cloudflare R2)
1. Crie uma conta em dash.cloudflare.com.
2. Vá em R2 → Create bucket (nome sugerido: `projectflow-fotos`).
3. Em "Manage R2 API Tokens", crie um token com permissão de leitura/escrita nesse bucket.
   Anote: **Account ID**, **Access Key ID**, **Secret Access Key**.
4. O endpoint S3 do R2 é `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.

### 3. Subir o código pro GitHub
Ainda não tem repositório Git neste projeto — eu já rodei `git init` e ajustei o
`.gitignore` (os dados locais de Postgres/MinIO nunca vão pro repo). Falta:
1. Você cria um repositório vazio no GitHub (github.com/new).
2. Me diz a URL dele que eu faço o primeiro commit e o push.

### 4. Conectar o repositório na Vercel
1. Crie uma conta em vercel.com (dá pra usar login do GitHub).
2. "Add New… → Project" → selecione o repositório.
3. A Vercel detecta Next.js automaticamente — não precisa mudar build command nem output.

### 5. Variáveis de ambiente (configurar na Vercel, aba Environment Variables)

```
DATABASE_URL=<connection string com pooling do Neon>
AUTH_SECRET=<gerar novo, ver abaixo>
S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=<do R2>
S3_SECRET_ACCESS_KEY=<do R2>
S3_BUCKET=projectflow-fotos
S3_REGION=auto
ANTHROPIC_API_KEY=<opcional — deixe em branco se ASSISTENTE_IA_ATIVO=false>
ASSISTENTE_IA_ATIVO=false
```

Pra gerar um `AUTH_SECRET` novo (nunca reutilize o do `.env` local):
```bash
npx auth secret
```

### 6. Rodar as migrations no banco novo
Com o `DATABASE_URL` do Neon já configurado localmente (ou exportado na sessão),
de dentro da pasta do projeto:
```bash
npx drizzle-kit migrate
```
Isso cria todas as tabelas no banco novo, do zero.

### 7. Criar o primeiro usuário administrador
Não existe cadastro público ainda — o primeiro usuário se cria via script, apontando
pro banco novo:
```bash
npx tsx scripts/create-test-user.ts seu-email@empresa.com "sua-senha" "Seu Nome"
```
Depois, no banco (Neon tem um SQL editor no painel), adicione esse usuário como
`administrador` de um workspace — ou me peça que eu preparo um script pra isso também.

### 8. Deploy
Push pro GitHub já dispara o deploy automático na Vercel. Depois do primeiro deploy,
qualquer commit novo na branch principal atualiza o site sozinho.

## O que eu já ajustei no código
- `trustHost: true` no NextAuth (`src/auth.ts`) — sem isso, login falha em qualquer
  domínio que não seja um dos "conhecidos" pela Vercel.
- `.gitignore` corrigido pra nunca versionar os dados locais de Postgres/MinIO nem
  segredos reais (só o `.env.example`, que tem só placeholders).

## O que NÃO precisa mudar
- O cliente S3 (`src/lib/s3.ts`) já é genérico — funciona com R2 só trocando as
  variáveis de ambiente, sem tocar em código.
- O cliente Postgres (`src/db/client.ts`) usa `pg.Pool` normal — funciona com a
  connection string *pooled* do Neon sem mudança de código.
