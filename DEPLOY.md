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
1. Acesse **neon.tech** e clique em "Sign up". Mais rápido: entrar com a conta do GitHub
   (mesma conta usada pra `alisonalves1497`) — não pede cartão em nenhum momento.
2. Depois do login, ele já te pede pra criar o primeiro projeto:
   - **Project name**: `projectflow` (ou o nome que quiser, é só um rótulo)
   - **Postgres version**: pode deixar a padrão (mais recente)
   - **Region**: escolha a mais próxima do Brasil (ex: `US East` costuma ser a com
     menor latência disponível no free tier; não tem região São Paulo no free tier)
   - Clique em "Create project"
3. Ele te leva direto pro painel do projeto com um card **"Connection string"**.
   Tem um dropdown ali — troque de "Direct connection" pra **"Pooled connection"**
   (às vezes já vem selecionado). O host da URL vai ter `-pooler` no meio, tipo:
   `postgresql://usuario:senha@ep-xxxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require`
4. Clique no ícone de copiar ao lado da string. **Essa é a `DATABASE_URL`** — guarda
   ela (cole num bloco de notas por enquanto, ou já me manda quando eu pedir).
5. Pronto, não precisa criar tabela nem nada manualmente — isso é feito no passo 6
   (rodando as migrations).

### 2. Criar o bucket de arquivos (Cloudflare R2)
1. Acesse **dash.cloudflare.com** e crie a conta (email + senha, ou Google/GitHub).
   Confirma o email se ele pedir.
2. No menu lateral esquerdo do painel, procure **"R2 Object Storage"** (às vezes
   aparece direto, às vezes dentro de "R2" no menu). Na primeira vez, ele pode pedir
   pra "ativar" o R2 na conta — aceite (ainda é free tier, sem cartão).
3. Clique em **"Create bucket"**:
   - **Bucket name**: `projectflow-fotos`
   - **Location**: pode deixar "Automatic"
   - Clique em "Create bucket"
4. Agora as chaves de acesso. No menu do R2, procure **"Manage R2 API Tokens"**
   (ou "API" → "Manage API Tokens" dependendo do layout atual do painel).
5. Clique em **"Create API Token"**:
   - **Token name**: `projectflow-prod`
   - **Permissions**: "Object Read & Write"
   - Em "Specify bucket(s)" (se aparecer essa opção), restrinja ao bucket
     `projectflow-fotos` — mais seguro que dar acesso a todos os buckets
   - Clique em "Create API Token"
6. Ele mostra **uma única vez**: `Access Key ID` e `Secret Access Key`. Copie os dois
   pra algum lugar seguro AGORA — se fechar a tela sem copiar, precisa gerar outro token.
7. Na mesma tela (ou voltando pro painel do R2), anote também o **Account ID** — aparece
   no canto direito do painel do R2, ou na URL do painel
   (`dash.cloudflare.com/<ACCOUNT_ID>/r2`). O endpoint S3 é montado assim:
   `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

### 3. Subir o código pro GitHub
✅ Já feito — o código está em github.com/alisonalves1497/ProjectFlow.

### 4. Conectar o repositório na Vercel
1. Acesse **vercel.com** e clique em "Sign Up" → **"Continue with GitHub"** (usa a
   mesma conta do GitHub onde está o repositório — assim ele já enxerga o repo
   automaticamente, sem precisar autorizar nada extra depois).
2. No dashboard da Vercel, clique em **"Add New…"** (canto superior direito) →
   **"Project"**.
3. Na lista de repositórios do GitHub, ache **"ProjectFlow"** e clique em **"Import"**.
   - Se não aparecer na lista, clique em "Adjust GitHub App Permissions" e dê acesso
     ao repositório (ou a todos os repositórios da conta).
4. Na tela de configuração do projeto:
   - **Framework Preset**: já vem "Next.js" detectado sozinho — não mexe.
   - **Build and Output Settings**: não mexe em nada.
   - **Root Directory**: deixa `./` (a raiz)
5. **Não clique em "Deploy" ainda** — antes, expanda **"Environment Variables"**
   (mesma tela) e cole as variáveis do passo 5 abaixo. Só depois clique em **"Deploy"**.

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
