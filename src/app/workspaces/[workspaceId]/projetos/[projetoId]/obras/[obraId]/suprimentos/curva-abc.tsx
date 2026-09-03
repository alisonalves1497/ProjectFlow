import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type CurvaAbcItem = {
  itemId: string;
  codigo: string | null;
  nome: string;
  valorTotal: number;
  percentualAcumulado: number;
  classe: "A" | "B" | "C";
};

const CLASS_BAR: Record<"A" | "B" | "C", string> = {
  A: "bg-foreground",
  B: "bg-foreground/55",
  C: "bg-foreground/25",
};

const CLASS_BADGE: Record<"A" | "B" | "C", "default" | "secondary" | "outline"> = {
  A: "default",
  B: "secondary",
  C: "outline",
};

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function CurvaAbc({ itens }: { itens: CurvaAbcItem[] }) {
  const totalPorClasse: Record<"A" | "B" | "C", number> = { A: 0, B: 0, C: 0 };
  for (const i of itens) totalPorClasse[i.classe] += i.valorTotal;
  const total = totalPorClasse.A + totalPorClasse.B + totalPorClasse.C;

  if (itens.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum item ainda.</p>;
  }

  return (
    <div>
      <div className="mb-2 flex h-6 overflow-hidden rounded-md border">
        {(["A", "B", "C"] as const).map((c) =>
          totalPorClasse[c] > 0 ? (
            <div
              key={c}
              className={CLASS_BAR[c]}
              style={{ width: `${(totalPorClasse[c] / total) * 100}%` }}
              title={`Classe ${c}: ${((totalPorClasse[c] / total) * 100).toFixed(1)}%`}
            />
          ) : null
        )}
      </div>
      <div className="mb-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        {(["A", "B", "C"] as const).map((c) => (
          <span key={c} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm ${CLASS_BAR[c]}`} />
            Classe {c} — {formatBRL(totalPorClasse[c])} ({total > 0 ? ((totalPorClasse[c] / total) * 100).toFixed(1) : 0}%)
          </span>
        ))}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>% acumulado</TableHead>
              <TableHead>Classe</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itens.map((i) => (
              <TableRow key={i.itemId}>
                <TableCell>
                  {i.codigo && <span className="mr-2 font-mono text-xs text-muted-foreground">{i.codigo}</span>}
                  {i.nome}
                </TableCell>
                <TableCell>{formatBRL(i.valorTotal)}</TableCell>
                <TableCell>{i.percentualAcumulado.toFixed(1)}%</TableCell>
                <TableCell>
                  <Badge variant={CLASS_BADGE[i.classe]}>{i.classe}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
