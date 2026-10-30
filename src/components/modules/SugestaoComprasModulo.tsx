import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { controleDeEstoque, lerMetaCobertura, METAS_COBERTURA, salvarMetaCobertura, sugestoesDeCompra, sugestoesDeCompraEpi, type SugestaoEpi } from "@/lib/epi-controle-estoque";
import { lerParametrosCompraEpi, STATUS_CRITICIDADE, type StatusCriticidade } from "@/lib/epi-parametros";
import { hojeLocal } from "@/lib/empregados";
import { exportarCsv } from "@/lib/gemape";
import { useEmpresas, useItens, useMovimentacoes } from "@/lib/hooks-gemape";

// Sugestão de compras: aba própria dos EPIs (decisão 327) e seção da aba Compras dos Uniformes, como o REL_COMPRAS da planilha: o que comprar para chegar à meta de cobertura, com prioridade e observação.
// Cor de cada status da tabela de criticidade do EPI (decisão 328).
const classeStatus: Record<StatusCriticidade, string> = {
  ruptura: "bg-destructive text-destructive-foreground",
  comprar_ja: "bg-accent text-accent-foreground",
  planejar: "bg-warning text-warning-foreground",
  estavel: "bg-success text-success-foreground",
  excesso: "bg-info text-info-foreground",
};
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
  const { data: empresas = [] } = useEmpresas();
  // Com Todas as empresas, quem compra precisa saber para qual empresa: cada linha diz de qual é.
  const comEmpresa = empresaId === TODAS;
  const nomeDaEmpresa = (id: string | null) => empresas.find((e) => e.id === id)?.nome_fantasia ?? "—";
  // No EPI a sugestão segue os parâmetros de Parâmetros Específicos (método, cobertura, prazo de reposição); nos uniformes, a meta escolhida aqui.
  const epi = modulo === "epi";
  const parametrosEpi = useMemo(() => lerParametrosCompraEpi(), []);
  const sugestoes: SugestaoEpi[] = useMemo(() => {
    const linhas = controleDeEstoque(itens, movimentos, hojeLocal());
    return epi ? sugestoesDeCompraEpi(linhas, parametrosEpi) : sugestoesDeCompra(linhas, meta).map((s) => ({ ...s, status: null }));
  }, [itens, movimentos, meta, epi, parametrosEpi]);
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
            {epi
              ? (parametrosEpi.metodo === "minimo"
                ? `${plural} no estoque mínimo ou abaixo dele. A quantidade sugerida cobre o consumo do prazo de reposição do fornecedor (${parametrosEpi.prazoReposicao} dias) mais o mínimo.`
                : `${plural} pela tabela de criticidade: tempo de cobertura contra o prazo de reposição do fornecedor (${parametrosEpi.prazoReposicao} dias). A quantidade sugerida leva a cobertura a ${parametrosEpi.diasCobertura} dias.`)
              : `${plural} abaixo do estoque crítico ou com cobertura abaixo da meta. A quantidade sugerida leva o estoque até a meta, pela média de consumo dos últimos 12 meses.`}
            {epi && <> Os parâmetros ficam em <a href="/cadastros/gerais/categorias?de=epi" className="font-medium text-primary underline underline-offset-2">Parâmetros Específicos</a>.</>}
          </p>
        </div>
        <div className="flex items-end gap-2">
          {!epi && (
            <div className="space-y-1">
              <Label htmlFor="meta-cobertura">Meta de cobertura</Label>
              <Select value={String(meta)} onValueChange={(v) => v && trocarMeta(v)}>
                <SelectTrigger id="meta-cobertura" className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>{METAS_COBERTURA.map((d) => <SelectItem key={d} value={String(d)}>{d} dias</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <Button
            variant="outline"
            disabled={carregando || sugestoes.length === 0}
            onClick={() => exportarCsv(`sugestao-compras-${modulo}`, sugestoes.map((s) => ({
              Empresa: nomeDaEmpresa(s.empresaId),
              Descrição: s.nome,
              "Estoque crítico": s.estoqueCritico,
              "Estoque atual": s.estoqueAtual,
              "Cobertura (dias)": s.cobertura ?? "Sem consumo",
              "Consumo médio mensal": Number(s.consumoAnual.toFixed(2)),
              "Quantidade sugerida": s.quantidade,
              ...(epi ? { Status: s.status ? STATUS_CRITICIDADE[s.status].rotulo : "Sem consumo" } : {}),
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
              {comEmpresa && <TableHead>Empresa</TableHead>}
              <TableHead className="text-right">Estoque crítico</TableHead>
              <TableHead className="text-right">Estoque atual</TableHead>
              <TableHead className="text-right">Cobertura (dias)</TableHead>
              <TableHead className="text-right">Consumo médio mensal</TableHead>
              <TableHead className="text-right">Quantidade sugerida</TableHead>
              {epi && <TableHead>Status</TableHead>}
              <TableHead>Prioridade</TableHead>
              <TableHead>Observação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {carregando ? <TableRow><TableCell colSpan={epi ? 10 : 9}>Carregando…</TableCell></TableRow>
              : sugestoes.length === 0 ? <TableRow><TableCell colSpan={epi ? 10 : 9}>Nenhum {epi ? "EPI" : "uniforme"} precisa de compra {epi ? "com os parâmetros atuais" : `com a meta de ${meta} dias`}.</TableCell></TableRow>
                : sugestoes.map((s) => (
                  <TableRow key={s.itemId}>
                    <TableCell>{s.nome}</TableCell>
                    {comEmpresa && <TableCell>{nomeDaEmpresa(s.empresaId)}</TableCell>}
                    <TableCell className="text-right">{s.estoqueCritico}</TableCell>
                    <TableCell className="text-right">{s.estoqueAtual}</TableCell>
                    <TableCell className="text-right">{s.cobertura === null ? "Sem consumo" : s.cobertura.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right">{s.consumoAnual.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right font-semibold">{s.quantidade}</TableCell>
                    {epi && <TableCell>{s.status ? <span className={`rounded px-2 py-0.5 text-xs font-medium ${classeStatus[s.status]}`}>{STATUS_CRITICIDADE[s.status].rotulo}</span> : "—"}</TableCell>}
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
