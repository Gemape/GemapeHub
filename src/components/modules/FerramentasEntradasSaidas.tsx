import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LinhasEsqueleto } from "@/components/Esqueletos";
import { BarraDeFiltros } from "@/components/layout/BarraDeFiltros";
import { GradeDeCartoes } from "@/components/GradeDeCartoes";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { exportarCsv, formatarData } from "@/lib/gemape";
import { hojeLocal } from "@/lib/empregados";
import { lerMovimentacoesRelatorio } from "@/lib/relatorios-historico";
import { useCaixasFerramentas, useEmpregados, useEmpresas, useItens } from "@/lib/hooks-gemape";
import { filtrarEntradasSaidas, linhasEntradasSaidas, resumoEntradasSaidas, type SentidoMovimento } from "@/lib/entradas-saidas-ferramentas";
import { montarRelatorioTabelaHtml } from "@/lib/relatorio-padrao";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";

const TITULO = "Relatório de entradas e saídas de ferramentas";

// Ferramentas > Relatórios > Entradas e saídas: o que entrou e o que saiu, por caixa e por empregado, com o motivo de cada saída.
// O Estoque só mostra onde a ferramenta está hoje; o movimento fica aqui.
export function FerramentasEntradasSaidas() {
  const { empresaId } = useEmpresa();
  const [dataInicial, setDataInicial] = useState(hojeLocal().slice(0, 8) + "01");
  const [dataFinal, setDataFinal] = useState(hojeLocal());
  const [sentido, setSentido] = useState<string>(TODAS);
  const [caixaId, setCaixaId] = useState<string>(TODAS);
  const [empregadoId, setEmpregadoId] = useState<string>(TODAS);
  const [motivo, setMotivo] = useState<string>(TODAS);

  const { data: movimentos = [], isLoading, isError, error } = useQuery({
    queryKey: ["relatorio-entradas-saidas", "ferramenta", empresaId],
    // Lê o histórico todo: a baixa sem caixa gravada procura a última entrega, que pode ser anterior ao período. O período é aplicado depois.
    queryFn: () => lerMovimentacoesRelatorio(supabase, { modulo: "ferramenta", empresaId: empresaId === TODAS ? undefined : empresaId }),
  });
  const { data: ferramentas = [] } = useItens("ferramenta", TODAS);
  const { data: caixas = [] } = useCaixasFerramentas(TODAS, "");
  const { data: empresas = [] } = useEmpresas();
  const { data: empregados = [] } = useEmpregados(TODAS);

  const nomeFerramenta = (id: string) => { const f = ferramentas.find((x) => x.id === id); return f ? `${f.codigo_sku ? `${f.codigo_sku} ` : ""}${f.nome}` : "—"; };
  const codigoCaixa = (id: string | null) => (id ? caixas.find((c) => c.id === id)?.codigo ?? "—" : "—");
  const nomeEmpregado = (id: string | null) => (id ? empregados.find((e) => e.id === id)?.nome ?? "—" : "—");
  const nomeEmpresa = (id: string | null) => empresas.find((e) => e.id === id)?.nome_fantasia ?? "—";

  const doPeriodo = linhasEntradasSaidas(movimentos).filter((l) => l.data >= dataInicial && l.data <= dataFinal);
  // Os motivos oferecidos são os que existem no período, para não listar escolha que daria tela vazia.
  const motivos = [...new Set(doPeriodo.map((l) => l.motivo).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  // Se o período mudou e o motivo escolhido não existe mais nele, o filtro deixa de valer em vez de esvaziar a tabela.
  const motivoAtivo = motivos.includes(motivo) ? motivo : TODAS;
  const linhas = filtrarEntradasSaidas(doPeriodo, {
    sentido: sentido === TODAS ? undefined : (sentido as SentidoMovimento),
    caixaId: caixaId === TODAS ? undefined : caixaId,
    empregadoId: empregadoId === TODAS ? undefined : empregadoId,
    motivo: motivoAtivo === TODAS ? undefined : motivoAtivo,
  });
  const resumo = resumoEntradasSaidas(linhas);

  const textoLinha = (l: (typeof linhas)[number]) => [
    formatarData(l.data), l.sentido, l.natureza, nomeFerramenta(l.itemId), codigoCaixa(l.caixaId), nomeEmpregado(l.empregadoId), String(l.quantidade), l.motivo || "—", l.observacao,
  ];
  const COLUNAS = ["Data", "Movimento", "Tipo", "Ferramenta", "Caixa", "Empregado", "Qtd", "Motivo", "Observação"];

  const imprimir = () =>
    abrirDocumento({
      titulo: TITULO,
      html: montarRelatorioTabelaHtml({
        titulo: TITULO,
        subtitulos: [
          `Período: ${formatarData(dataInicial)} a ${formatarData(dataFinal)}`,
          [sentido === TODAS ? "Entradas e saídas" : `${sentido}s`, caixaId === TODAS ? "todas as caixas" : `caixa ${codigoCaixa(caixaId)}`, empregadoId === TODAS ? "todos os empregados" : nomeEmpregado(empregadoId), motivoAtivo === TODAS ? "todos os motivos" : `motivo: ${motivoAtivo}`].join(" · "),
        ],
        empresa: empresaId === TODAS ? "Todas as empresas" : nomeEmpresa(empresaId),
        resumo: [["Entradas (unidades)", String(resumo.entradas)], ["Saídas (unidades)", String(resumo.saidas)], ...resumo.saidasPorMotivo.map(([m, q]): [string, string] => [`Saída · ${m}`, String(q)])],
        colunas: COLUNAS.map((titulo) => ({ titulo, ...(titulo === "Qtd" ? { direita: true } : {}) })),
        linhas: linhas.map(textoLinha),
        vazio: "Nenhuma entrada ou saída no período.",
      }),
      arquivo: nomeArquivoDocumento(TITULO, dataInicial, dataFinal),
    });

  if (isError) return <div role="alert">Não foi possível carregar as entradas e saídas: {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-2">
        <BarraDeFiltros>
          <div className="space-y-1.5"><Label>Data inicial</Label><Input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Data final</Label><Input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} /></div>
          <Filtro rotulo="Movimento" valor={sentido} aoMudar={setSentido} todas="Entradas e saídas" opcoes={[["Entrada", "Entradas"], ["Saída", "Saídas"]]} />
          <Filtro rotulo="Caixa" valor={caixaId} aoMudar={setCaixaId} todas="Todas as caixas" opcoes={[...caixas].sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR")).map((c) => [c.id, c.codigo])} />
          <Filtro rotulo="Empregado" valor={empregadoId} aoMudar={setEmpregadoId} todas="Todos os empregados" opcoes={[...empregados].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((e) => [e.id, e.nome])} />
          <Filtro rotulo="Motivo" valor={motivo} aoMudar={setMotivo} todas="Todos os motivos" opcoes={motivos.map((m) => [m, m])} />
        </BarraDeFiltros>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={imprimir}>Relatório</Button>
          <Button variant="outline" disabled={linhas.length === 0} onClick={() => exportarCsv("entradas-saidas-ferramentas", linhas.map((l) => Object.fromEntries(textoLinha(l).map((v, n) => [COLUNAS[n], v]))))}>Exportar CSV</Button>
        </div>
      </div>

      <GradeDeCartoes colunas={3} classe="xl:w-9/12">
        <StatCard titulo="Entradas" subtitulo="Unidades que entraram no período: compras e devoluções dos empregados." valor={resumo.entradas} detalhe={`${formatarData(dataInicial)} a ${formatarData(dataFinal)}`} icone={ArrowDownToLine} compacto />
        <StatCard titulo="Saídas" subtitulo="Unidades que saíram no período: entregas aos empregados e baixas." valor={resumo.saidas} detalhe={`${linhas.filter((l) => l.sentido === "Saída").length} movimentação(ões)`} icone={ArrowUpFromLine} compacto />
        <StatCard titulo="Saída mais frequente" subtitulo="Motivo com mais unidades nas saídas filtradas." valor={resumo.saidasPorMotivo[0]?.[0] ?? "—"} detalhe={resumo.saidasPorMotivo[0] ? `${resumo.saidasPorMotivo[0][1]} unidade(s)` : "Sem saídas no período"} icone={ArrowUpFromLine} compacto />
      </GradeDeCartoes>

      {resumo.saidasPorMotivo.length > 0 && (
        <section className="panel space-y-2 p-4" aria-label="Saídas por motivo">
          <h3 className="text-sm font-semibold">Saídas por motivo</h3>
          <ul className="flex flex-wrap gap-2 text-sm">
            {resumo.saidasPorMotivo.map(([m, q]) => <li key={m} className="rounded-full border bg-muted/40 px-3 py-1">{m}: <strong>{q}</strong></li>)}
          </ul>
        </section>
      )}

      <div className="panel max-h-[max(12rem,calc(100dvh-27rem))] flex flex-col overflow-hidden [&>div]:min-h-0 [&>div]:flex-1 [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-card print:max-h-none print:overflow-visible print:border-none print:shadow-none">
        <Table>
          <TableHeader>
            <TableRow>{COLUNAS.map((c) => <TableHead key={c} className={c === "Qtd" ? "text-right" : undefined}>{c}</TableHead>)}</TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <LinhasEsqueleto colunas={COLUNAS.length} />
              : linhas.length === 0 ? <TableRow><TableCell colSpan={COLUNAS.length} className="text-center">Nenhuma entrada ou saída no período.</TableCell></TableRow>
                : linhas.map((l) => (
                  <TableRow key={l.chave}>
                    <TableCell>{formatarData(l.data)}</TableCell>
                    <TableCell className={l.sentido === "Saída" ? "font-medium text-destructive" : "font-medium text-success"}>{l.sentido}</TableCell>
                    <TableCell>{l.natureza}</TableCell>
                    <TableCell>{nomeFerramenta(l.itemId)}</TableCell>
                    <TableCell className="font-mono text-xs">{codigoCaixa(l.caixaId)}</TableCell>
                    <TableCell>{nomeEmpregado(l.empregadoId)}</TableCell>
                    <TableCell className="text-right">{l.quantidade}</TableCell>
                    <TableCell>{l.motivo || "—"}</TableCell>
                    <TableCell className="max-w-64 truncate" title={l.observacao}>{l.observacao}</TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Filtro({ rotulo, valor, aoMudar, todas, opcoes }: { rotulo: string; valor: string; aoMudar: (v: string) => void; todas: string; opcoes: (readonly [string, string])[] }) {
  return (
    <div className="space-y-1.5">
      <Label>{rotulo}</Label>
      <Select value={valor} onValueChange={aoMudar}>
        <SelectTrigger className="w-52 max-w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={TODAS}>{todas}</SelectItem>
          {opcoes.map(([v, t]) => <SelectItem key={v} value={v}>{t}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
