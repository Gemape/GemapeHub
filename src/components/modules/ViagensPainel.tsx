import { CalendarDays, Info, PieChart } from "lucide-react";
import { ViagensExtrato } from "./ViagensExtrato";
import { ViagensLista } from "./ViagensLista";
import { iconeDoTipo } from "./icones-viagens";
import { useMemo, useState } from "react";

import { GradeDeCartoes } from "@/components/GradeDeCartoes";
import { Cartao } from "@/components/modules/CartoesIndicadoresFrota";
import { QuestionarioFormulario } from "@/components/parametros/QuestionarioFormulario";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TODAS } from "@/lib/empresa-context";
import { empregadoAtivo } from "@/lib/empregados";
import { useEmpregados } from "@/lib/hooks-gemape";
import { questionarioPublicado } from "@/lib/questionario-destinos";
import { ID_TECNICO_RESPONSAVEL, habilitadosAtivos, habilitadosDaPergunta, lerEstado, tiposDeDespesa } from "@/lib/questionario-despesas";
import { descricoesFaixas, faixaDoIndice, lerFaixas, type Faixa } from "@/lib/faixas-desempenho";
import { lerPrazos, type PrazosViagens } from "@/lib/prazo-viagens";
import { listarRelatorios } from "@/lib/relatorios-viagens";
import { listarRespostas } from "@/lib/respostas-despesas";
import {
  MESES, dadosDoLancamento, fechamentoDoRelatorio, formatarPercentual, indicadoresGlobais, periodoAtual, resultadosTecnicos, rotuloPeriodo,
} from "@/lib/viagens";

