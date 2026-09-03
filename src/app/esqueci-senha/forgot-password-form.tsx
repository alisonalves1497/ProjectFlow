"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordResetAction, type ActionState } from "./actions";

const initialState: ActionState = { status: "idle" };

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initialState);

  if (state.status === "success") {
    return (
      <div className="space-y-4 text-sm">
        <p>Se esse email tiver uma conta no sistema, você vai receber um link pra redefinir a senha em alguns minutos.</p>
        <p className="text-muted-foreground">Não esqueça de checar a caixa de spam.</p>
        <Link href="/login" className="text-primary underline underline-offset-4">
          Voltar pro login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {state.status === "error" && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Enviando..." : "Enviar link de redefinição"}
      </Button>
      <Link href="/login" className="block text-center text-sm text-muted-foreground underline underline-offset-4">
        Voltar pro login
      </Link>
    </form>
  );
}
