import { auth } from "@/auth";
import { unauthenticated } from "./errors";

export async function requireUser(): Promise<{ id: string; email: string | null; name: string | null }> {
  const session = await auth();
  if (!session?.user?.id) throw unauthenticated();
  return { id: session.user.id, email: session.user.email ?? null, name: session.user.name ?? null };
}
