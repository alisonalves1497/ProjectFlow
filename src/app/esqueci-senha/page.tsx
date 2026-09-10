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
          {/* Espaço reservado pra logo — sem imagem por enquanto. */}
          <div className="mx-auto h-12" />
          <CardDescription className="text-center">Esqueceu sua senha? Informe seu email.</CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
