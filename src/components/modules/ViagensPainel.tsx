import { BedDouble, CalendarDays, Ellipsis, Fuel, Info, Receipt, SquareParking, Hamburger, Wrench, type LucideIcon } from "lucide-react";
import { ViagensExtrato } from "./ViagensExtrato";
import { ViagensLista } from "./ViagensLista";
import { Cancela, ParafusoEPorca } from "./icones-viagens";
import { useMemo, useState } from "react";

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
import { lerPrazos, type PrazosViagens } from "@/lib/prazo-viagens";
import { listarRespostas } from "@/lib/respostas-despesas";
import {
  MESES, dadosDoLancamento, formatarMoeda, formatarPercentual, indicadoresGlobais, periodoAtual, resultadosTecnicos, rotuloPeriodo,
} from "@/lib/viagens";

// Ícone sugestivo de cada tipo de despesa; tipo novo (cadastrado depois) usa o recibo.
const ICONE_TIPO: Record<string, LucideIcon> = {
  "Alimentação": Hamburger,
  "Hospedagem": BedDouble,
  "Abastecimento": Fuel,
  "Pedágio": Cancela,
  "Estacionamento": SquareParking,
  "Manutenção do veículo de trabalho": Wrench,
  "Compra de peças para cliente": ParafusoEPorca,
  "Outro": Ellipsis,
};

