import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getObraOrThrow } from "@/services/obraService";
import { requireObraAccess } from "@/services/permissions";
import { listItensSuprimento } from "@/services/itemSuprimentoService";
import { listDisciplinas } from "@/services/catalogoService";
import { listFornecedores } from "@/services/fornecedorService";
import { listDocumentos } from "@/services/documentoService";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SuprimentosTabs } from "../suprimentos-tabs";
import { CreateItemDialog } from "./create-item-dialog";
import { MarcarCompradoButton } from "./marcar-comprado-button";

type Params = {
  params: Promise<{ workspaceId: string; projetoId: string; obraId: string }>;
  searchParams: Promise<{ disciplinaId?: string; fornecedorId?: string; comprado?: string; critico?: string }>;
};

function formatBRL(v: string | null) {
  if (v === null) return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function ItensSuprimentoPage({ params, searchParams }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId, projetoId, obraId } = await params;
  const filtros = await searchParams;
  await requireObraAccess(session.user.id, workspaceId, obraId);

  const obra = await getObraOrThrow(workspaceId, obraId);
  const base = `/workspaces/${workspaceId}/projetos/${projetoId}/obras/${obraId}/suprimentos`;

  const [itens, disciplinas, fornecedores, documentos] = await Promise.all([
    listItensSuprimento(workspaceId, {
      obraId,
      disciplinaId: filtros.disciplinaId || undefined,
      fornecedorId: filtros.fornecedorId || undefined,
      comprado: filtros.comprado === "true" ? true : filtros.comprado === "false" ? false : undefined,
      critico: filtros.critico === "true" ? true : filtros.critico === "false" ? false : undefined,
    }),
    listDisciplinas(workspaceId),
    listFornecedores(workspaceId),
    listDocumentos(workspaceId, { obraId }),
  ]);

  const disciplinaMap = new Map(disciplinas.map((d) => [d.id, d]));
  const fornecedorMap = new Map(fornecedores.map((f) => [f.id, f]));

  return (
    <div className="p-8">
      <p className="text-sm text-muted-foreground">
        {obra.name} · {obra.code}
      </p>
      <h1 className="mt-1 mb-4 text-2xl font-semibold">Suprimentos</h1>

      <SuprimentosTabs base={base} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <form method="get" className="flex flex-wrap items-center gap-2">
          <select name="disciplinaId" defaultValue={filtros.disciplinaId ?? ""} className="h-9 rounded-md border bg-transparent px-3 text-sm">
            <option value="">Todas as disciplinas</option>
            {disciplinas.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} — {d.name}
              </option>
            ))}
          </select>
          <select name="fornecedorId" defaultValue={filtros.fornecedorId ?? ""} className="h-9 rounded-md border bg-transparent px-3 text-sm">
            <option value="">Todos os fornecedores</option>
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
          <select name="comprado" defaultValue={filtros.comprado ?? ""} className="h-9 rounded-md border bg-transparent px-3 text-sm">
            <option value="">Comprado: todos</option>
            <option value="true">Comprado</option>
            <option value="false">Não comprado</option>
          </select>
          <select name="critico" defaultValue={filtros.critico ?? ""} className="h-9 rounded-md border bg-transparent px-3 text-sm">
            <option value="">Crítico: todos</option>
            <option value="true">Crítico</option>
            <option value="false">Não crítico</option>
          </select>
          <button type="submit" className="h-9 rounded-md border px-3 text-sm hover:bg-accent">
            Filtrar
          </button>
        </form>

        <CreateItemDialog
          workspaceId={workspaceId}
          projetoId={projetoId}
          obraId={obraId}
          disciplinas={disciplinas}
          fornecedores={fornecedores}
          documentos={documentos.map((d) => ({ id: d.id, codigoCompleto: d.codigoCompleto, descricao: d.descricao }))}
        />
      </div>

      {itens.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum item ainda.</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Disciplina</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Valor total</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Crítico</TableHead>
                <TableHead>Comprado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">
                    <Link href={`${base}/itens/${item.id}`} className="hover:underline">
                      {item.codigo ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell>{item.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{disciplinaMap.get(item.disciplinaId)?.code ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.fornecedorId ? (fornecedorMap.get(item.fornecedorId)?.nome ?? "—") : "—"}
                  </TableCell>
                  <TableCell>{formatBRL(item.valorTotal)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.prazoPrevisto ? new Date(item.prazoPrevisto).toLocaleDateString("pt-BR") : "—"}
                  </TableCell>
                  <TableCell>{item.critico && <Badge variant="destructive">Crítico</Badge>}</TableCell>
                  <TableCell>
                    <Badge variant={item.comprado ? "success" : "warning"}>{item.comprado ? "Comprado" : "Pendente"}</Badge>
                  </TableCell>
                  <TableCell>
                    <MarcarCompradoButton
                      workspaceId={workspaceId}
                      projetoId={projetoId}
                      obraId={obraId}
                      itemId={item.id}
                      comprado={item.comprado}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
