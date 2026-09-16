"use client";

// Alça pra redimensionar a altura de um painel com scroll (ex: card "Meu trabalho"/"Lista
// pessoal" do Meu Espaço) — arrastar pra baixo aumenta a altura visível, pra cima diminui.
// Ocupa espaço real na coluna (em vez de sobrepor o conteúdo com margem negativa) pra não
// perder o mousedown pro painel de cima, e tem fundo/cor própria pra dar a entender que dá
// pra puxar.
export function ResizeHandleVertical({ onResize }: { onResize: (deltaY: number) => void }) {
  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    let ultimoY = e.clientY;

    function onMouseMove(ev: MouseEvent) {
      const deltaY = ev.clientY - ultimoY;
      ultimoY = ev.clientY;
      onResize(deltaY);
    }
    function onMouseUp() {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  return (
    <div
      onMouseDown={onMouseDown}
      role="separator"
      aria-orientation="horizontal"
      title="Arrastar pra redimensionar"
      className="flex h-3 w-full shrink-0 cursor-row-resize touch-none items-center justify-center border-t bg-muted/70 select-none hover:bg-muted"
    >
      <div className="h-1 w-10 rounded-full bg-muted-foreground/40" />
    </div>
  );
}
