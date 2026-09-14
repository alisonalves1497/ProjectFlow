"use client";

// Alça de redimensionar coluna de tabela: fica em cima do "traço" divisório (borda direita
// do header anterior). Arrastar pra direita alarga a coluna à direita dela, pra esquerda
// estreita — estado fica só com quem usa isso (normalmente local, não persiste entre
// recarregamentos). Reaproveitada em qualquer tabela de documentos com colunas ajustáveis.
export function ResizeHandle({ onResize }: { onResize: (deltaX: number) => void }) {
  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    let ultimoX = e.clientX;

    function onMouseMove(ev: MouseEvent) {
      const deltaX = ev.clientX - ultimoX;
      ultimoX = ev.clientX;
      onResize(deltaX);
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
      aria-orientation="vertical"
      className="absolute top-0 left-0 z-10 h-full w-2 -translate-x-1/2 cursor-col-resize touch-none select-none"
    >
      <div className="mx-auto h-full w-px bg-border" />
    </div>
  );
}
