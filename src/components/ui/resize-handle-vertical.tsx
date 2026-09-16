"use client";

// Mesma ideia do ResizeHandle (coluna de tabela), só que pra altura: fica embaixo de um
// painel com scroll (ex: card "Meu trabalho"/"Lista pessoal" do Meu Espaço) — arrastar pra
// baixo aumenta a altura visível, pra cima diminui.
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
      className="relative -mt-1 flex h-2 w-full -translate-y-1/2 cursor-row-resize touch-none items-center justify-center select-none"
    >
      <div className="h-px w-full bg-border" />
    </div>
  );
}
