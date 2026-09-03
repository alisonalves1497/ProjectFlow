"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordAction, type ActionState } from "./actions";

const initialState: ActionState = { status: "idle" };

export function ResetPasswordForm({ email, token }: { email: string; token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState);

  if (state.status === "success") {
    return (
      <div className="space-y-4 text-sm">
        <p>Senha redefinida com sucesso.</p>
        <Link href="/login" className="text-primary underline underline-offset-4">
          Entrar com a nova senha
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="token" value={token} />
      <div className="space-y-2">
        <Label htmlFor="novaSenha">Nova senha</Label>
        <Input id="novaSenha" name="novaSenha" type="password" autoComplete="new-password" required minLength={6} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmarSenha">Confirmar nova senha</Label>
        <Input id="confirmarSenha" name="confirmarSenha" type="password" autoComplete="new-password" required minLength={6} />
      </div>
      {state.status === "error" && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Salvando..." : "Redefinir senha"}
      </Button>
    </form>
  );
}
