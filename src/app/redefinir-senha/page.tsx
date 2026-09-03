import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { ResetPasswordForm } from "./reset-password-form";

export default async function RedefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/workspaces");

  const { email, token } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <Image src="/logo-enermais.png" alt="EnerMais" width={200} height={60} className="mx-auto h-12 w-auto" priority />
          <CardDescription className="text-center">Escolha uma nova senha</CardDescription>
        </CardHeader>
        <CardContent>
          {!email || !token ? (
            <div className="space-y-4 text-sm">
              <p className="text-destructive">Link inválido ou incompleto.</p>
              <Link href="/esqueci-senha" className="text-primary underline underline-offset-4">
                Pedir um novo link
              </Link>
            </div>
          ) : (
            <ResetPasswordForm email={email} token={token} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
