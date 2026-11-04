import { BarraDeFiltros } from "@/components/layout/BarraDeFiltros";
import { ArrowLeft, CalendarCheck, ClipboardCheck } from "lucide-react";
import { useState } from "react";

import { CartoesManutencao } from "@/components/modules/CartoesManutencao";
import { ExtratoVeiculo, type SecaoExtrato } from "@/components/modules/ExtratoVeiculo";
import { TabelaDiagnosticoManutencao } from "@/components/modules/TabelaDiagnosticoManutencao";
import { GraficosManutencao } from "@/components/modules/GraficosVeiculos";
import { ManutencaoRevisoes } from "@/components/modules/ManutencaoRevisoes";
import { NovaManutencaoDialog } from "@/components/modules/NovaManutencaoDialog";
import { rotuloDoVeiculo } from "@/components/modules/rotulo-veiculo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAccess } from "@/lib/access-context";
import { hojeLocal } from "@/lib/empregados";
import { kmAtualDoVeiculo, sugestoesPreventivas } from "@/lib/extrato-veiculo";
import { proporcaoPreventiva } from "@/lib/frota-indicadores";
import { situacaoPreventivas } from "@/lib/frota-situacao";
import { indicadoresDaManutencao } from "@/lib/manutencao-indicadores";
import { combinaBusca } from "@/lib/parametros-base";
import { useEmpresa } from "@/lib/empresa-context";
import { formatarData } from "@/lib/gemape";
import { montarManutencaoHtml } from "@/lib/manutencao-relatorio-html";
import { useVeiculos } from "@/lib/hooks-gemape";
import { custoDaManutencao, gruposDaManutencao, locaisDaManutencao, removerManutencao, resumoManutencao, rotuloDoLocal, type ManutencaoVeiculo } from "@/lib/registros-veiculo";
import { useFocoDaTela } from "@/lib/use-foco-da-tela";
import { useAbastecimentos, useManutencoesVeiculo, usePlanosVeiculo } from "@/lib/use-registros-veiculo";
import { executar, useParametrosBase } from "@/lib/use-parametros-base";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";

const MODO_DEMO = import.meta.env["VITE_DEMO_MODE"] !== "false";

