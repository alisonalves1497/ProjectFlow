"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function ConhecimentoTabs({ base }: { base: string }) {
  const pathname = usePathname();
  const isLicoes = pathname.endsWith("/licoes-aprendidas");

  const tabs = [
    { href: base, label: "RFI/RNC", active: !isLicoes },
    { href: `${base}/licoes-aprendidas`, label: "Lições Aprendidas", active: isLicoes },
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