// Painel do módulo Viagens (decisões 176 e 177): botões dos questionários, indicadores globais e resultados dos técnicos do mês escolhido.
export function ViagensPainel({ emitente }: { emitente: string }) {
  const [estado] = useState(lerEstado);
  const tipos = tiposDeDespesa(estado);
  const [tipo, setTipo] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState(periodoAtual);
  const prazos = useMemo(() => lerPrazos(), []);
  const [extratoDe, setExtratoDe] = useState<string | null>(null);
  // O painel cabe numa página só (decisão 396): as duas listas ficam atrás de botões, uma de cada vez, e rolam por dentro.
  const [visao, setVisao] = useState<"despesas" | "tecnicos">("despesas");
  // Relê os lançamentos sempre que volta do formulário, para o que acabou de ser enviado entrar na conta.
  const lista = useMemo(() => listarRespostas(), [tipo]);
  // Relatórios gerados na lista: o dia de cada um mede o índice de fechamento do relatório no prazo.
  const [relatorios, setRelatorios] = useState(listarRelatorios);
  const criadoEmDe = useMemo(() => new Map(relatorios.flatMap((r) => r.despesaIds.map((id) => [id, r.criadoEm] as const))), [relatorios]);
  const { data: empregados = [], isSuccess: empregadosLidos } = useEmpregados(TODAS);
  const idsAtivos = useMemo(() => new Set(empregados.filter((e) => empregadoAtivo(e)).map((e) => e.id)), [empregados]);
  const tecnicos = useMemo(() => {
    const q14 = estado.perguntas.find((p) => p.id === ID_TECNICO_RESPONSAVEL);
    const habilitados = q14 ? (habilitadosDaPergunta(estado, q14) ?? []) : [];
    return (empregadosLidos ? habilitadosAtivos(habilitados, idsAtivos) : habilitados).map((h) => h.nome);
  }, [estado, empregadosLidos, idsAtivos]);
  // O índice de fechamento de cada técnico é calculado uma vez por mudança de lista, período, prazo ou relatório, e não a cada render.
  const fechamentoDosTecnicos = useMemo(
    () => new Map(tecnicos.map((nome) => [nome, fechamentoDoRelatorio(lista, periodo, prazos, criadoEmDe, undefined, nome).indice] as const)),
    [tecnicos, lista, periodo, prazos, criadoEmDe],
  );
  // O filtro de técnico da lista também traz os empregados Avulso lançados (dec 220); os resultados seguem só com os técnicos cadastrados.
  const responsaveisDaLista = useMemo(() => {
    const avulsos = lista.map(dadosDoLancamento).filter((d) => d.avulso && d.responsavel).map((d) => d.responsavel as string);
    return [...new Set([...tecnicos, ...avulsos])];
  }, [lista, tecnicos]);
  const anos = useMemo(() => {
    const dosLancamentos = lista.map((r) => Number((dadosDoLancamento(r).dataDespesa ?? r.data).slice(0, 4))).filter((a) => a > 2000);
    return [...new Set([periodoAtual().ano, periodo.ano, ...dosLancamentos])].sort((a, b) => b - a);
  }, [lista, periodo.ano]);

  if (tipo !== null) {
    return <QuestionarioFormulario key={tipo} tipoInicial={tipo} semPerguntaTipo onVoltar={{ rotulo: "Voltar ao painel", aoClicar: () => setTipo(null) }} />;
  }

  const globais = indicadoresGlobais(lista, periodo, prazos);
  const resultados = resultadosTecnicos(lista, periodo, tecnicos, prazos);
  const fechamentoGlobal = fechamentoDoRelatorio(lista, periodo, prazos, criadoEmDe);
  const fechamentoDe = fechamentoDosTecnicos;
  const noPeriodo = globais.quantidade;
  // O mesmo período vale para os indicadores e para os resultados dos técnicos: o seletor aparece nas duas áreas (decisão 300).
  const alternador = (
    <div role="group" aria-label="Lista exibida" className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant={visao === "despesas" ? "default" : "secondary"} aria-pressed={visao === "despesas"} onClick={() => setVisao("despesas")}>Despesas de {rotuloPeriodo(periodo)}</Button>
      <Button type="button" size="sm" variant={visao === "tecnicos" ? "default" : "secondary"} aria-pressed={visao === "tecnicos"} onClick={() => setVisao("tecnicos")}>Resultados dos técnicos</Button>
    </div>
  );
  const seletorPeriodo = (area: string) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm"><CalendarDays className="mr-1 h-4 w-4" />{rotuloPeriodo(periodo)}</Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-3">
        <p className="text-sm font-medium">Escolher outro período</p>
        <div className="space-y-1">
          <Label htmlFor={`periodo-mes-${area}`}>Mês</Label>
          <Select value={String(periodo.mes)} onValueChange={(v) => { if (v) setPeriodo((p) => ({ ...p, mes: Number(v) })); }}>
            <SelectTrigger id={`periodo-mes-${area}`} aria-label="Mês"><SelectValue /></SelectTrigger>
            <SelectContent>{MESES.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`periodo-ano-${area}`}>Ano</Label>
          <Select value={String(periodo.ano)} onValueChange={(v) => { if (v) setPeriodo((p) => ({ ...p, ano: Number(v) })); }}>
            <SelectTrigger id={`periodo-ano-${area}`} aria-label="Ano"><SelectValue /></SelectTrigger>
            <SelectContent>{anos.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="space-y-4">
      <section className="space-y-2" aria-labelledby="viagens-questionarios">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h2 id="viagens-questionarios" className="text-lg font-semibold">Questionários de despesas</h2>
          <p className="text-sm text-muted-foreground">Escolha o tipo da despesa a lançar.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {tipos.map((t) => {
            const Icone = iconeDoTipo(t);
            const acaoRequerida = !questionarioPublicado(estado, t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                disabled={acaoRequerida}
                title={acaoRequerida ? "Ação requerida: corrija as ramificações em Parâmetros antes de publicar" : undefined}
                className="panel disabled:cursor-not-allowed disabled:opacity-60 flex min-h-12 items-center justify-center gap-3 px-3 py-1.5 text-left text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <Icone className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
                <span className="break-words">{t}</span>
                {acaoRequerida && <span className="text-xs font-semibold text-destructive">Ação requerida</span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-2" aria-labelledby="viagens-indicadores">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="viagens-indicadores" className="text-lg font-semibold">Indicadores globais de despesas</h2>
          <div className="flex flex-wrap items-center gap-2">
          <LegendaFaixas />
          {seletorPeriodo("indicadores")}
          </div>
        </div>
        <GradeDeCartoes colunas={4}>
          <Indicador titulo="Despesas lançadas no mês" valor={String(globais.quantidade)} />
          <Indicador
            titulo="Índice de conformidade de lançamento"
            valor={formatarPercentual(globais.icl)}
            pct={globais.icl}
            faixa={faixaDoIndice(globais.icl)?.faixa}
            detalhe={globais.noIndice ? `${globais.noIndice - globais.naoConformes} de ${globais.noIndice} lançadas pelo próprio técnico` : "Sem lançamentos no índice neste mês"}
            explicacao={<ExplicacaoIcl />}
          />
          <Indicador
            titulo="Índice de lançamento no prazo"
            valor={formatarPercentual(globais.prazo)}
            pct={globais.prazo}
            faixa={faixaDoIndice(globais.prazo)?.faixa}
            detalhe={prazos.mecanicoAplica === false ? "Indicador desligado em Parâmetros" : globais.medidosNoPrazo ? `${globais.noPrazo} de ${globais.medidosNoPrazo} lançadas no prazo` : "Sem lançamentos do técnico mecânico neste mês"}
            explicacao={<ExplicacaoPrazo prazos={prazos} />}
            roxo
          />
          <Indicador
            titulo="Índice de fechamento do relatório no prazo"
            valor={formatarPercentual(fechamentoGlobal.indice)}
            pct={fechamentoGlobal.indice}
            faixa={faixaDoIndice(fechamentoGlobal.indice)?.faixa}
            detalhe={prazos.pcmAplica === false ? "Indicador desligado em Parâmetros" : fechamentoGlobal.medidos ? `${fechamentoGlobal.noPrazo} de ${fechamentoGlobal.medidos} fechadas no prazo` : "Sem despesas para fechar neste mês"}
            explicacao={<ExplicacaoFechamento prazos={prazos} />}
            roxo
          />
        </GradeDeCartoes>
      </section>

      {/* A lista fica montada e só escondida, para não perder o filtro e as despesas marcadas ao ver os resultados dos técnicos. */}
      <div hidden={visao !== "despesas"}><ViagensLista lista={lista} periodo={periodo} tipos={tipos} tecnicos={responsaveisDaLista} emitente={emitente} relatorios={relatorios} aoGerarRelatorio={() => setRelatorios(listarRelatorios())} alternador={alternador} /></div>

      {visao === "tecnicos" && <section className="space-y-2" aria-labelledby="viagens-tecnicos">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {alternador}
          <h2 id="viagens-tecnicos" className="sr-only">Resultados dos técnicos</h2>
          {seletorPeriodo("tecnicos")}
        </div>
        {noPeriodo === 0 && <p className="text-sm text-muted-foreground">Nenhuma despesa lançada em {rotuloPeriodo(periodo)}.</p>}
        <div className="panel flex max-h-[max(8rem,calc(100dvh-43rem))] flex-col overflow-hidden [&>div]:min-h-0 [&>div]:flex-1 [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-2 sm:px-4">Técnico</TableHead>
                <TableHead className="px-2 text-right sm:px-4"><span className="sm:hidden">Lanç.</span><span className="hidden sm:inline">Lançamentos</span></TableHead>
                <TableHead className="px-2 text-right sm:px-4"><span className="sm:hidden" title="Índice de conformidade de lançamento">ICL</span><span className="hidden sm:inline">Conformidade</span></TableHead>
                <TableHead className="px-2 text-right text-purple-700 dark:text-purple-300 sm:px-4"><span className="sm:hidden" title="Índice de lançamento no prazo">Prazo</span><span className="hidden sm:inline">No prazo</span></TableHead>
                <TableHead className="px-2 text-right text-purple-700 dark:text-purple-300 sm:px-4"><span className="sm:hidden" title="Índice de fechamento do relatório no prazo">Fech.</span><span className="hidden sm:inline">Fechamento</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resultados.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Nenhum técnico habilitado. Habilite em Parâmetros &gt; Viagens &gt; Parâmetros Específicos.</TableCell></TableRow>
              )}
              {resultados.map((r) => (
                <TableRow key={r.nome}>
                  <TableCell className="px-2 font-medium sm:px-4">
                    <button type="button" onClick={() => setExtratoDe(r.nome)} title="Abrir o extrato do técnico" className="text-left text-primary underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">{r.nome}</button>
                  </TableCell>
                  <TableCell className="px-2 text-right sm:px-4">{r.lancamentos}</TableCell>
                  <TableCell className="px-2 text-right sm:px-4"><ValorComFaixa valor={r.icl} /></TableCell>
                  <TableCell className="px-2 text-right font-medium sm:px-4"><ValorComFaixa valor={r.prazo} /></TableCell>
                  <TableCell className="px-2 text-right font-medium sm:px-4"><ValorComFaixa valor={fechamentoDe.get(r.nome) ?? null} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>}

      {extratoDe && <ViagensExtrato tecnico={extratoDe} periodoInicial={periodo} lista={lista} aoFechar={() => setExtratoDe(null)} />}
    </div>
  );
}

function Indicador({ titulo, valor, detalhe, explicacao, roxo, faixa, pct }: { titulo: string; valor: string; detalhe?: string; explicacao?: React.ReactNode; roxo?: boolean; faixa?: Faixa | undefined; pct?: number | null | undefined }) {
  return <Cartao titulo={titulo} valor={valor} indicador={{ pct: pct ?? null, faixa: faixa ?? null, detalhe: detalhe ?? "" }} extra={explicacao} classe={roxo ? "border-l-4 border-l-purple-600" : ""} compacto />;
}

function ExplicacaoIcl() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label="Como é calculado o índice de conformidade de lançamento" className="shrink-0 text-muted-foreground hover:text-primary">
          <Info className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-2 text-sm">
        <p className="font-semibold">Índice de conformidade de lançamento (ICL)</p>
        <p>ICL = (despesas lançadas pelo próprio técnico ÷ total de despesas do técnico, técnico + gestor) × 100.</p>
        <p>Exemplo: o técnico teve 10 despesas; 8 ele mesmo lançou e 2 o gestor teve de lançar. ICL = 8 ÷ 10 × 100 = 80%.</p>
        <p className="text-muted-foreground">Conta como lançamento do gestor quando quem lança (pergunta 04) é do PCM ou do Administrativo. Os marcados como “Avulso – técnico não monitorado” ficam fora da conta.</p>
      </PopoverContent>
    </Popover>
  );
}

const dias = (n: number) => `${n} ${n === 1 ? "dia" : "dias"}`;

function ExplicacaoPrazo({ prazos }: { prazos: PrazosViagens }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label="Como é calculado o índice de lançamento no prazo" className="shrink-0 text-muted-foreground hover:text-primary">
          <Info className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-2 text-sm">
        <p className="font-semibold">Índice de lançamento no prazo</p>
        <p>Índice = (despesas lançadas dentro do prazo ÷ total de despesas lançadas pelo técnico mecânico no período) × 100.</p>
        <p>Exemplo: 10 despesas no mês; 9 foram lançadas dentro do prazo, contado em dias depois da data da despesa. Índice = 9 ÷ 10 × 100 = 90%.</p>
        <p>
          {prazos.mecanicoAplica === false
            ? "O indicador está desligado para o técnico mecânico em Parâmetros, então o índice não é calculado."
            : `Prazo de hoje para o técnico mecânico lançar: ${dias(prazos.mecanico)}. Despesas lançadas pelo PCM ou pelo Administrativo não entram neste índice.`}
        </p>
        <p className="text-muted-foreground">O prazo se configura em Parâmetros &gt; Viagens &gt; Parâmetros Específicos e as faixas, em Parâmetros &gt; Veículos &gt; Parâmetros Específicos. Conta a diferença entre a data da despesa e o dia em que o formulário foi enviado.</p>
      </PopoverContent>
    </Popover>
  );
}

const COR_PONTO: Record<Faixa, string> = { verde: "bg-green-600", amarelo: "bg-amber-500", vermelho: "bg-red-600" };
const COR_TEXTO: Record<Faixa, string> = { verde: "text-green-700 dark:text-green-400", amarelo: "text-amber-700 dark:text-amber-400", vermelho: "text-red-700 dark:text-red-400" };

// A cor nunca vai sozinha: o ponto vem com o nome da faixa por escrito.
function ChipFaixa({ faixa }: { faixa: Faixa }) {
  const f = descricoesFaixas(lerFaixas()).find((x) => x.faixa === faixa)!;
  return (
    <p className="flex items-center gap-1.5 text-xs font-medium">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${COR_PONTO[faixa]}`} aria-hidden="true" />
      <span>{f.cor}: {f.classificacao}</span>
    </p>
  );
}

function ValorComFaixa({ valor }: { valor: number | null }) {
  const f = faixaDoIndice(valor);
  if (!f) return <>{formatarPercentual(valor)}</>;
  return (
    <span className={`inline-flex items-center justify-end gap-1.5 ${COR_TEXTO[f.faixa]}`} title={`${f.cor}: ${f.classificacao}`}>
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${COR_PONTO[f.faixa]}`} aria-hidden="true" />
      <span>{formatarPercentual(valor)}</span>
      <span className="sr-only">{f.cor}, {f.classificacao}</span>
    </span>
  );
}

function ExplicacaoFechamento({ prazos }: { prazos: PrazosViagens }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label="Como é calculado o índice de fechamento do relatório no prazo" className="shrink-0 text-muted-foreground hover:text-primary">
          <Info className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-2 text-sm">
        <p className="font-semibold">Índice de fechamento do relatório no prazo</p>
        <p>Índice = (despesas cujo relatório foi gerado dentro do prazo ÷ despesas já fechadas em relatório ou com o prazo vencido) × 100.</p>
        <p>Exemplo: 10 despesas com prazo vencido; 8 entraram em relatório até o último dia do prazo. Índice = 8 ÷ 10 × 100 = 80%.</p>
        <p>
          {prazos.pcmAplica === false
            ? "O indicador está desligado para o PCM em Parâmetros, então o índice não é calculado."
            : `Prazo de hoje para o PCM fechar o relatório: ${dias(prazos.pcm)} depois do lançamento. Despesa ainda sem relatório e com o prazo vencido conta como fora do prazo.`}
        </p>
        <p className="text-muted-foreground">O prazo se configura em Parâmetros &gt; Viagens &gt; Parâmetros Específicos e as faixas, em Parâmetros &gt; Veículos &gt; Parâmetros Específicos. Conta a diferença entre o dia em que a despesa foi lançada no sistema (não a data da despesa) e o dia em que o relatório foi gerado.</p>
      </PopoverContent>
    </Popover>
  );
}

function LegendaFaixas() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm"><PieChart className="mr-1 h-4 w-4" />Faixas de desempenho</Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] max-w-[90vw] space-y-3 text-sm">
        <p className="font-semibold">Faixas de desempenho</p>
        <p className="text-muted-foreground">Valem para o índice de conformidade de lançamento, o de lançamento no prazo e o de fechamento do relatório no prazo.</p>
        <ul className="space-y-3">
          {descricoesFaixas(lerFaixas()).map((f) => (
            <li key={f.faixa} className="space-y-0.5">
              <p className={`flex items-center gap-1.5 font-medium ${COR_TEXTO[f.faixa]}`}>
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${COR_PONTO[f.faixa]}`} aria-hidden="true" />
                {f.cor}, {f.intervalo}: {f.classificacao}
              </p>
              <p className="text-xs text-muted-foreground">{f.significado}</p>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
