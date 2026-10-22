import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEmpresa } from "@/lib/empresa-context";
import { controleDeEstoque, lerMetaCobertura, METAS_COBERTURA, salvarMetaCobertura, sugestoesDeCompra } from "@/lib/epi-controle-estoque";
import { hojeLocal } from "@/lib/empregados";
import { exportarCsv } from "@/lib/gemape";
import { useItens, useMovimentacoes } from "@/lib/hooks-gemape";

// Aba Compras dos EPIs e dos Uniformes > Sugestão de compras, como o REL_COMPRAS da planilha: o que comprar para chegar à meta de cobertura, com prioridade e observação.
const classePrioridade: Record<string, string> = {
  "1-URGENTE": "bg-destructive text-destructive-foreground",
  "2-ALTA": "bg-accent text-accent-foreground",
  "3-MÉDIA": "bg-warning text-warning-foreground",
  "4-BAIXA": "bg-info text-info-foreground",
};

export function SugestaoComprasModulo({ modulo }: { modulo: "epi" | "uniforme" }) {
  const plural = modulo === "epi" ? "EPIs" : "uniformes";
  const { empresaId } = useEmpresa();
  const [meta, setMeta] = useState<number>(() => lerMetaCobertura());
  const { data: itens = [], isLoading: carregandoItens } = useItens(modulo, empresaId);
  const { data: movimentos = [], isLoading: carregandoMov } = useMovimentacoes(modulo, empresaId);
  const sugestoes = useMemo(() => sugestoesDeCompra(controleDeEstoque(itens, movimentos, hojeLocal()), meta), [itens, movimentos, meta]);
  const carregando = carregandoItens || carregandoMov;

  function trocarMeta(valor: string) {
    try {
      salvarMetaCobertura(Number(valor));
      setMeta(Number(valor));
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar a meta.");
    }
  }

  return (
    <section className="space-y-3" aria-label="Sugestão de compras">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Sugestão de compras</h2>
          <p className="text-sm text-muted-foreground">
            {plural} abaixo do estoque crítico ou com cobertura abaixo da meta. A quantidade sugerida leva o estoque até a meta, pela média de consumo dos últimos 12 meses.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="meta-cobertura">Meta de cobertura</Label>
            <Select value={String(meta)} onValueChange={(v) => v && trocarMeta(v)}>
              <SelectTrigger id="meta-cobertura" className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>{METAS_COBERTURA.map((d) => <SelectItem key={d} value={String(d)}>{d} dias</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            disabled={carregando || sugestoes.length === 0}
            onClick={() => exportarCsv(`sugestao-compras-${modulo}`, sugestoes.map((s) => ({
              Descrição: s.nome,
              "Estoque crítico": s.estoqueCritico,
              "Estoque atual": s.estoqueAtual,
              "Cobertura (dias)": s.cobertura ?? "Sem consumo",
              "Consumo médio mensal": Number(s.consumoAnual.toFixed(2)),
              "Quantidade sugerida": s.quantidade,
              Prioridade: s.prioridade,
              Observação: s.observacao,
            })))}
          >Exportar CSV</Button>
        </div>
      </div>
      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Estoque crítico</TableHead>
              <TableHead className="text-right">Estoque atual</TableHead>
              <TableHead className="text-right">Cobertura (dias)</TableHead>
              <TableHead className="text-right">Consumo médio mensal</TableHead>
              <TableHead className="text-right">Quantidade sugerida</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Observação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {carregando ? <TableRow><TableCell colSpan={8}>Carregando…</TableCell></TableRow>
              : sugestoes.length === 0 ? <TableRow><TableCell colSpan={8}>Nenhum {modulo === "epi" ? "EPI" : "uniforme"} precisa de compra com a meta de {meta} dias.</TableCell></TableRow>
                : sugestoes.map((s) => (
                  <TableRow key={s.itemId}>
                    <TableCell>{s.nome}</TableCell>
                    <TableCell className="text-right">{s.estoqueCritico}</TableCell>
                    <TableCell className="text-right">{s.estoqueAtual}</TableCell>
                    <TableCell className="text-right">{s.cobertura === null ? "Sem consumo" : s.cobertura.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right">{s.consumoAnual.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right font-semibold">{s.quantidade}</TableCell>
                    <TableCell><span className={`rounded px-2 py-0.5 text-xs font-medium ${classePrioridade[s.prioridade] ?? ""}`}>{s.prioridade}</span></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.observacao}</TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
