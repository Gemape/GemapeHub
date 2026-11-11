import { BarraDeFiltros } from "@/components/layout/BarraDeFiltros";
import { Banknote, ClipboardList, Package } from "lucide-react";
import { GradeDeCartoes } from "@/components/GradeDeCartoes";
import { StatCard } from "@/components/StatCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { lerMovimentacoesRelatorio } from "@/lib/relatorios-historico";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { exportarCsv, formatarData, formatarMoeda } from "@/lib/gemape";
import { ehBaixa } from "@/lib/historico-movimentacoes";
import { nomeTamanhoGravado } from "@/lib/estoque-tamanho";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { useEmpresas, useItens, useEmpregados } from "@/lib/hooks-gemape";
import { hojeLocal } from "@/lib/empregados";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";
import { montarRelatorioTabelaHtml } from "@/lib/relatorio-padrao";

// Uniformes e Ferramentas usam o mesmo relatório (Relatórios > Baixas definitivas); ferramenta não tem tamanho, então a coluna some.
export function UniformesRelatorioBaixa({ modulo = "uniforme" }: { modulo?: "uniforme" | "ferramenta" }) {
  const ferramenta = modulo === "ferramenta";
  const rotulo = ferramenta ? "ferramenta" : "uniforme";
  const Rotulo = ferramenta ? "Ferramenta" : "Uniforme";
  const titulo = `Relatório de baixas de ${rotulo}`;
  const { empresaId } = useEmpresa();
  const [dataInicial, setDataInicial] = useState(
    hojeLocal().slice(0, 8) + "01",
  );
  const [dataFinal, setDataFinal] = useState(hojeLocal());
  const [motivoFiltro, setMotivoFiltro] = useState(TODAS);
  const parametros = useParametrosBase();
  const tamanhoDe = (m: { tamanho_id?: string | null }) =>
    nomeTamanhoGravado(parametros, m.tamanho_id);

  const { data: movimentacoes = [], isLoading, isError, error } = useQuery({
    queryKey: ["relatorio-baixas", modulo, empresaId, dataInicial, dataFinal],
    queryFn: () => lerMovimentacoesRelatorio(supabase, { modulo, empresaId: empresaId === TODAS ? undefined : empresaId, de: dataInicial, ate: dataFinal }),
  });
  const { data: itens = [] } = useItens(modulo, TODAS);
  const { data: empresas = [] } = useEmpresas();
  const { data: empregados = [] } = useEmpregados(TODAS);

  const baixas = movimentacoes.filter(
    (m) =>
      ehBaixa(m) &&
      m.data_movimentacao >= dataInicial &&
      m.data_movimentacao <= dataFinal &&
      (motivoFiltro === TODAS || m.motivo_baixa === motivoFiltro),
  );

  const totalQuantidade = baixas.reduce((acc, b) => acc + b.quantidade, 0);
  const totalValor = baixas.reduce((acc, b) => {
    return acc + b.quantidade * (b.preco_unitario_registrado ?? 0);
  }, 0);

  const imprimir = () =>
    abrirDocumento({
      titulo,
      html: montarRelatorioTabelaHtml({
        titulo,
        subtitulos: [`Período: ${formatarData(dataInicial)} a ${formatarData(dataFinal)}`, motivoFiltro === TODAS ? "Todos os motivos" : `Motivo: ${motivoFiltro}`],
        empresa: empresaId === TODAS ? "Todas as empresas" : empresas.find((e) => e.id === empresaId)?.nome_fantasia,
        resumo: [["Total de baixas", String(baixas.length)], [`Total de ${Rotulo}s`, String(totalQuantidade)], ["Valor total", formatarMoeda(totalValor)]],
        colunas: [{ titulo: "Data" }, { titulo: "Empresa" }, { titulo: "Empregado" }, { titulo: Rotulo }, ...(ferramenta ? [] : [{ titulo: "Tamanho" }]), { titulo: "Motivo" }, { titulo: "Qtd", direita: true }, { titulo: "Valor total", direita: true }],
        linhas: baixas.map((b) => [
          formatarData(b.data_movimentacao),
          empresas.find((e) => e.id === b.empresa_id)?.nome_fantasia ?? "—",
          empregados.find((e) => e.id === b.empregado_id)?.nome ?? "—",
          itens.find((i) => i.id === b.item_id)?.nome ?? "—",
          ...(ferramenta ? [] : [tamanhoDe(b) || "—"]),
          b.motivo_baixa ?? "—",
          String(b.quantidade),
          formatarMoeda(b.quantidade * (b.preco_unitario_registrado ?? 0)),
        ]),
        vazio: "Nenhuma baixa no período.",
      }),
      arquivo: nomeArquivoDocumento(titulo, dataInicial, dataFinal),
    });

  if (isError) return <div role="alert">Não foi possível carregar o histórico completo: {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-2">
        <BarraDeFiltros>
        <div className="space-y-1.5">
          <Label>Data Inicial</Label>
          <Input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Data Final</Label>
          <Input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Motivo de Baixa</Label>
          <Select value={motivoFiltro} onValueChange={setMotivoFiltro}>
            <SelectTrigger className="w-56 max-w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODAS}>Todos os motivos</SelectItem>
              <SelectItem value="Desgaste Natural">Desgaste Natural</SelectItem>
              <SelectItem value="Quebra">Quebra</SelectItem>
              <SelectItem value="Desaparecimento">Desaparecimento</SelectItem>
              <SelectItem value="Perda">Perda</SelectItem>
              <SelectItem value="Mau Uso">Mau Uso</SelectItem>
              <SelectItem value="Desligamento">Desligamento</SelectItem>
            </SelectContent>
          </Select>
        </div>
        </BarraDeFiltros>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={imprimir}>
            Relatório
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              exportarCsv(
                "relatorio-baixas",
                baixas.map((b) => ({
                  Data: formatarData(b.data_movimentacao),
                  Empresa: empresas.find((e) => e.id === b.empresa_id)?.nome_fantasia,
                  Empregado: empregados.find((e) => e.id === b.empregado_id)?.nome ?? "—",
                  [Rotulo]: itens.find((i) => i.id === b.item_id)?.nome,
                  ...(ferramenta ? {} : { Tamanho: tamanhoDe(b) }),
                  Motivo: b.motivo_baixa,
                  Qtd: b.quantidade,
                  Valor: formatarMoeda(b.quantidade * (b.preco_unitario_registrado ?? 0)),
                })),
              )
            }
          >
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Quatro cartões do tamanho dos da Frota (decisão 386): o que cada número mostra e o período. */}
      <GradeDeCartoes colunas={4}>
        <StatCard titulo="Total de Baixas" subtitulo="Baixas definitivas registradas no período e no motivo escolhidos." valor={baixas.length} detalhe={`${formatarData(dataInicial)} a ${formatarData(dataFinal)}`} icone={ClipboardList} compacto />
        <StatCard titulo={`Total de ${Rotulo}s`} subtitulo="Soma das quantidades de todas as baixas." valor={totalQuantidade} detalhe={motivoFiltro === TODAS ? "Todos os motivos" : `Motivo: ${motivoFiltro}`} icone={Package} compacto />
        <StatCard titulo="Valor Total" subtitulo="Quantidade × preço da compra de origem de cada baixa." valor={formatarMoeda(totalValor)} detalhe={`${baixas.length} baixa${baixas.length === 1 ? "" : "s"}`} icone={Banknote} compacto />
        <StatCard titulo={`Valor Médio por ${Rotulo}`} subtitulo={`Valor total ÷ total de ${rotulo}s.`} valor={totalQuantidade > 0 ? formatarMoeda(totalValor / totalQuantidade) : "—"} detalhe={totalQuantidade > 0 ? `${totalQuantidade} ${rotulo}${totalQuantidade === 1 ? "" : "s"} no período` : "Sem baixas no período"} icone={Banknote} compacto />
      </GradeDeCartoes>

      <div className="panel max-h-[max(12rem,calc(100dvh-27rem))] flex flex-col overflow-hidden [&>div]:min-h-0 [&>div]:flex-1 [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-card print:max-h-none print:overflow-visible print:border-none print:shadow-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Empregado</TableHead>
              <TableHead>{Rotulo}</TableHead>
              {!ferramenta && <TableHead>Tamanho</TableHead>}
              <TableHead>Motivo</TableHead>
              <TableHead className="text-right">Qtd</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={ferramenta ? 7 : 8} className="text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : baixas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={ferramenta ? 7 : 8} className="text-center">
                  Nenhuma baixa no período.
                </TableCell>
              </TableRow>
            ) : (
              baixas.map((b) => {
                const item = itens.find((i) => i.id === b.item_id);
                const valorB = b.quantidade * (b.preco_unitario_registrado ?? 0);
                return (
                  <TableRow key={b.id}>
                    <TableCell>{formatarData(b.data_movimentacao)}</TableCell>
                    <TableCell>
                      {empresas.find((e) => e.id === b.empresa_id)?.nome_fantasia}
                    </TableCell>
                    <TableCell>
                      {empregados.find((e) => e.id === b.empregado_id)?.nome ?? "—"}
                    </TableCell>
                    <TableCell>{item?.nome}</TableCell>
                    {!ferramenta && <TableCell>{tamanhoDe(b) || "—"}</TableCell>}
                    <TableCell>{b.motivo_baixa}</TableCell>
                    <TableCell className="text-right">{b.quantidade}</TableCell>
                    <TableCell className="text-right font-bold">{formatarMoeda(valorB)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
