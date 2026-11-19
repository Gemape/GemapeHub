import { LinhasEsqueleto } from "@/components/Esqueletos";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Printer, Wallet } from "lucide-react";

import { BarraDeFiltros } from "@/components/layout/BarraDeFiltros";
import { EtiquetaVencimento } from "@/components/modules/FrotaModulo";
import { Cartao } from "@/components/modules/CartoesIndicadoresFrota";
import { COR_DA_FAIXA, COR_GRAFICO, GraficoBarras, GraficoRosca, PainelGraficos, QuadroGrafico } from "@/components/modules/GraficosPainel";
import { InterpretacaoFrota } from "@/components/modules/InterpretacaoFrota";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { hojeBrasilia } from "@/lib/checklist-veiculo";
import { useEmpresa } from "@/lib/empresa-context";
import { lerMesesBase } from "@/lib/escalonamento-vistorias";
import { ferramentasAbaixoDoMinimo, posicaoDasFerramentas, type PosicaoDaFerramenta } from "@/lib/estoque-ferramentas-posicao";
import { indicadoresDeFerramentas, interpretacoesDeFerramentas, ocorrenciaDaFerramentaParaPrazo, situacaoDasOcorrenciasNaColuna, situacaoDaVistoriaNaColuna } from "@/lib/ferramentas-dashboard";
import { formatarData, formatarMoeda, valorTotalEmEstoque } from "@/lib/gemape";
import { useItens, useMovimentacoes, useOcorrencias, useTodosCaixaItens } from "@/lib/hooks-gemape";
import { indicadorDeEstoque, textoPercentual } from "@/lib/indicador-estoque";
import { ehDoGrupo, gruposDasFerramentas } from "@/lib/movimentacoes-grupo-caixa";
import { lerPrazosOcorrencias } from "@/lib/prazo-ocorrencias";
import { EVENTO_TRATATIVAS_FERRAMENTA, lerTratativas } from "@/lib/tratativa-ocorrencia-ferramenta";
import { useVistoriasDasCaixas } from "@/lib/use-vistorias-caixas";

const TODOS_OS_GRUPOS = "__todos__";
const ALTURA_COMPACTA = "h-[clamp(6rem,17vh,9.5rem)]";
const semAcento = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

