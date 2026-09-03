"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Mensagem = { role: "user" | "assistant"; content: string };

export function AssistenteChat({ workspaceId, obraId }: { workspaceId: string; obraId: string }) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [pergunta, setPergunta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  async function enviar() {
    const texto = pergunta.trim();
    if (!texto || enviando) return;

    const novasMensagens: Mensagem[] = [...mensagens, { role: "user", content: texto }];
    setMensagens(novasMensagens);
    setPergunta("");
    setEnviando(true);
    setErro(null);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/obras/${obraId}/assistente`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagens: novasMensagens }),
      });
      const body = await res.json();
      if (!res.ok) {
        setErro(body.error?.message ?? "Erro ao perguntar pro assistente.");
        setMensagens(mensagens); // desfaz a pergunta otimista se falhou
        return;
      }
      setMensagens([...novasMensagens, { role: "assistant", content: body.data.resposta }]);
    } catch {
      setErro("Falha de conexão. Tente de novo.");
      setMensagens(mensagens);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4 flex-1 space-y-3 overflow-y-auto rounded-lg border p-4">
        {mensagens.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Pergunte sobre os documentos, GRDs, RFI/RNC, suprimentos ou cópias controladas desta obra.
          </p>
        )}
        {mensagens.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
              m.role === "user" ? "ml-auto bg-primary/10 text-foreground" : "bg-muted text-foreground"
            )}
          >
            {m.content}
          </div>
        ))}
        {enviando && <p className="text-sm text-muted-foreground">Pensando...</p>}
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        <div ref={fimRef} />
      </div>

      <div className="flex items-end gap-2">
        <Textarea
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar();
            }
          }}
          placeholder="Pergunte algo sobre esta obra..."
          className="flex-1"
          rows={2}
        />
        <Button onClick={enviar} disabled={enviando || !pergunta.trim()}>
          {enviando ? "Enviando..." : "Enviar"}
        </Button>
      </div>
    </div>
  );
}
