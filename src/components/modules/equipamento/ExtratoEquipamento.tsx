import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { PONTO_TELA, SITUACAO, TEXTO_TELA } from "@/components/modules/ExtratoVeiculo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AtalhoPeriodo } from "@/components/AtalhoPeriodo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEmpresa } from "@/lib/empresa-context";
import type { Equipamento } from "@/lib/equipamentos-demo";
import { lerManutencaoEquipamento } from "@/lib/equipamentos-manutencao";
import { montarExtratoHtml, type Celula, type Cor, type TabelaExtrato } from "@/lib/extrato-html";
import { sugestoesPreventivas } from "@/lib/extrato-veiculo";
import { formatarData } from "@/lib/gemape";
import { custoDaManutencaoEq, ocorrenciaPendenteEq, ultimoHorimetro } from "@/lib/registros-equipamento";
import { imprimirDocumento } from "@/lib/visualizador-documento";
import { NovoAbastecimento } from "./AbastecimentoEquipamentoModulo";
import { NovaManutencao } from "./ManutencaoEquipamentoModulo";
import { NovaOcorrencia } from "./OcorrenciasEquipamentoModulo";
import { hoje, nomeDoTipo, numero, reais, rotuloDoEquipamento, useAbastecimentosEq, useChecklistsEq, useManutencoesEq, useOcorrenciasEq } from "./comum";

// Extrato do equipamento (Equipamentos > Inventário), na mesma lógica do extrato do veículo: período, resumo, quatro seções coloridas (Manutenções, Abastecimentos,
// Ocorrências e Check lists) com o botão de registrar de cada uma, e o PDF com as seções que a pessoa marcar em Personalizar o relatório. Só modo demonstração.
// As tabelas, pela ordem: 0 preventivas sugeridas, 1 manutenções realizadas, 2 abastecimentos, 3 ocorrências, 4 check lists.
// O cálculo é o do veículo, que fala em km; no equipamento a medida é a hora de uso.
const motivoEmHoras = (m: string) => m.replace("Km próximo", "Horas próximas").replace(/\bkm\b/g, "horas");
export const SECOES_DO_EXTRATO_EQ = [
  { titulo: "Manutenções", tabelas: [0, 1], faixa: "from-blue-800 to-blue-600" },
  { titulo: "Abastecimentos", tabelas: [2], faixa: "from-emerald-800 to-emerald-600" },
  { titulo: "Ocorrências", tabelas: [3], faixa: "from-amber-700 to-amber-500" },
  { titulo: "Check lists", tabelas: [4], faixa: "from-violet-800 to-violet-600" },
] as const;
const TODAS_AS_SECOES = [0, 1, 2, 3];
const TABELA_DAS_OCORRENCIAS = 3;

// `foco`: aberto pela tela de Ocorrências, o extrato mostra só o que é das ocorrências (a seção, o título, o resumo e o PDF), como em Veículos (decisão 369).
export type FocoExtratoEq = "ocorrencias";
const FOCOS: Record<FocoExtratoEq, { titulo: string; secao: string; tabelas: number[]; periodo: string }> = {
  ocorrencias: { titulo: "Ocorrências do equipamento", secao: "Ocorrências", tabelas: [TABELA_DAS_OCORRENCIAS], periodo: "O período vale para as ocorrências, pela data em que aconteceram." },
};

