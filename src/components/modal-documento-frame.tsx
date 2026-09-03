"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

export function ModalDocumentoFrame({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const fechar = useCallback(() => {
    router.back();
  }, [router]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") fechar();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [fechar]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-3 sm:p-6">
      <div className="absolute inset-0" onClick={fechar} />
      <div className="relative flex h-full w-full max-w-[1600px] flex-col rounded-lg border bg-background shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-end gap-1 rounded-t-lg border-b bg-background p-2">
          <button
            type="button"
            onClick={fechar}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Fechar"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
