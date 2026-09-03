"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function SuprimentosTabs({ base }: { base: string }) {
  const pathname = usePathname();
  const isItens = pathname.endsWith("/itens");

  const tabs = [
    { href: base, label: "Dashboard", active: !isItens },
    { href: `${base}/itens`, label: "Itens", active: isItens },
  ];

  return (
    <div className="mb-6 flex gap-1 border-b">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(
            "border-b-2 px-3 py-2 text-sm font-medium transition",
            t.active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
