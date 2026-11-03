import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { ConsultaChecklist, ConsultaOcorrencia } from "@/components/modules/ConsultasDoExtrato";
import { NovaManutencaoDialog } from "@/components/modules/NovaManutencaoDialog";
import { rotuloDoVeiculo } from "@/components/modules/rotulo-veiculo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ocorrenciaVencida } from "@/lib/frota-ocorrencias";
import { lerPrazosOcorrencias } from "@/lib/prazo-ocorrencias";
import { hojeLocal } from "@/lib/empregados";
import { montarExtratoHtml, type Celula, type Cor, type TabelaExtrato } from "@/lib/extrato-html";
import { historicoAbastecimentos, kmAtualDoVeiculo, mediaKmPorLitro, pontosDeAtencao, sugestoesPreventivas, type StatusSugestao } from "@/lib/extrato-veiculo";
import { formatarData } from "@/lib/gemape";
import { painelDoMes, type SituacaoPrevisao } from "@/lib/checklist-painel";
import { pendenciaAberta } from "@/lib/checklist-veiculo";
import { diasEntre } from "@/lib/viagens";
import { useEmpresas, useMovimentacoes, useOcorrencias, type Veiculo } from "@/lib/hooks-gemape";
import { gruposDaManutencao, resumoManutencao } from "@/lib/registros-veiculo";
import { useAbastecimentos, useChecklistsVeiculo, useManutencoesVeiculo, useOcorrenciasVeiculo, usePlanosVeiculo, usePrevisoesChecklist } from "@/lib/use-registros-veiculo";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { useEmpresa } from "@/lib/empresa-context";
import { MODO_DEMO } from "@/lib/modo-demo";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";

// No relatório a situação sai com o ponto colorido, como nos indicadores da tela.
const SITUACAO: Record<StatusSugestao, { rotulo: string; cor: Cor }> = {
  vencida: { rotulo: "Vencida", cor: "vermelho" },
  atencao: { rotulo: "Atenção", cor: "amarelo" },
  em_dia: { rotulo: "Em dia", cor: "verde" },
  sem_registro: { rotulo: "Sem registro", cor: "cinza" },
};
const COR_OCORRENCIA: Record<string, Cor> = { Aberta: "vermelho", "Em tratativa": "amarelo", Encerrada: "verde" };

const numero = (n: number) => n.toLocaleString("pt-BR");

// Extrato do veículo (decisões 57, 296 e 331): ao escolher o veículo na Frota, abre a tela do extrato, interativa, com o período (data início e fim, opcionais), o resumo,
// os atalhos para realizar manutenção, tratar ocorrências e realizar check list, e as tabelas de manutenções sugeridas e realizadas, itens em atenção, abastecimentos,
// ocorrências e check lists. O período vale para o que aconteceu; as sugeridas mostram sempre a situação de hoje. Só vira PDF quando a pessoa clica em Gerar PDF
// (o extrato completo, ou a seção). Clicar numa bolinha da Frota abre o extrato já na tabela que ela resume (decisão 305).
export type SecaoExtrato = "completo" | "sugeridas" | "realizadas" | "ocorrencias" | "ocorrenciasAbertas" | "checklists";
type Secao = SecaoExtrato;
// Uma célula do extrato que abre a consulta do registro: a coluna do código, o que ele é e o id (decisão 338).
type Ligacao = { coluna: number; tipo: "checklist" | "ocorrencia"; id: string };
// O PDF é um só: o extrato com as seções que a pessoa marcou em Personalizar o relatório (decisão 340). As seções são as tabelas do extrato (sugeridas, realizadas, itens em atenção,
// abastecimentos, ocorrências e check lists, nesta ordem); "ocorrenciasAbertas" só existe como entrada da Frota, para abrir a tela na tabela das ocorrências.
const TODAS_AS_TABELAS = [0, 1, 2, 3, 4, 5];
const TABELA_DAS_OCORRENCIAS = 4;
const SITUACAO_CHECKLIST: Record<SituacaoPrevisao, { rotulo: string; cor: Cor }> = {
  realizado: { rotulo: "Realizado no prazo", cor: "verde" },
  nao_realizado: { rotulo: "Não realizado no prazo", cor: "vermelho" },
  a_vencer: { rotulo: "A vencer", cor: "amarelo" },
  opcional: { rotulo: "Opcional", cor: "cinza" },
};