// Ferramentas > Módulo > Dashboard: o mesmo desenho da Frota de Veículos. Em cima, filtros e ações; os cartões de indicadores com os gráficos ao lado; embaixo a lista das caixas
// com a situação da vistoria e das ocorrências de cada uma. Os indicadores são sempre os de todas as caixas; o filtro e a busca só mexem na lista.
export function DashboardFerramentas() {
  const { empresaId } = useEmpresa();
  const navegar = useNavigate();
  const { data: ferramentas = [] } = useItens("ferramenta", empresaId);
  const { data: movimentos = [] } = useMovimentacoes("ferramenta", empresaId);
  const { data: itensDeCaixa = [] } = useTodosCaixaItens();
  const { data: ocorrencias = [] } = useOcorrencias("", "ferramenta");
  // Lidos depois de montar (o armazenamento é do navegador), como no Plano de vistorias.
  const [mesesBase, setMesesBase] = useState<ReturnType<typeof lerMesesBase>>({});
  const [tratativas, setTratativas] = useState<ReturnType<typeof lerTratativas>>({});
  useEffect(() => {
    setMesesBase(lerMesesBase());
    const ler = () => setTratativas(lerTratativas());
    ler();
    window.addEventListener(EVENTO_TRATATIVAS_FERRAMENTA, ler);
    return () => window.removeEventListener(EVENTO_TRATATIVAS_FERRAMENTA, ler);
  }, []);
  const { linhas, isLoading } = useVistoriasDasCaixas(mesesBase);
  const [grupo, setGrupo] = useState(TODOS_OS_GRUPOS);
  const [busca, setBusca] = useState("");
  const hoje = hojeBrasilia();
  const prazos = lerPrazosOcorrencias();

  const posicoes = useMemo(
    () => new Map<string, PosicaoDaFerramenta>(posicaoDasFerramentas(ferramentas, movimentos, itensDeCaixa).map((p) => [p.ferramentaId, p])),
    [ferramentas, movimentos, itensDeCaixa],
  );
  const abaixo = useMemo(() => ferramentasAbaixoDoMinimo(ferramentas, posicoes), [ferramentas, posicoes]);
  const soma = (campo: "guardada" | "comEmpregado" | "semCaixa" | "saldo") => [...posicoes.values()].reduce((t, p) => t + p[campo], 0);
  const saldoTotal = soma("saldo");
  const semCaixa = soma("semCaixa");
  const ativas = ferramentas.filter((f) => f.status !== "Inativo").length;
  const zeradas = abaixo.filter((l) => l.situacao === "Zerado").length;
  const acimaDoMinimo = indicadorDeEstoque(ativas - abaixo.length, ativas);
  const guardadas = indicadorDeEstoque(soma("guardada"), saldoTotal);
  const comEmpregado = indicadorDeEstoque(soma("comEmpregado"), saldoTotal, false);
  const foraDaCaixa = indicadorDeEstoque(semCaixa, saldoTotal, false);

  const ocorrenciasParaPrazo = ocorrencias.map((o) => ({ ocorrencia: o, prazo: ocorrenciaDaFerramentaParaPrazo(o, tratativas[o.id]) }));
  const indicadores = indicadoresDeFerramentas({ vistorias: linhas.map((l) => l.resultado.situacao), ocorrencias: ocorrenciasParaPrazo.map((o) => o.prazo), hoje, prazos });

  const grupos = gruposDasFerramentas(ferramentas);
  const filtroDoGrupo = grupos.includes(grupo) ? grupo : TODOS_OS_GRUPOS;
  const grupoDaFerramenta = new Map(ferramentas.map((f) => [f.id, f] as const));
  const quantasFerramentas = (caixaId: string) => itensDeCaixa.filter((i) => i.caixa_id === caixaId).length;
  const lista = linhas
    .filter((l) => filtroDoGrupo === TODOS_OS_GRUPOS || itensDeCaixa.some((i) => {
      const f = grupoDaFerramenta.get(i.ferramenta_id);
      return i.caixa_id === l.caixa.id && !!f && ehDoGrupo(f, filtroDoGrupo);
    }))
    .filter((l) => semAcento(`${l.caixa.codigo} ${l.caixa.descricao ?? ""} ${l.portador ?? ""} ${l.responsavel ?? ""}`).includes(semAcento(busca.trim())));
  const ocorrenciasDaCaixa = (caixaId: string) => ocorrenciasParaPrazo.filter((o) => o.ocorrencia.caixa_id === caixaId).map((o) => o.prazo);

  const barras = [
    { nome: "Vistorias", pct: indicadores.vistorias.pct, faixa: indicadores.vistorias.faixa },
    { nome: "Ocorr.", pct: indicadores.ocorrencias.pct, faixa: indicadores.ocorrencias.faixa },
    { nome: "Conform.", pct: indicadores.conformidadeGeral.pct, faixa: indicadores.conformidadeGeral.faixa },
    { nome: "Estoque", pct: acimaDoMinimo.pct, faixa: acimaDoMinimo.faixa },
  ];
  const rosca = [
    { nome: "Guardadas", valor: Math.max(soma("guardada"), 0), cor: COR_GRAFICO.verde },
    { nome: "Com empregado", valor: Math.max(soma("comEmpregado"), 0), cor: COR_GRAFICO.azul },
    { nome: "Sem caixa", valor: Math.max(semCaixa, 0), cor: COR_GRAFICO.cinza },
  ];

  return (
    <div className="space-y-3">
      <section className="space-y-2" aria-label="Indicadores das ferramentas">
        <div className="flex flex-wrap items-end gap-2">
          <BarraDeFiltros>
            <Select value={filtroDoGrupo} onValueChange={setGrupo}>
              <SelectTrigger aria-label="Filtrar as caixas por grupo de ferramentas" className="h-9 w-56"><SelectValue placeholder="Todos os grupos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS_OS_GRUPOS}>Todos os grupos</SelectItem>
                {grupos.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input aria-label="Buscar caixa por número, descrição ou portador" placeholder="Buscar por caixa ou portador" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </BarraDeFiltros>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void navegar({ to: "/ferramentas", search: { aba: "ferramentas-por-caixa" } })}>
              <Printer className="h-4 w-4" /> Relatório
            </Button>
            <InterpretacaoFrota titulo="Interpretação dos indicadores das ferramentas" itens={interpretacoesDeFerramentas(indicadores, acimaDoMinimo)} />
          </div>
        </div>
        <div className="grid items-stretch gap-3 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Cartao titulo="Ferramentas · Conformidade geral (SLA)" subtitulo="Tarefas no prazo ÷ tarefas atribuídas: vistorias e ocorrências." indicador={indicadores.conformidadeGeral} compacto />
            <Cartao titulo="Almoxarifado · Vistorias periódicas em dia" subtitulo="Vistorias feitas no prazo ÷ as que já venceram (feitas + vencidas)." indicador={indicadores.vistorias} compacto />
            <Cartao titulo="Almoxarifado · Ocorrências tratadas no prazo" subtitulo="Tratadas no prazo ÷ tratadas + vencidas sem tratativa." indicador={indicadores.ocorrencias} compacto />
            <Cartao titulo="Estoque · Ferramentas acima do mínimo" subtitulo="Ferramentas ativas acima do estoque mínimo ÷ todas as ativas." indicador={{ ...acimaDoMinimo, detalhe: `${abaixo.length} de ${ativas} no mínimo ou abaixo · ${zeradas} zerada(s)` }} compacto />
            <Cartao titulo="Estoque · Guardadas nas caixas" subtitulo="Unidades nas caixas, disponíveis ÷ unidades em estoque." indicador={{ ...guardadas, detalhe: `${soma("guardada")} de ${saldoTotal} unidades` }} compacto />
            <Cartao titulo="Estoque · Com empregado" subtitulo="Unidades entregues e ainda não devolvidas ÷ unidades em estoque." indicador={{ ...comEmpregado, detalhe: `${soma("comEmpregado")} de ${saldoTotal} unidades` }} compacto />
            <Cartao titulo="Estoque · Sem caixa" subtitulo="Unidades fora das caixas ÷ unidades em estoque." indicador={{ ...foraDaCaixa, detalhe: semCaixa < 0 ? `Caixas guardam ${-semCaixa} a mais que o estoque` : `${semCaixa} de ${saldoTotal} unidades` }} compacto />
            <Cartao titulo="Estoque · Valor em estoque" subtitulo="Itens × preço informado; sem preço conta como zero." indicador={{ pct: null, faixa: null, detalhe: `${saldoTotal} unidades em ${ativas} ferramentas ativas` }} valor={formatarMoeda(valorTotalEmEstoque(ferramentas))} icone={Wallet} compacto />
          </div>
          <PainelGraficos compacto>
            <QuadroGrafico titulo="Indicadores (%)" formula="no prazo ÷ com desfecho × 100." altura={ALTURA_COMPACTA}>
              <GraficoBarras
                dados={barras.map((b) => ({ nome: b.nome, valor: b.pct ?? 0 }))}
                categoria="nome"
                series={[{ chave: "valor", nome: "Indicador", cor: COR_GRAFICO.azul }]}
                cores={barras.map((b) => (b.faixa ? COR_DA_FAIXA[b.faixa] : COR_GRAFICO.cinza))}
                meta={{ valor: 90, rotulo: "Meta 90%" }}
                sufixo="%"
              />
            </QuadroGrafico>
            <QuadroGrafico titulo="Onde estão as ferramentas" formula="unidades por posição ÷ unidades em estoque." altura={ALTURA_COMPACTA} vazio={rosca.every((r) => r.valor === 0)}>
              <GraficoRosca dados={rosca} />
            </QuadroGrafico>
          </PainelGraficos>
        </div>
      </section>

      {/* A lista usa o que sobra da janela e rola por dentro, para a página não rolar, como na Frota. */}
      <div className="max-h-[max(8rem,calc(100dvh-46rem))] flex flex-col overflow-hidden rounded-xl border [&>div]:min-h-0 [&>div]:flex-1 [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-card">
        <Table className="min-w-[1100px] table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[26%]">Caixa</TableHead>
              <TableHead className="w-[16%]">Portador</TableHead>
              <TableHead className="w-[8%] pr-6 text-right">Ferramentas</TableHead>
              <TableHead className="w-[10%]">Última vistoria</TableHead>
              <TableHead className="w-[12%] text-center">Vistoria</TableHead>
              <TableHead className="w-[12%] text-center">Ocorrências</TableHead>
              <TableHead className="w-[10%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <LinhasEsqueleto colunas={7} />}
            {!isLoading && lista.length === 0 && <TableRow><TableCell colSpan={7} className="py-6 text-center text-muted-foreground">Nenhuma caixa encontrada.</TableCell></TableRow>}
            {lista.map((l) => (
              <TableRow key={l.caixa.id} className="cursor-pointer" onClick={() => void navegar({ to: "/ferramentas", search: { aba: "caixas" } })}>
                <TableCell className="font-medium"><span className="font-mono text-xs">{l.caixa.codigo}</span>{l.caixa.descricao ? ` — ${l.caixa.descricao}` : ""}</TableCell>
                <TableCell className="truncate">{l.portador ?? "—"}</TableCell>
                <TableCell className="pr-6 text-right tabular-nums">{quantasFerramentas(l.caixa.id)}</TableCell>
                <TableCell>{l.ultimaVistoria ? formatarData(l.ultimaVistoria) : "—"}</TableCell>
                <TableCell><EtiquetaVencimento valor={situacaoDaVistoriaNaColuna(l.resultado.situacao)} /></TableCell>
                <TableCell><EtiquetaVencimento valor={situacaoDasOcorrenciasNaColuna(ocorrenciasDaCaixa(l.caixa.id), hoje, prazos)} /></TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" className="rounded-full" onClick={(e) => { e.stopPropagation(); void navegar({ to: "/ferramentas", search: { aba: "caixas" } }); }}>Ver caixa</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
