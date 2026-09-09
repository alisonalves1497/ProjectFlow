import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./db/client";
import { users, accounts, sessions, verificationTokens } from "./db/schema";
import { newId } from "./lib/id";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  // jwt: sessão inteira vive num cookie assinado, sem estado em memória do processo
  // (Credentials provider do Auth.js só suporta jwt, não database, de qualquer forma).
  session: { strategy: "jwt" },
  // Necessário fora do domínio *.vercel.app "conhecido" (domínio próprio, outro host) —
  // sem isso o Auth.js v5 rejeita o host da requisição em produção.
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      authorize: async (credentials) => {
        const email = (credentials?.email as string | undefined)?.toLowerCase().trim();
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // Sessão JWT não sabe sozinha que o email mudou (o token guarda o que era verdade no
    // login, ninguém avisa o cookie) — sem isso, trocar o email de alguém logado (ver
    // updateWorkspaceMemberEmail) deixava a sessão antiga válida até expirar sozinha,
    // mesmo com a conta já apontando pra outro email. Comparando o email do token contra
    // o atual no banco a cada request, deslogamos assim que detecta a troca.
    jwt: async ({ token, user }) => {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        return token;
      }
      if (token.sub) {
        const [atual] = await db.select({ email: users.email }).from(users).where(eq(users.id, token.sub)).limit(1);
        if (!atual || atual.email !== token.email) return null;
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
});

export async function createUserWithPassword(params: { name: string; email: string; password: string }) {
  const passwordHash = await bcrypt.hash(params.password, 10);
  const [user] = await db
    .insert(users)
    .values({ id: newId("usr"), name: params.name, email: params.email.toLowerCase().trim(), passwordHash })
    .returning();
  return user;
}