export function ExtratoEquipamento({ equipamento, foco, soAbertasInicial = false, onFechar }: { equipamento: Equipamento | null; foco?: FocoExtratoEq; soAbertasInicial?: boolean; onFechar: () => void }) {
  const secoesVisiveis = foco ? SECOES_DO_EXTRATO_EQ.filter((x) => x.titulo === FOCOS[foco].secao) : SECOES_DO_EXTRATO_EQ;
  const { empresas } = useEmpresa();
  const abastecimentos = useAbastecimentosEq();
  const manutencoes = useManutencoesEq();
  const ocorrencias = useOcorrenciasEq();
  const checklists = useChecklistsEq();
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [soAbertas, setSoAbertas] = useState(soAbertasInicial);
  const [personalizando, setPersonalizando] = useState(false);
  const [marcadas, setMarcadas] = useState<number[]>(TODAS_AS_SECOES);
  const [registrando, setRegistrando] = useState<"manutencao" | "abastecimento" | "ocorrencia" | null>(null);
  useEffect(() => { setInicio(""); setFim(""); setSoAbertas(soAbertasInicial); setRegistrando(null); }, [equipamento?.id]);
  const periodoInvalido = !!inicio && !!fim && inicio > fim;
  const noPeriodo = (data: string) => (!inicio || data >= inicio) && (!fim || data <= fim);

  function montarDados(e: Equipamento, abertas: boolean) {
    const dele = <T extends { equipamentoId: string; data: string }>(l: T[]) => l.filter((x) => x.equipamentoId === e.id && noPeriodo(x.data)).sort((a, b) => b.data.localeCompare(a.data));
    const horimetro = ultimoHorimetro(e.id) ?? (Number(e.tecnico["horimetroInicial"]) || 0);
    const dados = lerManutencaoEquipamento();
    const plano = dados.planos.find((p) => p.equipamentoId === e.id);
    // O horímetro faz o papel do km do veículo: a preventiva vence pelas horas de uso ou pelos meses, o que vier primeiro.
    const todasManut = manutencoes.filter((m) => m.equipamentoId === e.id);
    const sugeridas = sugestoesPreventivas({
      plano: plano ? { veiculoId: e.id, atualizadoEm: plano.atualizadoEm, itens: plano.itens.map((i) => ({ acaoId: i.acaoId, km: i.horas, meses: i.meses })) } : null,
      acoes: dados.acoes,
      manutencoes: todasManut.map((m) => ({ acaoId: null, grupos: m.acoes.map((a) => ({ acaoId: a.acaoId })), data: m.data, km: m.horimetro, tipo: m.tipo })),
      kmAtual: horimetro, hoje: hoje(),
    });
    const vencidas = sugeridas.filter((s) => s.status === "vencida").length;
    const manut = dele(manutencoes);
    // Consumo em litros por hora de uso: os litros dos abastecimentos seguintes ao primeiro, divididos pelas horas entre o primeiro e o último.
    const doEq = abastecimentos.filter((a) => a.equipamentoId === e.id).sort((a, b) => a.horimetro - b.horimetro);
    const horas = doEq.length > 1 ? doEq.at(-1)!.horimetro - doEq[0]!.horimetro : 0;
    const litros = doEq.slice(1).reduce((s, a) => s + a.litros, 0);
    const media = horas > 0 && litros > 0 ? litros / horas : null;
    const tabelas: TabelaExtrato[] = [
      {
        titulo: "Preventivas sugeridas", vazio: "Este equipamento não tem plano de manutenção. Cadastre em Parâmetros > Equipamentos.",
        nota: "A situação é a de hoje: vence pelas horas de uso ou pelos meses do plano, o que vier primeiro.",
        colunas: [{ titulo: "Ação" }, { titulo: "Limite" }, { titulo: "Última realização" }, { titulo: "Próxima" }, { titulo: "Situação" }],
        linhas: sugeridas.map((s): Celula[] => [
          s.nome, `${numero(s.intervaloKm)} h ou ${s.intervaloMeses} meses`,
          s.ultima ? `${formatarData(s.ultima.data)} · ${numero(s.ultima.km)} h` : "—",
          s.proximoKm !== null && s.proximaData ? `${numero(s.proximoKm)} h ou ${formatarData(s.proximaData)}` : "—",
          { texto: s.status === "sem_registro" || s.status === "em_dia" ? SITUACAO[s.status].rotulo : `${SITUACAO[s.status].rotulo} · ${motivoEmHoras(s.motivo)}`, cor: SITUACAO[s.status].cor },
        ]),
      },
      {
        titulo: "Manutenções realizadas", vazio: "Nenhuma manutenção no período.", nota: `Custo de manutenção no período: ${reais(manut.reduce((t, m) => t + custoDaManutencaoEq(m), 0))}`,
        colunas: [{ titulo: "Data" }, { titulo: "Tipo" }, { titulo: "Horímetro", direita: true }, { titulo: "Ações" }, { titulo: "Local" }, { titulo: "Custo", direita: true }],
        linhas: manut.map((m) => [formatarData(m.data), m.tipo, `${numero(m.horimetro)} h`, m.acoes.map((a) => a.nome).join(", "), m.localNome || "Na empresa", reais(custoDaManutencaoEq(m))]),
      },
      {
        titulo: "Abastecimentos", vazio: "Nenhum abastecimento no período.",
        colunas: [{ titulo: "Data e hora" }, { titulo: "Horímetro", direita: true }, { titulo: "Litros", direita: true }, { titulo: "Valor", direita: true }],
        linhas: dele(abastecimentos).map((a) => [`${formatarData(a.data)} ${a.hora}`, `${numero(a.horimetro)} h`, numero(a.litros), reais(a.valor)]),
      },
      {
        titulo: abertas ? "Ocorrências em aberto" : "Ocorrências", vazio: abertas ? "Nenhuma ocorrência em aberto no período." : "Nenhuma ocorrência no período.",
        colunas: [{ titulo: "Data" }, { titulo: "Tipo" }, { titulo: "Status" }, { titulo: "Descrição" }],
        linhas: dele(ocorrencias).filter((o) => !abertas || ocorrenciaPendenteEq(o)).map((o): Celula[] => [formatarData(o.data), o.tipoNome, { texto: o.status, cor: o.status === "Aberta" ? "vermelho" : ocorrenciaPendenteEq(o) ? "amarelo" : "verde" }, o.descricao]),
      },
      {
        titulo: "Check lists", vazio: "Nenhum check list no período.",
        colunas: [{ titulo: "Data" }, { titulo: "Finalidade" }, { titulo: "Responsável" }, { titulo: "Situação" }, { titulo: "Resultado" }],
        linhas: dele(checklists).map((c): Celula[] => {
          const nok = c.itens.filter((i) => i.avaliacao === "NOK").length;
          return [formatarData(c.data), c.finalidade === "manutencao" ? "Manutenção" : "Vistoria", c.responsavelNome || "avulso", c.status, nok > 0 ? { texto: `${nok} NOK`, cor: "vermelho" } : { texto: "Tudo OK", cor: "verde" }];
        }),
      },
    ];
    const resumo: [string, string, Cor?][] = [
      ["Horímetro atual", horimetro > 0 ? `${numero(horimetro)} h` : "—"],
      ["Média de consumo", media === null ? "— (precisa de dois abastecimentos)" : `${media.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} L/h`],
      vencidas > 0 ? ["Preventivas vencidas", String(vencidas), "vermelho"] : ["Preventivas vencidas", "0"],
    ];
    return { tabelas, resumo, empresa: empresas.find((x) => x.id === e.empresaId)?.nome_fantasia ?? "" };
  }

  function gerarPdf(e: Equipamento, tabelasEscolhidas: number[]) {
    const abertas = soAbertas && tabelasEscolhidas.includes(TABELA_DAS_OCORRENCIAS);
    const d = montarDados(e, abertas);
    const html = montarExtratoHtml({
      titulo: foco ? FOCOS[foco].titulo : "Extrato do equipamento",
      assunto: rotuloDoEquipamento(e),
      subtitulo: [`${nomeDoTipo(e)} · ${e.marca} ${e.modelo} · série ${e.numeroSerie} · adquirido em ${formatarData(e.dataAquisicao)} por ${reais(e.valorCompra)}`, `Período: ${inicio || fim ? `${inicio ? formatarData(inicio) : "desde o início"} a ${fim ? formatarData(fim) : "hoje"}` : "todo o histórico"}`, abertas ? "Só ocorrências em aberto" : ""].filter(Boolean).join(" · "),
      empresa: d.empresa,
      resumo: foco ? d.resumo.slice(0, 1) : d.resumo,
      tabelas: d.tabelas.filter((_, n) => tabelasEscolhidas.includes(n)),
    });
    imprimirDocumento(html);
  }

  const dados = useMemo(
    () => (equipamento && !periodoInvalido ? montarDados(equipamento, soAbertas) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [equipamento, periodoInvalido, inicio, fim, soAbertas, abastecimentos, manutencoes, ocorrencias, checklists, empresas],
  );
  const dele = equipamento ? [{ id: equipamento.id, patrimonio: equipamento.patrimonio, nome: equipamento.nome }] : [];
  return (
    <Dialog open={!!equipamento} onOpenChange={(a) => { if (!a) onFechar(); }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>{foco ? FOCOS[foco].titulo : "Extrato do equipamento"}</DialogTitle>
          <DialogDescription>{equipamento ? `${rotuloDoEquipamento(equipamento)} · adquirido em ${formatarData(equipamento.dataAquisicao)} por ${reais(equipamento.valorCompra)}` : ""}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="extrato-eq-inicio" className="block text-center">Data início</Label>
            <Input id="extrato-eq-inicio" type="date" className="w-40" value={inicio} max={fim || undefined} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="extrato-eq-fim" className="block text-center">Data fim</Label>
            <Input id="extrato-eq-fim" type="date" className="w-40" value={fim} min={inicio || undefined} onChange={(e) => setFim(e.target.value)} />
          </div>
          <AtalhoPeriodo aoEscolher={(i, f) => { setInicio(i); setFim(f); }} />
          <p className="max-w-md text-xs text-muted-foreground">{foco ? FOCOS[foco].periodo : "O período vale para as manutenções realizadas, os abastecimentos, as ocorrências e os check lists. As preventivas sugeridas mostram sempre a situação de hoje."}</p>
          <Button type="button" className="ml-auto" disabled={periodoInvalido || !equipamento} onClick={() => (foco && equipamento ? gerarPdf(equipamento, FOCOS[foco].tabelas) : setPersonalizando(true))}>Gerar PDF</Button>
        </div>
        {periodoInvalido && <p className="text-sm text-destructive">A data início não pode ser depois da data fim.</p>}

        {dados && equipamento && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              {(foco ? dados.resumo.slice(0, 1) : dados.resumo).map(([rotulo, valor, cor]) => (
                <div key={rotulo} className="rounded-xl border bg-muted/30 p-3">
                  <p className="text-eyebrow">{rotulo}</p>
                  <p className={`mt-1 text-lg font-bold ${cor ? TEXTO_TELA[cor] : ""}`}>{valor}</p>
                </div>
              ))}
            </div>

            {secoesVisiveis.map((secao) => (
              <section key={secao.titulo} className="space-y-3" aria-label={secao.titulo}>
                <div className={`flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gradient-to-r ${secao.faixa} px-4 py-2.5 text-white shadow-sm`}>
                  <h3 className="text-xl font-bold tracking-tight">{secao.titulo}</h3>
                  <div className="flex flex-wrap items-center gap-3">
                    {secao.titulo === "Ocorrências" && (
                      <label className="flex items-center gap-1.5 text-xs font-medium">
                        <Checkbox checked={soAbertas} onCheckedChange={(v) => setSoAbertas(v === true)} aria-label="Só as ocorrências em aberto" className="border-white bg-white/90 data-[state=checked]:bg-white data-[state=checked]:text-foreground" /> Só em aberto
                      </label>
                    )}
                    {secao.titulo === "Manutenções" && <Button type="button" variant="secondary" size="sm" onClick={() => setRegistrando("manutencao")}>Registrar manutenção</Button>}
                    {secao.titulo === "Abastecimentos" && <Button type="button" variant="secondary" size="sm" onClick={() => setRegistrando("abastecimento")}>Registrar abastecimento</Button>}
                    {secao.titulo === "Ocorrências" && <Button type="button" variant="secondary" size="sm" onClick={() => setRegistrando("ocorrencia")}>Registrar ocorrência</Button>}
                    {secao.titulo === "Check lists" && <Button asChild variant="secondary" size="sm"><Link to="/equipamentos" search={{ aba: "checklist-vistoria" }}>Registrar check list</Link></Button>}
                  </div>
                </div>
                {secao.tabelas.map((n) => {
                  const t = dados.tabelas[n]!;
                  return (
                    <div key={t.titulo} className="space-y-2">
                      <h4 className="text-base font-semibold">{t.titulo}</h4>
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
                                      {typeof c === "string" ? c : (
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
                    </div>
                  );
                })}
              </section>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onFechar}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
      {equipamento && dados && (
        <Dialog open={personalizando} onOpenChange={setPersonalizando}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Personalizar o relatório</DialogTitle>
              <DialogDescription>Marque as seções que entram no PDF do extrato. O resumo do equipamento (horímetro atual, média de consumo e preventivas vencidas) sai sempre.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setMarcadas(TODAS_AS_SECOES)}>Marcar todos</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setMarcadas([])}>Desmarcar todos</Button>
              <span className="ml-auto text-xs text-muted-foreground">{marcadas.length} de {SECOES_DO_EXTRATO_EQ.length} seções</span>
            </div>
            <ul className="space-y-1.5" aria-label="Seções do relatório">
              {SECOES_DO_EXTRATO_EQ.map((secao, n) => (
                <li key={secao.titulo}>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/60">
                    <Checkbox checked={marcadas.includes(n)} onCheckedChange={(v) => setMarcadas((m) => (v === true ? [...m.filter((x) => x !== n), n].sort((a, b) => a - b) : m.filter((x) => x !== n)))} />
                    {secao.titulo}
                  </label>
                </li>
              ))}
            </ul>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPersonalizando(false)}>Cancelar</Button>
              <Button type="button" disabled={marcadas.length === 0} onClick={() => { setPersonalizando(false); gerarPdf(equipamento, marcadas.flatMap((n) => [...SECOES_DO_EXTRATO_EQ[n]!.tabelas])); }}>Gerar PDF</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {equipamento && registrando === "manutencao" && <NovaManutencao aberto aoMudar={(v) => !v && setRegistrando(null)} equipamentos={dele} equipamentoInicial={equipamento.id} />}
      {equipamento && registrando === "abastecimento" && <NovoAbastecimento aberto aoMudar={(v) => !v && setRegistrando(null)} equipamentos={dele} equipamentoInicial={equipamento.id} aoSalvar={() => undefined} />}
      {equipamento && registrando === "ocorrencia" && <NovaOcorrencia aberto aoMudar={(v) => !v && setRegistrando(null)} equipamentos={dele} equipamentoInicial={equipamento.id} />}
    </Dialog>
  );
}