// Painel do módulo Viagens (decisões 176 e 177): botões dos questionários, indicadores globais e resultados dos técnicos do mês escolhido.
export function ViagensPainel({ emitente }: { emitente: string }) {
  const [estado] = useState(lerEstado);
  const tipos = tiposDeDespesa(estado);
  const [tipo, setTipo] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState(periodoAtual);
  const prazos = useMemo(() => lerPrazos(), []);
  const [extratoDe, setExtratoDe] = useState<string | null>(null);
  // Relê os lançamentos sempre que volta do formulário, para o que acabou de ser enviado entrar na conta.
  const lista = useMemo(() => listarRespostas(), [tipo]);
  const { data: empregados = [], isSuccess: empregadosLidos } = useEmpregados(TODAS);
  const idsAtivos = useMemo(() => new Set(empregados.filter((e) => empregadoAtivo(e)).map((e) => e.id)), [empregados]);
  const tecnicos = useMemo(() => {
    const q14 = estado.perguntas.find((p) => p.id === ID_TECNICO_RESPONSAVEL);
    const habilitados = q14 ? (habilitadosDaPergunta(estado, q14) ?? []) : [];
    return (empregadosLidos ? habilitadosAtivos(habilitados, idsAtivos) : habilitados).map((h) => h.nome);
  }, [estado, empregadosLidos, idsAtivos]);
  const anos = useMemo(() => {
    const dosLancamentos = lista.map((r) => Number((dadosDoLancamento(r).dataDespesa ?? r.data).slice(0, 4))).filter((a) => a > 2000);
    return [...new Set([periodoAtual().ano, periodo.ano, ...dosLancamentos])].sort((a, b) => b - a);
  }, [lista, periodo.ano]);

  if (tipo !== null) {
    return <QuestionarioFormulario key={tipo} tipoInicial={tipo} semPerguntaTipo onVoltar={{ rotulo: "Voltar ao painel", aoClicar: () => setTipo(null) }} />;
  }

  const globais = indicadoresGlobais(lista, periodo, prazos);
  const resultados = resultadosTecnicos(lista, periodo, tecnicos, prazos);
  const noPeriodo = globais.quantidade;

  return (
    <div className="space-y-8">
      <section className="space-y-3" aria-labelledby="viagens-questionarios">
        <h2 id="viagens-questionarios" className="text-lg font-semibold">Questionários de despesas</h2>
        <p className="text-sm text-muted-foreground">Escolha o tipo da despesa a lançar.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {tipos.map((t) => {
            const Icone = ICONE_TIPO[t] ?? Receipt;
            const acaoRequerida = !questionarioPublicado(estado, t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                disabled={acaoRequerida}
                title={acaoRequerida ? "Ação requerida: corrija as ramificações em Parâmetros antes de publicar" : undefined}
                className="panel disabled:cursor-not-allowed disabled:opacity-60 flex min-h-28 flex-col items-center justify-center gap-2 p-3 text-center text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <Icone className="h-8 w-8 text-primary" aria-hidden="true" />
                <span className="break-words">{t}</span>
                {acaoRequerida && <span className="text-xs font-semibold text-destructive">Ação requerida</span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="viagens-indicadores">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="viagens-indicadores" className="text-lg font-semibold">Indicadores globais de despesas</h2>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm"><CalendarDays className="mr-1 h-4 w-4" />{rotuloPeriodo(periodo)}</Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 space-y-3">
              <p className="text-sm font-medium">Escolher outro período</p>
              <div className="space-y-1">
                <Label htmlFor="periodo-mes">Mês</Label>
                <Select value={String(periodo.mes)} onValueChange={(v) => { if (v) setPeriodo((p) => ({ ...p, mes: Number(v) })); }}>
                  <SelectTrigger id="periodo-mes" aria-label="Mês"><SelectValue /></SelectTrigger>
                  <SelectContent>{MESES.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="periodo-ano">Ano</Label>
                <Select value={String(periodo.ano)} onValueChange={(v) => { if (v) setPeriodo((p) => ({ ...p, ano: Number(v) })); }}>
                  <SelectTrigger id="periodo-ano" aria-label="Ano"><SelectValue /></SelectTrigger>
                  <SelectContent>{anos.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Indicador titulo="Despesas lançadas no mês" valor={String(globais.quantidade)} />
          <Indicador titulo="Custo total" valor={formatarMoeda(globais.custoTotal)} />
          <Indicador
            titulo="Índice de conformidade de lançamento"
            valor={formatarPercentual(globais.icl)}
            detalhe={globais.noIndice ? `${globais.noIndice - globais.naoConformes} de ${globais.noIndice} lançadas pelo próprio técnico` : "Sem lançamentos no índice neste mês"}
            explicacao={<ExplicacaoIcl />}
          />
          <Indicador
            titulo="Índice de lançamento no prazo"
            valor={formatarPercentual(globais.prazo)}
            detalhe={globais.quantidade ? `${globais.noPrazo} de ${globais.quantidade} lançadas no prazo` : "Sem lançamentos neste mês"}
            explicacao={<ExplicacaoPrazo prazos={prazos} />}
            roxo
          />
        </div>
      </section>

      <ViagensLista lista={lista} periodo={periodo} tipos={tipos} tecnicos={tecnicos} emitente={emitente} />

      <section className="space-y-3" aria-labelledby="viagens-tecnicos">
        <h2 id="viagens-tecnicos" className="text-lg font-semibold">Resultados dos técnicos</h2>
        <p className="text-sm text-muted-foreground">{rotuloPeriodo(periodo)}{noPeriodo === 0 ? ": nenhuma despesa lançada neste período." : "."}</p>
        <div className="panel overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-2 sm:px-4">Técnico</TableHead>
                <TableHead className="px-2 text-right sm:px-4"><span className="sm:hidden">Lanç.</span><span className="hidden sm:inline">Lançamentos</span></TableHead>
                <TableHead className="px-2 text-right sm:px-4">Valor<span className="hidden sm:inline"> total</span></TableHead>
                <TableHead className="px-2 text-right sm:px-4"><span className="sm:hidden" title="Índice de conformidade de lançamento">ICL</span><span className="hidden sm:inline">Conformidade</span></TableHead>
                <TableHead className="px-2 text-right text-purple-700 dark:text-purple-300 sm:px-4"><span className="sm:hidden" title="Índice de lançamento no prazo">Prazo</span><span className="hidden sm:inline">No prazo</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resultados.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Nenhum técnico habilitado. Cadastre em Parâmetros &gt; Veículos &gt; Questionário de Despesas (pergunta 04).</TableCell></TableRow>
              )}
              {resultados.map((r) => (
                <TableRow key={r.nome}>
                  <TableCell className="px-2 font-medium sm:px-4">
                    <button type="button" onClick={() => setExtratoDe(r.nome)} title="Abrir o extrato do técnico" className="text-left text-primary underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">{r.nome}</button>
                  </TableCell>
                  <TableCell className="px-2 text-right sm:px-4">{r.lancamentos}</TableCell>
                  <TableCell className="whitespace-nowrap px-2 text-right sm:px-4">{formatarMoeda(r.valorTotal)}</TableCell>
                  <TableCell className="px-2 text-right sm:px-4">{formatarPercentual(r.icl)}</TableCell>
                  <TableCell className="px-2 text-right font-medium text-purple-700 dark:text-purple-300 sm:px-4">{formatarPercentual(r.prazo)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {extratoDe && <ViagensExtrato tecnico={extratoDe} periodoInicial={periodo} lista={lista} aoFechar={() => setExtratoDe(null)} />}
    </div>
  );
}

function Indicador({ titulo, valor, detalhe, explicacao, roxo }: { titulo: string; valor: string; detalhe?: string; explicacao?: React.ReactNode; roxo?: boolean }) {
  return (
    <div className={`panel space-y-1 p-4 ${roxo ? "border-l-4 border-l-purple-600" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground">{titulo}</p>
        {explicacao}
      </div>
      <p className={`text-2xl font-bold ${roxo ? "text-purple-700 dark:text-purple-300" : ""}`}>{valor}</p>
      {detalhe && <p className="text-xs text-muted-foreground">{detalhe}</p>}
    </div>
  );
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
        <p>Índice = (despesas lançadas dentro do prazo ÷ total de despesas lançadas no período) × 100.</p>
        <p>Exemplo: 10 despesas no mês; 9 foram lançadas dentro do prazo, contado em dias depois da data da despesa. Índice = 9 ÷ 10 × 100 = 90%.</p>
        <p>Prazos de hoje: técnico mecânico, {dias(prazos.mecanico)}; PCM, {dias(prazos.pcm)}. Vale o prazo de quem lançou a despesa (o Administrativo segue o do PCM).</p>
        <p className="text-muted-foreground">Os prazos se configuram em Parâmetros &gt; Viagens. Conta a diferença entre a data da despesa e o dia em que o formulário foi enviado.</p>
      </PopoverContent>
    </Popover>
  );
}