type DadosDoExtrato = { kmAtual: number; media: number | null; vencidas: number };
const resumoDo = (d: DadosDoExtrato): [string, string, Cor?][] => [
  ["Km atual", numero(d.kmAtual)],
  ["Média de consumo", d.media === null ? "— (precisa de dois abastecimentos)" : `${d.media.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km/L`],
  d.vencidas > 0 ? ["Preventivas vencidas", String(d.vencidas), "vermelho"] : ["Preventivas vencidas", "0"],
];
// Cor da bolinha das situações na tela, as mesmas do relatório.
const PONTO_TELA: Record<Cor, string> = { vermelho: "bg-red-500", amarelo: "bg-amber-400", verde: "bg-emerald-500", cinza: "bg-slate-400" };
const TEXTO_TELA: Record<Cor, string> = { vermelho: "font-semibold text-red-700", amarelo: "font-semibold text-amber-700", verde: "text-emerald-700", cinza: "text-muted-foreground" };
// Que tabela cada seção da Frota (bolinhas) mostra primeiro quando o extrato abre.
const TABELA_DA_SECAO: Record<Secao, number> = { completo: 0, sugeridas: 0, realizadas: 1, ocorrencias: 4, ocorrenciasAbertas: 4, checklists: 5 };

export function ExtratoVeiculo({ veiculo, secao = null, onFechar }: { veiculo: Veiculo | null; secao?: SecaoExtrato | null; onFechar: () => void }) {
  const { empresaId } = useEmpresa();
  const parametros = useParametrosBase();
  const abastecimentos = useAbastecimentos();
  const manutencoes = useManutencoesVeiculo();
  const planos = usePlanosVeiculo();
  const { data: movimentacoes = [] } = useMovimentacoes("veiculo", empresaId);
  const { data: ocorrencias = [] } = useOcorrencias("", "veiculo");
  const ocorrenciasNovas = useOcorrenciasVeiculo();
  const checklists = useChecklistsVeiculo();
  const previsoes = usePrevisoesChecklist();
  const { data: empresas = [] } = useEmpresas();
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const periodoInvalido = !!inicio && !!fim && inicio > fim;

  // Todos os dados do extrato do veículo, calculados uma vez para a tela e para o PDF. `soAbertas`: só as ocorrências não encerradas (a tabela antiga de ocorrências, fora da
  // demonstração, não tem status e mostra todas).
  function montarDados(v: Veiculo, soAbertas: boolean) {
    // Período (AAAA-MM-DD, as duas pontas valem); vazio = sem limite daquele lado.
    const noPeriodo = (data: string) => (!inicio || data.slice(0, 10) >= inicio) && (!fim || data.slice(0, 10) <= fim);
    const dele = <T extends { veiculoId: string }>(l: T[]) => l.filter((x) => x.veiculoId === v.id);
    const manutTodas = dele(manutencoes);
    const abast = historicoAbastecimentos(dele(abastecimentos).filter((a) => noPeriodo(a.data)));
    const manut = manutTodas.filter((m) => noPeriodo(m.data));
    const media = mediaKmPorLitro(abast);
    // Km atual e sugeridas olham todos os registros, não só o período: são a situação de hoje.
    const kmAtual = kmAtualDoVeiculo(v.quilometragem_atual, dele(abastecimentos), manutTodas);
    const sugestoes = sugestoesPreventivas({
      plano: planos.find((p) => p.veiculoId === v.id) ?? null,
      acoes: parametros.acoesManutencaoVeiculo,
      manutencoes: manutTodas,
      kmAtual,
      hoje: hojeLocal(),
    });
    const vencidas = sugestoes.filter((s) => s.status === "vencida").length;

    // Manutenções do extrato: as registradas na tela Manutenção e as marcadas em Movimentações (registros antigos; a aba saiu do módulo na decisão 77).
    const nomeAcao = (id: string) => parametros.acoesManutencaoVeiculo.find((a) => a.id === id)?.nome;
    const linhasManutencao = [
      ...manut.map((m) => ({ data: m.data, km: m.km as number | null, tipo: m.tipo as string, servico: resumoManutencao(m, nomeAcao) })),
      ...movimentacoes
        .filter((m) => m.veiculo_id === v.id && (m as { acao_manutencao?: string }).acao_manutencao && noPeriodo(m.data_movimentacao))
        .map((m) => {
          const x = m as { acao_manutencao?: string; subitens_manutencao?: string[] };
          const subs = x.subitens_manutencao?.length ? `: ${x.subitens_manutencao.join(", ")}` : "";
          return { data: m.data_movimentacao.slice(0, 10), km: null, tipo: "Movimentação", servico: `${x.acao_manutencao}${subs}` };
        }),
    ].sort((a, b) => b.data.localeCompare(a.data));
    // Registros antigos (um grupo só, sem `grupos`) também contam como manutenção que fez o item.
    const atencao = pontosDeAtencao(manut.map((m) => ({ id: m.id, data: m.data, km: m.km, grupos: gruposDaManutencao(m) })), nomeAcao);
    // Em demonstração valem as ocorrências da tela nova (decisão 60); fora dela, as da tabela antiga.
    const prazosOcorrencias = lerPrazosOcorrencias();
    const ocorrenciasDoVeiculo = (MODO_DEMO
      ? ocorrenciasNovas.filter((o) => o.veiculoId === v.id && noPeriodo(o.ocorridoEm) && (!soAbertas || o.status !== "Encerrada")).map((o) => ({ id: o.id as string | null, aberta: o.status !== "Encerrada", data: o.ocorridoEm.slice(0, 10), descricao: `${o.codigo} · ${o.tipoNome}: ${o.descricao}`, situacao: o.status as string, vencida: ocorrenciaVencida(o, hojeLocal(), prazosOcorrencias) }))
      : ocorrencias.filter((o) => o.veiculo_id === v.id && noPeriodo(o.data)).map((o) => ({ id: null as string | null, aberta: false, data: o.data, descricao: o.descricao_ocorrencia, situacao: (o.responsavel_registro ?? "—") as string, vencida: false }))
    ).sort((a, b) => b.data.localeCompare(a.data));

    // Check lists periódicos do veículo: uma linha por prazo dos últimos 30 dias em diante (o que a bolinha da Frota resume), com o resultado e as pendências do realizado.
    const hoje = hojeLocal();
    const linhasChecklist = painelDoMes(null, previsoes.filter((p) => p.veiculoId === v.id), checklists.filter((c) => c.veiculoId === v.id), hoje).linhas
      .filter((l) => diasEntre(l.fim, hoje) <= 30);
    const rotulo = rotuloDoVeiculo(parametros, v);
    const tabelas: TabelaExtrato[] = [
        {
          titulo: "Manutenções preventivas sugeridas", vazio: "Este veículo não tem plano de manutenções (Parâmetros > Veículos > Manutenção).",
          colunas: [{ titulo: "Ação" }, { titulo: "Periodicidade" }, { titulo: "Última vez" }, { titulo: "Próxima revisão" }, { titulo: "Situação" }],
          linhas: sugestoes.map((x): Celula[] => [
            x.nome,
            `${numero(x.intervaloKm)} km ou ${x.intervaloMeses} meses`,
            x.ultima ? `${numero(x.ultima.km)} km (${formatarData(x.ultima.data)})` : "—",
            x.proximoKm !== null && x.proximaData ? `${numero(x.proximoKm)} km ou ${formatarData(x.proximaData)}` : "—",
            { texto: `${SITUACAO[x.status].rotulo}${x.status !== "em_dia" && x.status !== "sem_registro" ? ` · ${x.motivo}` : ""}`, cor: SITUACAO[x.status].cor },
          ]),
        },
        {
          titulo: "Manutenções realizadas", vazio: "Nenhuma manutenção registrada.",
          colunas: [{ titulo: "Data" }, { titulo: "Tipo" }, { titulo: "Serviço" }, { titulo: "Km", direita: true }],
          linhas: linhasManutencao.map((m) => [formatarData(m.data), m.tipo, m.servico, m.km === null ? "—" : numero(m.km)]),
        },
        {
          titulo: "Itens não realizados em atenção", vazio: "Nenhum item ficou sem fazer com observação.",
          nota: "O item sai desta lista quando uma manutenção posterior o realiza.",
          colunas: [{ titulo: "Manutenção" }, { titulo: "Grupo" }, { titulo: "Item" }, { titulo: "Observação" }, { titulo: "Km", direita: true }],
          linhas: atencao.map((a) => [formatarData(a.data), a.grupo, a.item, a.observacao, numero(a.km)]),
        },
        {
          titulo: "Histórico de abastecimentos", vazio: "Nenhum abastecimento registrado.",
          colunas: [{ titulo: "Data e hora" }, { titulo: "Km", direita: true }, { titulo: "Km rodados", direita: true }, { titulo: "Litros", direita: true }, { titulo: "Valor", direita: true }, { titulo: "Km/L", direita: true }],
          linhas: abast.map((a) => [
            `${formatarData(a.data)}${a.hora ? ` ${a.hora}` : ""}`, numero(a.km), a.kmRodados === null ? "—" : numero(a.kmRodados), a.litros.toLocaleString("pt-BR"),
            a.valor ? a.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—", a.kmPorLitro === null ? "—" : a.kmPorLitro.toLocaleString("pt-BR", { maximumFractionDigits: 1 }),
          ]),
        },
        {
          titulo: "Ocorrências", vazio: "Nenhuma ocorrência registrada.",
          colunas: [{ titulo: "Data" }, { titulo: "Descrição" }, { titulo: MODO_DEMO ? "Status" : "Responsável" }],
          linhas: ocorrenciasDoVeiculo.map((o): Celula[] => [formatarData(o.data), o.descricao, o.vencida ? { texto: `${o.situacao} · vencida`, cor: "vermelho" } : COR_OCORRENCIA[o.situacao] ? { texto: o.situacao, cor: COR_OCORRENCIA[o.situacao]! } : o.situacao]),
        },
        {
          titulo: "Check lists periódicos", vazio: "Este veículo não tem check list periódico previsto nos últimos 30 dias (Parâmetros > Veículos > Check list).",
          nota: "Prazos dos últimos 30 dias em diante; só os obrigatórios entram nos indicadores.",
          colunas: [{ titulo: "Prazo" }, { titulo: "Periodicidade" }, { titulo: "Responsável" }, { titulo: "Situação" }, { titulo: "Pendências", direita: true }, { titulo: "Check list" }],
          linhas: linhasChecklist.map((l): Celula[] => {
            const feito = l.checklistId ? checklists.find((c) => c.id === l.checklistId) : undefined;
            return [
              l.inicio === l.fim ? formatarData(l.fim) : `${formatarData(l.inicio)} a ${formatarData(l.fim)}`, l.periodicidade, l.responsavelNome || "—",
              { texto: SITUACAO_CHECKLIST[l.situacao].rotulo, cor: SITUACAO_CHECKLIST[l.situacao].cor },
              feito ? String(feito.itens.filter(pendenciaAberta).length) : "—", l.checklistCodigo ?? "—",
            ];
          }),
        },
    ];
    // Quais células viram link para consultar o registro (decisão 338): o código do check list (tabela 5) e o da ocorrência (tabela 4, no começo da descrição). Só na tela: o PDF não muda.
    const ligacoes: Record<string, Ligacao> = {};
    if (MODO_DEMO) ocorrenciasDoVeiculo.forEach((o, k) => { if (o.id) ligacoes[`4:${k}`] = { coluna: 1, tipo: "ocorrencia", id: o.id }; });
    linhasChecklist.forEach((l, k) => { if (l.checklistId && l.checklistCodigo) ligacoes[`5:${k}`] = { coluna: 5, tipo: "checklist", id: l.checklistId }; });
    return {
      rotulo, kmAtual, media, vencidas, tabelas, ligacoes,
      empresa: empresas.find((e) => e.id === v.empresa_id)?.nome_fantasia ?? "",
      ocorrenciasAbertas: ocorrenciasDoVeiculo.filter((o) => o.id && o.aberta) as { id: string; descricao: string }[],
    };
  }

  // O PDF só sai quando a pessoa clica em Gerar PDF (decisão 331): o extrato é a tela; o mesmo cálculo vira o relatório no visualizador, de tela cheia.
  function gerarPdf(v: Veiculo, tabelasEscolhidas: number[]) {
    // O PDF das ocorrências sai como a tela: com "Só em aberto" marcado, só as abertas.
    const abertas = MODO_DEMO && soAbertas && tabelasEscolhidas.includes(TABELA_DAS_OCORRENCIAS);
    const d = montarDados(v, abertas);
    const html = montarExtratoHtml({
      titulo: "Extrato do veículo",
      assunto: d.rotulo,
      ...(inicio || fim || abertas ? { subtitulo: [inicio || fim ? `Período: ${inicio ? formatarData(inicio) : "desde o início"} a ${fim ? formatarData(fim) : "hoje"}` : "", abertas ? "Só ocorrências em aberto" : ""].filter(Boolean).join(" · ") } : {}),
      empresa: d.empresa,
      resumo: resumoDo(d),
      tabelas: d.tabelas.filter((_, n) => tabelasEscolhidas.includes(n)),
    });
    abrirDocumento({ titulo: "Extrato do veículo", html, arquivo: nomeArquivoDocumento("Extrato do veiculo", d.rotulo), telaCheia: true });
  }

  // Escolher outro veículo começa sem período.
  useEffect(() => { setInicio(""); setFim(""); }, [veiculo?.id]);
  // Vindo de uma bolinha da Frota, o extrato abre na tabela que ela resume (e, nas ocorrências em aberto, só com as abertas).
  const [soAbertas, setSoAbertas] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  // Personalizar o PDF do extrato (decisão 340): o botão Gerar PDF do alto abre a escolha das seções; começam todas marcadas.
  const [personalizando, setPersonalizando] = useState(false);
  const [marcadas, setMarcadas] = useState<number[]>(TODAS_AS_TABELAS);
  // Consulta aberta por cima do extrato: o código do check list ou da ocorrência; fechar volta ao extrato (decisão 338).
  const [consulta, setConsulta] = useState<{ tipo: "checklist" | "ocorrencia"; id: string } | null>(null);
  useEffect(() => { setConsulta(null); }, [veiculo?.id]);
  useEffect(() => {
    setSoAbertas(secao === "ocorrenciasAbertas");
    if (!veiculo || !secao) return;
    const t = window.setTimeout(() => document.getElementById(`extrato-tabela-${TABELA_DA_SECAO[secao]}`)?.scrollIntoView({ block: "start" }), 150);
    return () => window.clearTimeout(t);
  }, [veiculo?.id, secao]);

  // O extrato é calculado de novo só quando muda o veículo, o período, o filtro ou os dados (e não a cada clique da tela).
  const dados = useMemo(
    () => (veiculo && !periodoInvalido ? montarDados(veiculo, soAbertas && MODO_DEMO) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [veiculo, periodoInvalido, inicio, fim, soAbertas, abastecimentos, manutencoes, planos, movimentacoes, ocorrencias, ocorrenciasNovas, checklists, previsoes, parametros, empresas],
  );
  const rotuloVeiculo = veiculo ? rotuloDoVeiculo(parametros, veiculo) : "";
  return (
    <Dialog open={!!veiculo} onOpenChange={(a) => { if (!a) onFechar(); }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>Extrato do veículo</DialogTitle>
          <DialogDescription>{rotuloVeiculo}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="extrato-inicio">Data início</Label>
            <Input id="extrato-inicio" type="date" className="w-40" value={inicio} max={fim || undefined} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="extrato-fim">Data fim</Label>
            <Input id="extrato-fim" type="date" className="w-40" value={fim} min={inicio || undefined} onChange={(e) => setFim(e.target.value)} />
          </div>
          <p className="max-w-md text-xs text-muted-foreground">O período vale para as manutenções realizadas, os abastecimentos e as ocorrências. As sugeridas mostram sempre a situação de hoje.</p>
          <Button type="button" className="ml-auto" disabled={periodoInvalido || !veiculo} onClick={() => setPersonalizando(true)}>Gerar PDF</Button>
        </div>
        {periodoInvalido && <p className="text-sm text-destructive">A data início não pode ser depois da data fim.</p>}

        {dados && veiculo && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              {resumoDo(dados).map(([rotulo, valor, cor]) => (
                <div key={rotulo} className="rounded-xl border bg-muted/30 p-3">
                  <p className="text-eyebrow">{rotulo}</p>
                  <p className={`mt-1 text-lg font-bold ${cor ? TEXTO_TELA[cor] : ""}`}>{valor}</p>
                </div>
              ))}
            </div>

            {/* Os atalhos para as rotinas do veículo: a manutenção abre aqui mesmo; a tratativa e o check list levam à rotina, já no que foi escolhido (decisão 331). */}
            <div className="flex flex-wrap items-center gap-2 rounded-xl border p-3">
              <p className="mr-2 text-sm font-medium">Rotinas do veículo</p>
              <Button type="button" variant="outline" size="sm" onClick={() => setRegistrando(true)}>Realizar manutenção</Button>
              <Button asChild variant="outline" size="sm"><Link to="/veiculos" search={{ aba: "ocorrencias" }}>Tratar ocorrências</Link></Button>
              <Button asChild variant="outline" size="sm"><Link to="/veiculos" search={{ aba: "checklist", veiculo: veiculo.id }}>Realizar check list</Link></Button>
            </div>

            {dados.tabelas.map((t, n) => (
              <section key={t.titulo} id={`extrato-tabela-${n}`} className="scroll-mt-4 space-y-2" aria-label={t.titulo}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-semibold">{t.titulo}</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    {n === 4 && MODO_DEMO && (
                      <label className="flex items-center gap-1.5 text-xs">
                        <Checkbox checked={soAbertas} onCheckedChange={(v) => setSoAbertas(v === true)} aria-label="Só as ocorrências em aberto" /> Só em aberto
                      </label>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto rounded-xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>{t.colunas.map((c) => <TableHead key={c.titulo} className={c.direita ? "text-right" : ""}>{c.titulo}</TableHead>)}</TableRow>
                    </TableHeader>
                    <TableBody>
                      {t.linhas.length === 0
                        ? <TableRow><TableCell colSpan={t.colunas.length} className="py-5 text-center text-muted-foreground">{t.vazio}</TableCell></TableRow>
                        : t.linhas.map((l, k) => (
                          <TableRow key={k}>
                            {l.map((c, m) => (
                              <TableCell key={m} className={t.colunas[m]?.direita ? "text-right tabular-nums" : ""}>
                                {typeof c === "string" && dados.ligacoes[`${n}:${k}`]?.coluna === m ? (
                                  <ConsultarCodigo texto={c} ligacao={dados.ligacoes[`${n}:${k}`]!} aoConsultar={(l) => setConsulta({ tipo: l.tipo, id: l.id })} />
                                ) : typeof c === "string" ? c : (
                                  <span className="inline-flex items-center gap-2">
                                    <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${PONTO_TELA[c.cor]}`} />
                                    <span className={TEXTO_TELA[c.cor]}>{c.texto}</span>
                                  </span>
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
                {t.nota && <p className="text-xs text-muted-foreground">{t.nota}</p>}
                {n === 4 && dados.ocorrenciasAbertas.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">Tratar:</span>
                    {dados.ocorrenciasAbertas.map((o) => (
                      <Button key={o.id} asChild variant="outline" size="sm">
                        <Link to="/veiculos" search={{ aba: "ocorrencias", ocorrencia: o.id }}>{o.descricao.split(" · ")[0]}</Link>
                      </Button>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onFechar}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
      {veiculo && (
        <ConsultaChecklist checklist={consulta?.tipo === "checklist" ? (checklists.find((c) => c.id === consulta.id) ?? null) : null} onFechar={() => setConsulta(null)} />
      )}
      {veiculo && consulta?.tipo === "ocorrencia" && (
        <ConsultaOcorrencia ocorrencia={ocorrenciasNovas.find((o) => o.id === consulta.id) ?? null} veiculo={rotuloVeiculo} onFechar={() => setConsulta(null)} />
      )}
      {veiculo && dados && (
        <Dialog open={personalizando} onOpenChange={setPersonalizando}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Personalizar o relatório</DialogTitle>
              <DialogDescription>Marque as seções que entram no PDF do extrato. O resumo do veículo (km atual, média e preventivas vencidas) sai sempre.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setMarcadas(dados.tabelas.map((_, n) => n))}>Marcar todos</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setMarcadas([])}>Desmarcar todos</Button>
              <span className="ml-auto text-xs text-muted-foreground">{marcadas.length} de {dados.tabelas.length} seções</span>
            </div>
            <ul className="space-y-1.5" aria-label="Seções do relatório">
              {dados.tabelas.map((t, n) => (
                <li key={t.titulo}>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/60">
                    <Checkbox checked={marcadas.includes(n)} onCheckedChange={(v) => setMarcadas((m) => (v === true ? [...m.filter((x) => x !== n), n].sort((a, b) => a - b) : m.filter((x) => x !== n)))} />
                    {t.titulo}
                  </label>
                </li>
              ))}
            </ul>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPersonalizando(false)}>Cancelar</Button>
              <Button type="button" disabled={marcadas.length === 0} onClick={() => { setPersonalizando(false); gerarPdf(veiculo, marcadas); }}>Gerar PDF</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {veiculo && registrando && <NovaManutencaoDialog aberto={registrando} aoMudar={setRegistrando} veiculoInicial={veiculo.id} aoSalvar={() => undefined} />}
    </Dialog>
  );
}

// O código do registro como link: na ocorrência o texto é "OCO-0001 · tipo: descrição" e só o código é o botão; no check list a célula é o próprio código.
function ConsultarCodigo({ texto, ligacao, aoConsultar }: { texto: string; ligacao: Ligacao; aoConsultar: (l: Ligacao) => void }) {
  const codigo = ligacao.tipo === "ocorrencia" ? (texto.split(" · ")[0] ?? texto) : texto;
  return (
    <>
      <button
        type="button"
        title={ligacao.tipo === "checklist" ? "Consultar o check list" : "Consultar a ocorrência"}
        className="font-medium text-primary underline underline-offset-2"
        onClick={() => aoConsultar(ligacao)}
      >
        {codigo}
      </button>
      {texto.slice(codigo.length)}
    </>
  );
}
