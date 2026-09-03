import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { ForgotPasswordForm } from "./forgot-password-form";

export default async function EsqueciSenhaPage() {
  const session = await auth();
  if (session?.user) redirect("/workspaces");

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <Image src="/logo-enermais.png" alt="EnerMais" width={200} height={60} className="mx-auto h-12 w-auto" priority />
          <CardDescription className="text-center">Esqueceu sua senha? Informe seu email.</CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
