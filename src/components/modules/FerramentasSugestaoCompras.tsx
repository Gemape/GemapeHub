import { useMemo, useState } from "react";

import { BarraDeFiltros } from "@/components/layout/BarraDeFiltros";
import { EtiquetaStatusCompra, LegendaStatusCompra } from "@/components/modules/LegendaStatusCompra";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEmpresa } from "@/lib/empresa-context";
import { empresasParaEscolha } from "@/lib/empresas";
import { hojeLocal } from "@/lib/empregados";
import { posicaoDasFerramentas } from "@/lib/estoque-ferramentas-posicao";
import { exportarCsv, formatarData } from "@/lib/gemape";
import { useEmpresas, useItens, useMovimentacoes, useTodosCaixaItens } from "@/lib/hooks-gemape";
import { montarRelatorioTabelaHtml } from "@/lib/relatorio-padrao";
import { filtrarSugestaoEpi, itensQuePedemCompra, rotuloDoStatus } from "@/lib/sugestao-epi";
import { linhasDaSugestaoFerramentas, PARAMETROS_COMPRA_FERRAMENTA } from "@/lib/sugestao-ferramentas";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";

const TODOS = "todos";

// Ferramentas > Relatórios > Sugestão de Compras: a mesma tela e os mesmos status de EPI e Uniformes, pelo estoque mínimo; o consumo vem das baixas dos últimos 12 meses.
export function FerramentasSugestaoCompras() {
  const { empresaId } = useEmpresa();
  const { data: ferramentas = [], isLoading } = useItens("ferramenta", empresaId);
  const { data: movimentos = [] } = useMovimentacoes("ferramenta", empresaId);
  const { data: itensDeCaixa = [] } = useTodosCaixaItens();
  const { data: empresas = [] } = useEmpresas();
  const [empresaFiltro, setEmpresaFiltro] = useState(TODOS);
  const [palavra, setPalavra] = useState("");
  const nomeDaEmpresa = (id: string | null) => empresas.find((e) => e.id === id)?.nome_fantasia ?? "—";

  const todas = useMemo(() => {
    const saldos = new Map(posicaoDasFerramentas(ferramentas, movimentos, itensDeCaixa).map((p) => [p.ferramentaId, p.saldo]));
    return linhasDaSugestaoFerramentas({ ferramentas, saldoDe: (id) => saldos.get(id) ?? 0, movimentos, hoje: hojeLocal() });
  }, [ferramentas, movimentos, itensDeCaixa]);
  const filtradas = filtrarSugestaoEpi(todas, { ...(empresaFiltro !== TODOS ? { empresaId: empresaFiltro } : {}), palavra });
  const pedem = itensQuePedemCompra(filtradas);

  const imprimir = () =>
    abrirDocumento({
      titulo: "Sugestão de compras de ferramentas",
      html: montarRelatorioTabelaHtml({
        titulo: "Sugestão de compras de ferramentas",
        subtitulos: [`Gerado em ${formatarData(hojeLocal())}`, "Só as ferramentas que pedem compra (ruptura, comprar já e planejar)"],
        empresa: empresaFiltro === TODOS ? "Todas as empresas" : nomeDaEmpresa(empresaFiltro),
        resumo: [["Ferramentas para comprar", String(pedem.length)], ["Unidades sugeridas", String(pedem.reduce((t, l) => t + l.quantidadeSugerida, 0))]],
        colunas: [{ titulo: "Descrição" }, { titulo: "Empresa" }, { titulo: "Estoque", direita: true }, { titulo: "Mínimo", direita: true }, { titulo: "Status" }, { titulo: "Sugerido", direita: true }],
        linhas: pedem.map((l) => [`${l.codigo} ${l.descricao}`, nomeDaEmpresa(l.empresaId), String(l.total), String(l.minimo), rotuloDoStatus(l.status), String(l.quantidadeSugerida)]),
        vazio: "Nenhuma ferramenta pede compra no momento.",
      }),
      arquivo: nomeArquivoDocumento("Sugestao de compras de ferramentas", hojeLocal()),
    });

  return (
    <section className="space-y-4" aria-label="Sugestão de compras de ferramentas">
      <p className="max-w-3xl text-sm text-muted-foreground">
        O status vem do estoque mínimo de cada ferramenta (sem saldo é ruptura, abaixo do mínimo é comprar já, no mínimo é planejar), com reposição de {PARAMETROS_COMPRA_FERRAMENTA.prazoReposicao} dias. O consumo
        mensal é a média das baixas definitivas dos últimos 12 meses; entrega e devolução não contam, porque a ferramenta continua sendo da empresa.
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <BarraDeFiltros>
          <div className="w-56 space-y-1">
            <Label htmlFor="sugf-empresa">Empresa</Label>
            <Select value={empresaFiltro} onValueChange={setEmpresaFiltro}>
              <SelectTrigger id="sugf-empresa">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todas as empresas</SelectItem>
                {empresasParaEscolha(empresas).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome_fantasia}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-72 space-y-1">
            <Label htmlFor="sugf-palavra">Palavra-chave</Label>
            <Input id="sugf-palavra" placeholder="Código ou descrição" value={palavra} onChange={(e) => setPalavra(e.target.value)} />
          </div>
        </BarraDeFiltros>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={imprimir}>
            Gerar relatório
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={filtradas.length === 0}
            onClick={() =>
              exportarCsv(
                "sugestao-compras-ferramenta",
                filtradas.map((l) => ({
                  Descrição: l.descricao,
                  Empresa: nomeDaEmpresa(l.empresaId),
                  "Estoque total": l.total,
                  "Estoque mínimo": l.minimo,
                  "Média de baixas mensal": Number(l.mediaMensal.toFixed(2)),
                  "Tempo de cobertura (dias)": l.cobertura ?? "Sem baixas",
                  "Status de criticidade": rotuloDoStatus(l.status),
                  "Quantidade sugerida": l.quantidadeSugerida,
                })),
              )
            }
          >
            Exportar CSV
          </Button>
        </div>
      </div>

      <LegendaStatusCompra parametros={PARAMETROS_COMPRA_FERRAMENTA} />

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead className="text-right">Estoque total</TableHead>
              <TableHead className="text-right">Estoque mínimo</TableHead>
              <TableHead className="text-right">Média de baixas mensal</TableHead>
              <TableHead className="text-right">Tempo de cobertura (dias)</TableHead>
              <TableHead>Status de criticidade</TableHead>
              <TableHead className="text-right">Sugerido</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8}>Carregando…</TableCell>
              </TableRow>
            ) : filtradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-6 text-center text-muted-foreground">
                  Nenhuma ferramenta encontrada.
                </TableCell>
              </TableRow>
            ) : (
              filtradas.map((l) => (
                <TableRow key={l.itemId}>
                  <TableCell>
                    <span className="font-mono text-xs text-muted-foreground">{l.codigo}</span> {l.descricao}
                  </TableCell>
                  <TableCell>{nomeDaEmpresa(l.empresaId)}</TableCell>
                  <TableCell className="text-right font-semibold">{l.total}</TableCell>
                  <TableCell className="text-right">{l.minimo}</TableCell>
                  <TableCell className="text-right">{l.mediaMensal.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right">{l.cobertura === null ? "Sem baixas" : l.cobertura.toLocaleString("pt-BR")}</TableCell>
                  <TableCell>
                    <EtiquetaStatusCompra status={l.status} parametros={PARAMETROS_COMPRA_FERRAMENTA} />
                  </TableCell>
                  <TableCell className="text-right font-semibold">{l.quantidadeSugerida}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
