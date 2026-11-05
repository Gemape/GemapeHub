import { PackageCheck, PackageX, Undo2, UserCheck } from "lucide-react";
import { GradeDeCartoes } from "@/components/GradeDeCartoes";
import { StatCard } from "@/components/StatCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { lerEmpregadosRelatorio, lerMovimentacoesRelatorio } from "@/lib/relatorios-historico";
import { useState } from "react";
import { BarraDeFiltros } from "@/components/layout/BarraDeFiltros";
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
import { TODAS } from "@/lib/empresa-context";
import { exportarCsv, formatarData } from "@/lib/gemape";
import { nomeTamanhoGravado } from "@/lib/estoque-tamanho";
import { filtrarHistoricoPorBuscaEPeriodo, periodoInvalido } from "@/lib/historico-busca";
import { ehBaixa } from "@/lib/historico-movimentacoes";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { useEmpresas, useItens } from "@/lib/hooks-gemape";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";
import { montarRelatorioTabelaHtml } from "@/lib/relatorio-padrao";

export function UniformesRelatorioFuncionario() {
  const [empresaSel, setEmpresaSel] = useState(TODAS);
  const [empregadoId, setEmpregadoId] = useState("");
  const [palavra, setPalavra] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const parametros = useParametrosBase();
  const tamanhoDe = (m: { tamanho_id?: string | null }) =>
    nomeTamanhoGravado(parametros, m.tamanho_id);

  const { data: empresas = [] } = useEmpresas();
  const { data: empregados = [] } = useQuery({ queryKey: ["empregados-relatorio", empresaSel], queryFn: () => lerEmpregadosRelatorio(supabase, empresaSel) });
  const { data: itens = [] } = useItens("uniforme", TODAS);
  const empregado = empregados.find((e) => e.id === empregadoId);
  const { data: movimentacoes = [], isLoading, isError, error } = useQuery({
    queryKey: ["relatorio-funcionario", "uniforme", empregadoId, empregado?.empresa_id],
    enabled: Boolean(empregadoId && empregado?.empresa_id),
    queryFn: () => lerMovimentacoesRelatorio(supabase, { modulo: "uniforme", empregadoId, empresaId: empregado?.empresa_id ?? undefined }),
  });

  const historico = movimentacoes.filter((m) => m.empregado_id === empregadoId);

  const totalEntregue = historico
    .filter((m) => m.tipo_movimentacao === "Saida" && !ehBaixa(m))
    .reduce((acc, m) => acc + m.quantidade, 0);
  const totalDevolvido = historico
    .filter((m) => m.tipo_movimentacao === "Devolucao")
    .reduce((acc, m) => acc + m.quantidade, 0);
  const totalBaixado = historico
    .filter((m) => ehBaixa(m))
    .reduce((acc, m) => acc + m.quantidade, 0);
  const emPosse = totalEntregue - totalDevolvido - totalBaixado;

  // Os cartões acima contam o histórico inteiro (o que está em posse não depende do período); a busca e o período filtram só a tabela, o CSV e o PDF.
  const situacaoDe = (h: (typeof historico)[number]) =>
    h.tipo_movimentacao === "Devolucao" ? "Devolvido" : ehBaixa(h) ? `Baixado: ${h.motivo_baixa ?? "—"}` : "Em posse";
  const nomeDoUniforme = (id: string | null) => itens.find((i) => i.id === id)?.nome;
  const comTexto = historico.map((h) => ({
    ...h,
    texto: [nomeDoUniforme(h.item_id), tamanhoDe(h), h.tipo_movimentacao, String(h.quantidade), situacaoDe(h), h.observacao, formatarData(h.data_movimentacao)].filter(Boolean).join(" "),
  }));
  const periodoErrado = periodoInvalido(dataInicio, dataFim);
  const visiveis = filtrarHistoricoPorBuscaEPeriodo(comTexto, { palavra, dataInicio, dataFim });
  const comFiltro = palavra.trim() !== "" || dataInicio !== "" || dataFim !== "";
  const descricaoFiltro = [
    palavra.trim() && `Busca: ${palavra.trim()}`,
    (dataInicio || dataFim) && `Período: ${dataInicio && dataFim ? `${formatarData(dataInicio)} a ${formatarData(dataFim)}` : dataInicio ? `a partir de ${formatarData(dataInicio)}` : `até ${formatarData(dataFim)}`}`,
  ].filter(Boolean) as string[];

  const imprimir = () =>
    abrirDocumento({
      titulo: "Histórico de movimentações de uniforme",
      html: montarRelatorioTabelaHtml({
        titulo: "Histórico de movimentações de uniforme",
        subtitulos: [empregado?.nome, ...descricaoFiltro],
        empresa: empresas.find((e) => e.id === empregado?.empresa_id)?.nome_fantasia,
        resumo: [["Entregues", String(totalEntregue)], ["Devolvidos", String(totalDevolvido)], ["Baixados", String(totalBaixado)], ["Em posse", String(emPosse)]],
        colunas: [{ titulo: "Data" }, { titulo: "Uniforme" }, { titulo: "Tamanho" }, { titulo: "Tipo" }, { titulo: "Qtd", direita: true }, { titulo: "Status/Motivo" }, { titulo: "Observação" }],
        linhas: visiveis.map((h) => [
          formatarData(h.data_movimentacao),
          nomeDoUniforme(h.item_id) ?? "—",
          tamanhoDe(h) || "—",
          h.tipo_movimentacao,
          String(h.quantidade),
          situacaoDe(h),
          h.observacao || "—",
        ]),
        vazio: comFiltro ? "Nenhuma movimentação encontrada para a busca." : "Nenhuma movimentação para este empregado.",
      }),
      arquivo: nomeArquivoDocumento("Histórico de movimentações de uniforme", empregado?.nome),
    });

  if (isError) return <div role="alert">Não foi possível carregar o histórico completo: {error.message}</div>;
  if (empregado && isLoading) return <div>Carregando histórico completo…</div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 items-end">
        <div className="space-y-1.5">
          <Label>Empresa</Label>
          <Select value={empresaSel} onValueChange={setEmpresaSel}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODAS}>Todas as empresas</SelectItem>
              {empresas.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nome_fantasia}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Empregado</Label>
          <Select value={empregadoId} onValueChange={setEmpregadoId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o empregado" />
            </SelectTrigger>
            <SelectContent>
              {empregados.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {empregado && (
        <>
          <GradeDeCartoes colunas={4}>
            <StatCard titulo="Entregues" subtitulo="Saídas de entrega ao empregado." valor={totalEntregue} icone={PackageCheck} compacto />
            <StatCard titulo="Devolvidos" subtitulo="O que ele devolveu ao estoque." valor={totalDevolvido} icone={Undo2} compacto />
            <StatCard titulo="Baixados" subtitulo="Baixas definitivas feitas com ele." valor={totalBaixado} icone={PackageX} compacto />
            <StatCard titulo="Em Posse" subtitulo="Entregue − devolvido − baixado." valor={emPosse} icone={UserCheck} compacto />
          </GradeDeCartoes>

          <h3 className="text-lg font-bold">Histórico de Movimentações</h3>
          <div className="flex flex-wrap items-end gap-2">
            <BarraDeFiltros>
              <div className="space-y-1">
                <Label htmlFor="hist-busca">Buscar</Label>
                <Input
                  id="hist-busca"
                  aria-label="Buscar no histórico"
                  type="search"
                  className="w-96 max-w-full"
                  placeholder="Buscar por uniforme, tamanho, tipo, motivo ou observação"
                  value={palavra}
                  onChange={(e) => setPalavra(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="hist-inicio">Início</Label>
                <Input id="hist-inicio" type="date" value={dataInicio} max={dataFim || undefined} onChange={(e) => setDataInicio(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="hist-fim">Fim</Label>
                <Input id="hist-fim" type="date" value={dataFim} min={dataInicio || undefined} onChange={(e) => setDataFim(e.target.value)} />
              </div>
              {comFiltro && (
                <Button type="button" variant="ghost" onClick={() => { setPalavra(""); setDataInicio(""); setDataFim(""); }}>
                  Limpar filtros
                </Button>
              )}
            </BarraDeFiltros>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={imprimir}>
                Relatório
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  exportarCsv(
                    `historico-${empregado.nome}`,
                    visiveis.map((h) => ({
                      Data: formatarData(h.data_movimentacao),
                      Uniforme: nomeDoUniforme(h.item_id),
                      Tamanho: tamanhoDe(h),
                      Tipo: h.tipo_movimentacao,
                      Qtd: h.quantidade,
                      Motivo: h.motivo_baixa || "Entrega/Uso",
                      Obs: h.observacao,
                    })),
                  )
                }
              >
                Exportar CSV
              </Button>
            </div>
          </div>
          {periodoErrado && (
            <p role="alert" className="text-sm text-destructive">A data de início não pode ser depois da data de fim.</p>
          )}
          {comFiltro && !periodoErrado && (
            <p role="status" className="text-sm text-muted-foreground">
              {visiveis.length} de {historico.length} movimentações.
            </p>
          )}
          <div className="panel overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Uniforme</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead>Status/Motivo</TableHead>
                  <TableHead>Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visiveis.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      {comFiltro ? "Nenhuma movimentação encontrada para a busca." : "Nenhuma movimentação para este empregado."}
                    </TableCell>
                  </TableRow>
                ) : (
                  visiveis.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell>{formatarData(h.data_movimentacao)}</TableCell>
                      <TableCell>{nomeDoUniforme(h.item_id)}</TableCell>
                      <TableCell>{tamanhoDe(h) || "—"}</TableCell>
                      <TableCell>{h.tipo_movimentacao}</TableCell>
                      <TableCell className="text-right">{h.quantidade}</TableCell>
                      <TableCell>
                        {situacaoDe(h)}
                      </TableCell>
                      <TableCell className="max-w-xs whitespace-normal" title={h.observacao ?? undefined}>{h.observacao || "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