// Módulos > Veículos > Manutenção (decisões 57 e 61): veículo, preventiva ou corretiva (só a
// corretiva descreve o que acontece), grupos de ações (pai, quantos a manutenção abranger), ações de
// cada grupo (filhos) com observação livre cada uma, local (empresa ou terceiro) e custo de peças e de mão de obra. A última
// preventiva de cada grupo alimenta as sugestões do extrato. Só modo demonstração.
// Altura das listas: ocupam o que sobra da janela e rolam por dentro, para a página não rolar.
const ALTURA_LISTA = "max-h-[calc(100dvh-19rem)]";
// Tipo da manutenção em pílula, no desenho das etiquetas da Frota: preventiva em verde, corretiva em âmbar.
const COR_TIPO = {
  Preventiva: { etiqueta: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200", ponto: "bg-emerald-500" },
  Corretiva: { etiqueta: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200", ponto: "bg-amber-400" },
} as const;
function EtiquetaTipo({ tipo }: { tipo: ManutencaoVeiculo["tipo"] }) {
  const cor = COR_TIPO[tipo];
  return (
    <span className={`mx-auto flex h-8 w-full max-w-[9rem] items-center justify-center gap-2 whitespace-nowrap rounded-full border px-3 text-xs font-semibold shadow-sm ${cor.etiqueta}`}>
      <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ring-2 ring-white/80 dark:ring-black/30 ${cor.ponto}`} />
      {tipo}
    </span>
  );
}
const moeda = (n: number | undefined) => (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export function ManutencaoVeiculoModulo() {
  const { empresaId, empresas } = useEmpresa();
  const { isAdmin, canWrite } = useAccess();
  const parametros = useParametrosBase();
  const { data: veiculos = [] } = useVeiculos(empresaId);
  const todas = useManutencoesVeiculo();
  const abastecimentos = useAbastecimentos();
  const planos = usePlanosVeiculo();
  // Tela (decisão 319): o painel com indicadores e gráficos; ao clicar num dos dois botões azuis do alto, a lista das manutenções planejadas (revisões do plano de cada
  // veículo) ou a das realizadas (registros preventivos e corretivos, com relatório, edição e exclusão), cada uma com o botão de voltar ao painel.
  const [aba, setAba] = useState<"painel" | "planejadas" | "realizadas">("painel");
  const [tipo, setTipo] = useState<"todas" | "Preventiva" | "Corretiva">("todas");
  // Foco do teclado ao trocar de tela (decisão 333): abrir uma lista leva o foco ao botão de voltar; voltar ao painel o devolve ao botão da lista que estava aberta.
  const { voltarRef, botaoDaTela } = useFocoDaTela(aba, "painel");
  const [aberto, setAberto] = useState(false);
  // Extrato aberto a partir da tabela de diagnóstico (decisão 348).
  const [extrato, setExtrato] = useState<{ id: string; secao: SecaoExtrato | null } | null>(null);
  // Manutenção em edição; null é o cadastro de uma nova.
  const [editando, setEditando] = useState<ManutencaoVeiculo | null>(null);
  const [busca, setBusca] = useState("");
  // Período da lista (AAAA-MM-DD, as duas pontas valem); vazio = sem limite daquele lado.
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const periodoInvalido = !!inicio && !!fim && inicio > fim;
  // As planejadas têm o período delas, sobre a data da próxima revisão: não herdam o das realizadas.
  const [inicioPlan, setInicioPlan] = useState("");
  const [fimPlan, setFimPlan] = useState("");
  const periodoPlanInvalido = !!inicioPlan && !!fimPlan && inicioPlan > fimPlan;

  const acoes = parametros.acoesManutencaoVeiculo;
  const idsDaEmpresa = new Set(veiculos.map((v) => v.id));
  const servicoDe = (m: (typeof todas)[number]) => resumoManutencao(m, (id) => acoes.find((a) => a.id === id)?.nome);
  const lista = todas
    .filter((m) => idsDaEmpresa.has(m.veiculoId))
    .filter((m) => tipo === "todas" || m.tipo === tipo)
    .filter((m) => !periodoInvalido && (!inicio || m.data >= inicio) && (!fim || m.data <= fim))
    .filter((m) => {
      const v = veiculos.find((x) => x.id === m.veiculoId);
      return combinaBusca(busca, v ? rotuloDoVeiculo(parametros, v) : "", m.tipo, servicoDe(m), formatarData(m.data), String(m.km));
    })
    .sort((a, b) => b.data.localeCompare(a.data) || b.km - a.km);

  // Revisões do plano de cada veículo da empresa (mesma conta das sugestões do extrato) e os indicadores do alto (decisão 319).
  const hoje = hojeLocal();
  const revisoes = veiculos.flatMap((v) => {
    const abast = abastecimentos.filter((a) => a.veiculoId === v.id);
    const manut = todas.filter((m) => m.veiculoId === v.id);
    const kmAtual = kmAtualDoVeiculo(v.quilometragem_atual ?? 0, abast, manut);
    return sugestoesPreventivas({
      plano: planos.find((p) => p.veiculoId === v.id) ?? null,
      acoes,
      manutencoes: manut,
      kmAtual,
      hoje,
    }).map((sugestao) => ({ veiculoId: v.id, veiculo: rotuloDoVeiculo(parametros, v), kmAtual, sugestao }));
  });
  const indicadores = indicadoresDaManutencao({ tipos: todas.filter((m) => idsDaEmpresa.has(m.veiculoId)).map((m) => m.tipo), statusRevisoes: revisoes.map((r) => r.sugestao.status) });
  // O período das planejadas vale para a data da próxima revisão: com período escolhido, revisão sem data prevista (sem registro) fica de fora.
  const noPeriodoPlanejado = (proxima: string | null) => (!inicioPlan && !fimPlan) || (!!proxima && (!inicioPlan || proxima.slice(0, 10) >= inicioPlan) && (!fimPlan || proxima.slice(0, 10) <= fimPlan));
  const revisoesDaBusca = revisoes
    .filter((r) => !periodoPlanInvalido && noPeriodoPlanejado(r.sugestao.proximaData))
    .filter((r) => combinaBusca(busca, r.veiculo, r.sugestao.nome));

  // Diagnóstico de manutenção de cada veículo da empresa (decisão 348), a tabela da Frota só com os dados de manutenção.
  const custosDaFrota = todas.filter((m) => idsDaEmpresa.has(m.veiculoId)).map((m) => ({ veiculoId: m.veiculoId, data: m.data, km: m.km, tipo: m.tipo as string, custo: custoDaManutencao(m) }));
  const diagnostico = veiculos.map((v) => {
    const dele = todas.filter((m) => m.veiculoId === v.id).sort((a, b) => b.data.localeCompare(a.data) || b.km - a.km);
    const custos = custosDaFrota.filter((c) => c.veiculoId === v.id);
    const preventivo = proporcaoPreventiva([v.id], custos);
    return {
      id: v.id,
      veiculo: rotuloDoVeiculo(parametros, v),
      km: kmAtualDoVeiculo(v.quilometragem_atual ?? 0, abastecimentos.filter((a) => a.veiculoId === v.id), dele),
      ultima: dele[0] ? { data: dele[0].data, tipo: dele[0].tipo as string } : null,
      preventivas: situacaoPreventivas(revisoes.filter((r) => r.veiculoId === v.id).map((r) => r.sugestao.status)),
      realizadas: dele.length,
      corretivas: dele.filter((m) => m.tipo === "Corretiva").length,
      custo: custos.reduce((t, c) => t + c.custo, 0),
      pctPreventivo: preventivo.pct,
      faixaPreventivo: preventivo.faixa,
    };
  });

  if (!MODO_DEMO) {
    return <p className="text-sm text-muted-foreground">A manutenção de veículos estará disponível após a Fase 2 (banco real).</p>;
  }

  function abrir(m?: ManutencaoVeiculo) {
    setEditando(m ?? null);
    setAberto(true);
  }

  // Relatório da manutenção, separado por grupo de serviço, no visualizador do sistema (imprimir ou salvar em PDF).
  function gerarRelatorio(m: ManutencaoVeiculo) {
    const v = veiculos.find((x) => x.id === m.veiculoId);
    const veiculo = v ? rotuloDoVeiculo(parametros, v) : "Veículo";
    const empresa = empresas.find((e) => e.id === v?.empresa_id)?.razao_social ?? "GEMAPE";
    abrirDocumento({
      titulo: "Relatório de manutenção",
      html: montarManutencaoHtml(m, {
        empresa, veiculo, nomeGrupo: (id) => acoes.find((a) => a.id === id)?.nome,
        logoUrl: `${window.location.origin}${import.meta.env["BASE_URL"] ?? "/"}logo-relatorio-viagens.png`,
      }),
      arquivo: nomeArquivoDocumento("Manutencao", veiculo, m.data),
    });
  }

  function excluir(id: string) {
    if (!confirm("Excluir esta manutenção?")) return;
    executar(() => removerManutencao(id), "Manutenção excluída");
  }

  // Filtro de período das duas listas (as pontas valem): nas planejadas, a data da próxima revisão; nas realizadas, a data da manutenção.
  const camposDoPeriodo = (ini: string, defIni: (v: string) => void, f: string, defFim: (v: string) => void, prefixo: string, dica: string) => (
    <>
      <div className="flex items-center gap-2" title={dica}>
        <Label htmlFor={`${prefixo}-inicio`} className="text-sm">Data início</Label>
        <Input id={`${prefixo}-inicio`} type="date" className="w-40" value={ini} max={f || undefined} onChange={(e) => defIni(e.target.value)} />
      </div>
      <div className="flex items-center gap-2" title={dica}>
        <Label htmlFor={`${prefixo}-fim`} className="text-sm">Data fim</Label>
        <Input id={`${prefixo}-fim`} type="date" className="w-40" value={f} min={ini || undefined} onChange={(e) => defFim(e.target.value)} />
      </div>
      {(ini || f) && <Button type="button" variant="ghost" size="sm" onClick={() => { defIni(""); defFim(""); }}>Limpar período</Button>}
    </>
  );
  const filtroPeriodo = camposDoPeriodo(inicio, setInicio, fim, setFim, "manutencao", "Data da manutenção");
  const filtroPeriodoPlan = camposDoPeriodo(inicioPlan, setInicioPlan, fimPlan, setFimPlan, "planejadas", "Data da próxima revisão: revisões sem data prevista não aparecem quando há período");

  const botaoCadastrar = <Button requiresWrite size="sm" className="rounded-full px-4" onClick={() => abrir()}>Cadastrar nova manutenção</Button>;
  const voltar = (
    <Button ref={voltarRef} type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setAba("painel")}><ArrowLeft className="h-4 w-4" /> Voltar ao painel</Button>
  );

  return (
    <div className="space-y-3">
      {aba === "painel" && (
        <>
          {/* Os dois botões azuis ficam no alto, à direita, no mesmo padrão do Check list; a contagem de cada um vai dentro do botão. */}
          <section className="flex flex-wrap items-center justify-end gap-2" aria-label="Listas de manutenção">
            <Button ref={botaoDaTela("planejadas")} type="button" size="sm" className="rounded-full px-4" onClick={() => setAba("planejadas")}>
              <CalendarCheck className="h-4 w-4" aria-hidden="true" /> Manutenções planejadas
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-normal">{revisoes.length} no plano</span>
            </Button>
            <Button ref={botaoDaTela("realizadas")} type="button" size="sm" className="rounded-full px-4" onClick={() => setAba("realizadas")}>
              <ClipboardCheck className="h-4 w-4" aria-hidden="true" /> Manutenções realizadas
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-normal">{indicadores.preventivas.qtd + indicadores.corretivas.qtd} registradas</span>
            </Button>
            {botaoCadastrar}
          </section>
          <CartoesManutencao indicadores={indicadores} />
          <GraficosManutencao compacto revisoes={revisoes} manutencoes={todas.filter((m) => idsDaEmpresa.has(m.veiculoId))} hoje={hoje} />
          <TabelaDiagnosticoManutencao linhas={diagnostico} aoAbrir={(id, secao) => setExtrato({ id, secao })} />
          <ExtratoVeiculo veiculo={veiculos.find((v) => v.id === extrato?.id) ?? null} secao={extrato?.secao ?? null} foco="manutencao" onFechar={() => setExtrato(null)} />
        </>
      )}

      {aba === "planejadas" && (
        <>
          <div className="flex flex-wrap items-end gap-2">
            {voltar}
            <div>{botaoCadastrar}</div>
            <BarraDeFiltros>
              <Input aria-label="Buscar manutenção" placeholder="Buscar por veículo ou serviço" className="max-w-xs" value={busca} onChange={(e) => setBusca(e.target.value)} />
              {filtroPeriodoPlan}
              <p className="text-sm text-muted-foreground">{revisoesDaBusca.length} manutenção(ões) planejada(s){inicioPlan || fimPlan ? ", pela data da próxima revisão" : ""}.</p>
            </BarraDeFiltros>
          </div>
          {periodoPlanInvalido && <p className="text-sm text-destructive">A data início não pode ser depois da data fim.</p>}
          <div className={`${ALTURA_LISTA} overflow-y-auto`}>
            <ManutencaoRevisoes revisoes={revisoesDaBusca} />
          </div>
        </>
      )}

      {aba === "realizadas" && (
        <>
          <div className="flex flex-wrap items-end gap-2">
            {voltar}
            <div>{botaoCadastrar}</div>
            <BarraDeFiltros>
              <div className="flex gap-2" role="group" aria-label="Tipo de manutenção">
                <Button type="button" size="sm" variant={tipo === "todas" ? "default" : "outline"} aria-pressed={tipo === "todas"} onClick={() => setTipo("todas")}>Todas</Button>
                <Button type="button" size="sm" variant={tipo === "Preventiva" ? "default" : "outline"} aria-pressed={tipo === "Preventiva"} onClick={() => setTipo("Preventiva")}>Preventivas ({indicadores.preventivas.qtd})</Button>
                <Button type="button" size="sm" variant={tipo === "Corretiva" ? "default" : "outline"} aria-pressed={tipo === "Corretiva"} onClick={() => setTipo("Corretiva")}>Corretivas ({indicadores.corretivas.qtd})</Button>
              </div>
              <Input aria-label="Buscar manutenção" placeholder="Buscar por veículo, serviço ou tipo" className="max-w-xs" value={busca} onChange={(e) => setBusca(e.target.value)} />
              {filtroPeriodo}
              <p className="text-sm text-muted-foreground">{lista.length} manutenção(ões).</p>
            </BarraDeFiltros>
          </div>
          {periodoInvalido && <p className="text-sm text-destructive">A data início não pode ser depois da data fim.</p>}
      <div className={`${ALTURA_LISTA} flex flex-col overflow-hidden rounded-xl border [&>div]:min-h-0 [&>div]:flex-1 [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-card`}>
        <Table className="min-w-[1250px] table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[8%]">Data</TableHead>
              <TableHead className="w-[19%]">Veículo</TableHead>
              <TableHead className="w-[10%] text-center">Tipo</TableHead>
              <TableHead className="w-[18%]">Serviço</TableHead>
              <TableHead className="w-[11%]">Local</TableHead>
              <TableHead className="w-[9%] pr-6 text-right">Custo total</TableHead>
              <TableHead className="w-[7%] pr-6 text-right">Km</TableHead>
              <TableHead className="w-[18%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.length === 0 && (
              <TableRow><TableCell colSpan={8} className="py-6 text-center text-muted-foreground">{busca.trim() || inicio || fim ? "Nenhum resultado para a busca e o período." : "Nenhuma manutenção registrada."}</TableCell></TableRow>
            )}
            {lista.map((m) => {
              const v = veiculos.find((x) => x.id === m.veiculoId);
              const servico = servicoDe(m);
              return (
                <TableRow key={m.id}>
                  <TableCell>{formatarData(m.data)}</TableCell>
                  <TableCell className="font-medium">{v ? rotuloDoVeiculo(parametros, v) : "—"}</TableCell>
                  <TableCell><EtiquetaTipo tipo={m.tipo} /></TableCell>
                  <TableCell>
                    {gruposDaManutencao(m).length === 0 ? servico : (
                      <div className="space-y-1">
                        {gruposDaManutencao(m).map((g) => (
                          <p key={g.acaoId} className="leading-snug">
                            <span className="font-medium">{acoes.find((a) => a.id === g.acaoId)?.nome ?? (g.nome || "Ação removida de Parâmetros")}</span>
                            {g.itens.length > 0 && <span className="text-muted-foreground">: {g.itens.map((i) => i.nome).join(", ")}</span>}
                            {g.itens.filter((i) => i.observacao).map((i) => (
                              <span key={i.subitemId} className="block text-xs text-muted-foreground">{i.nome}: {i.observacao}</span>
                            ))}
                            {(g.naoRealizados ?? []).map((n) => (
                              <span key={n.subitemId} className="block text-xs text-amber-700">Não realizado, {n.nome}: {n.observacao}</span>
                            ))}
                          </p>
                        ))}
                        {m.tipo === "Corretiva" && m.descricao && <p className="text-xs text-muted-foreground">{m.descricao}</p>}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {locaisDaManutencao(m).length === 0 ? "—" : (
                      <div className="space-y-1">
                        {locaisDaManutencao(m).map((l, i) => <p key={i} className="leading-snug">{rotuloDoLocal(l)}</p>)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="pr-6 text-right tabular-nums" title={m.custoTotal === undefined ? undefined : `Peças ${moeda(m.custoPecas)} + mão de obra ${moeda(m.custoMaoDeObra)}`}>
                    {m.custoTotal === undefined ? "—" : moeda(m.custoTotal)}
                    {locaisDaManutencao(m).length > 1 && (
                      <div className="mt-1 space-y-0.5 text-xs font-normal text-muted-foreground">
                        {locaisDaManutencao(m).map((l, i) => <p key={i}>{moeda(l.custoTotal)}</p>)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="pr-6 text-right tabular-nums">{m.km.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="space-x-1 whitespace-nowrap text-right">
                    <Button variant="outline" size="sm" className="rounded-full" aria-label="Relatório da manutenção" onClick={() => gerarRelatorio(m)}>Relatório</Button>
                    <Button requiresWrite variant="outline" size="sm" className="rounded-full" aria-label="Editar manutenção" onClick={() => abrir(m)}>Editar</Button>
                    {isAdmin && (
                      <Button requiresWrite variant="destructive" size="sm" aria-label="Excluir manutenção" className="rounded-full" onClick={() => excluir(m.id)}>
                        Excluir
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
        </>
      )}

      <NovaManutencaoDialog
        aberto={aberto}
        aoMudar={setAberto}
        editando={editando}
        aoSalvar={(gravada, editou) => {
          // Ao cadastrar, o relatório da manutenção abre na hora, separado por grupo de serviço.
          if (!editou) gerarRelatorio(gravada);
        }}
      />
    </div>
  );
}
