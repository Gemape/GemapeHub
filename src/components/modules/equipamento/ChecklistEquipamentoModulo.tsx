import { BarraDeFiltros } from "@/components/layout/BarraDeFiltros";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { BannerLancamentoAberto } from "@/components/BannerLancamentoAberto";
import { maisRecenteEmAndamento } from "@/lib/lancamento-aberto";

import { ChecklistPainelMensal, rotuloDoMes } from "@/components/modules/ChecklistPainelMensal";
import { DialogAssociarChecklistEquipamento, DialogItensChecklistEquipamento } from "@/components/modules/equipamento/DialogosChecklistEquipamento";
import { EquipamentoDialog } from "@/components/parametros/EquipamentoDialog";
import { BotaoAnexarFotos, GaleriaFotos, VisorFoto } from "@/components/modules/FotosOcorrencia";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAccess } from "@/lib/access-context";
import {
  adicionarFotosItemEq, avaliarItemEq, checklistVisivelNaListaEq, concluirChecklistEq, excluirChecklistEmAndamentoEq, gruposDoChecklistEq, gruposDoTipoEq, iniciarChecklistAvulsoEq,
  iniciarChecklistEq, nomeDoChecklistEq, pendenciaAbertaEq, pendenciasAbertasEq, periodicidadeObrigatoriaEq, periodicidadesDaAssociacaoEq, removerFotoItemEq, resolverPendenciaEq,
  type ChecklistEquipamentoRegistro,
} from "@/lib/checklist-equipamento-exec";
import { mesesDisponiveis, noMesDaLista, sincronizarPrevisoes, lerPrevisoes, type Previsao, type VeiculoPrevisto } from "@/lib/checklist-painel";
import { AVALIACOES, hojeBrasilia, MAX_FOTOS_ITEM, resumoChecklist, situacaoPeriodica, type ItemChecklist, type Periodicidade, type SituacaoPeriodica } from "@/lib/checklist-veiculo";
import { montarChecklistHtml } from "@/lib/checklist-veiculo-html";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import type { FinalidadeChecklist } from "@/lib/equipamentos-checklist";
import { dataHoraBrasilia, formatarData } from "@/lib/gemape";
import { capitalizarTexto } from "@/lib/formatacao-cadastral";
import { useEmpregados } from "@/lib/hooks-gemape";
import { combinaBusca } from "@/lib/parametros-base";
import { EVENTO_REGISTROS_EQUIPAMENTO } from "@/lib/registros-equipamento";
import { executar } from "@/lib/use-parametros-base";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";
import { nomeDoTipo, rotuloDoEquipamento, seloDaSituacao, useChecklistParametros, useChecklistsEq, useEquipamentosDaEmpresa, useEquipamentosTodos, useLeitura } from "./comum";

const TITULO: Record<FinalidadeChecklist, string> = { manutencao: "Check list de manutenção", vistoria: "Check list de vistoria" };
const SITUACAO: Record<SituacaoPeriodica, { rotulo: string; classe: string }> = {
  em_dia: { rotulo: "Em dia", classe: "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" },
  em_andamento: { rotulo: "Em andamento", classe: "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200" },
  pendente: { rotulo: "Pendente", classe: "border-red-300 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200" },
};
const COR_AVALIACAO: Record<string, string> = {
  OK: "border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-600",
  NOK: "border-red-500 bg-red-600 text-white hover:bg-red-600",
  "N.A.": "border-slate-500 bg-slate-600 text-white hover:bg-slate-600",
};
type Tela = { tipo: "novo"; avulso?: boolean } | { tipo: "check"; id: string } | null;

// Dia de hoje em Brasília que se renova sozinho: com a tela aberta na virada do dia, o painel e as previsões acompanham.
function useHojeBrasilia(): string {
  const [hoje, setHoje] = useState(() => hojeBrasilia());
  useEffect(() => {
    const id = window.setInterval(() => setHoje(hojeBrasilia()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return hoje;
}

// Módulos > Equipamentos > Check list de manutenção / de vistoria: a mesma lógica do check list de Veículos. Por equipamento, os itens associados a ele em
// Parâmetros > Equipamentos > Check list (grupos do tipo dele, periodicidade e responsável) são avaliados como OK, NOK ou N.A., com observação e fotos. Item
// NOK gera uma ocorrência do equipamento e uma pendência no próprio check list, aberta até ser resolvida. O painel do mês mostra o previsto e o realizado
// no prazo de cada periodicidade. Cada finalidade (manutenção e vistoria) tem os seus itens, associações, painel e histórico. Só modo demonstração.
export function ChecklistEquipamentoModulo({ finalidade }: { finalidade: FinalidadeChecklist }) {
  const titulo = TITULO[finalidade];
  const { empresas } = useEmpresa();
  const { canWrite } = useAccess();
  const equipamentos = useEquipamentosDaEmpresa();
  const equipamentosTodos = useEquipamentosTodos();
  const { data: empregadosAtivos = [] } = useEmpregados(TODAS, true);
  const parte = useChecklistParametros(finalidade);
  const todosDaFinalidade = useChecklistsEq().filter((c) => c.finalidade === finalidade);
  const chavePrevisoes = `gemape-demo-eq-previsoes-${finalidade}`;
  const previsoes = useLeitura<Previsao[]>(() => lerPrevisoes(localStorage, chavePrevisoes));
  const [tela, setTela] = useState<Tela>(null);
  const [visao, setVisao] = useState<"periodicos" | "avulsos">("periodicos");
  const [busca, setBusca] = useState("");
  // A situação por equipamento mostra só quem tem check list associado; os sem associação (podem ser muitos) ficam escondidos até pedir.
  const [semAssociacao, setSemAssociacao] = useState(false);
  // A lista mostra as primeiras linhas do mês e deixa o resto atrás de "Mostrar todos".
  const [todosOsChecklists, setTodosOsChecklists] = useState(false);
  // A lista mostra um mês de cada vez; sem escolha acompanha o mês de hoje (inclusive na virada do mês), e "todos" mostra tudo.
  const [mesEscolhidoLista, setMesLista] = useState<string | null>(null);
  const [soPendencias, setSoPendencias] = useState(false);
  // Novo check list: primeiro o equipamento, depois o tipo de check list (uma das opções "Patrimônio >> Periodicidade >> Responsável" da associação ou Avulso).
  const [tipoEscolhido, setTipoEscolhido] = useState("");
  const [equipamentoId, setEquipamentoId] = useState("");
  const [responsavelId, setResponsavelId] = useState("");
  // Telas de cadastro abertas ao lado do Novo check list (nunca dentro): o que já foi escolhido continua montado, como em Veículos.
  const [equipamentosAberto, setEquipamentosAberto] = useState(false);
  const [associarAberto, setAssociarAberto] = useState(false);
  const [itensAberto, setItensAberto] = useState(false);
  const [visor, setVisor] = useState<{ foto: string; titulo: string } | null>(null);
  const [confirmando, setConfirmando] = useState<"concluir" | "descartar" | null>(null);
  const [resolvendo, setResolvendo] = useState<string | null>(null);
  const [textoResolucao, setTextoResolucao] = useState("");
  const trava = useRef(false);
  const hoje = useHojeBrasilia();
  const associacaoDe = (id: string) => parte.associacoes.find((a) => a.equipamentoId === id);
  const periodicidadesDe = (id: string) => periodicidadesDaAssociacaoEq(associacaoDe(id));
  const rotuloPeriodo = (p: string) => (p === "Diário" ? "Diária" : p);

  // Mantém em vigor as previsões do painel do mês: equipamentos ativos com associação, desde o dia da associação, uma previsão por periodicidade.
  // Só roda com a lista de equipamentos carregada, para não apagar as previsões em vigor.
  const previstos: VeiculoPrevisto[] = equipamentosTodos.flatMap((e) => {
    const associacao = associacaoDe(e.id);
    return e.status === "Ativo" && associacao
      ? periodicidadesDaAssociacaoEq(associacao).map((periodicidade) => ({
        veiculoId: e.id, veiculoRotulo: rotuloDoEquipamento(e), periodicidade, responsavelNome: associacao.responsavel?.nome ?? "Não definido",
        obrigatorio: periodicidadeObrigatoriaEq(associacao, periodicidade), desde: Number.isNaN(Date.parse(associacao.atualizadoEm)) ? hoje : hojeBrasilia(new Date(associacao.atualizadoEm)),
      }))
      : [];
  });
  const chavePrevistos = JSON.stringify(previstos);
  useEffect(() => {
    try {
      sincronizarPrevisoes({ veiculos: JSON.parse(chavePrevistos) as VeiculoPrevisto[], hoje }, localStorage, { chave: chavePrevisoes, evento: EVENTO_REGISTROS_EQUIPAMENTO });
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível atualizar o painel do mês.", { id: "painel-checklist-eq-sync" });
    }
  }, [chavePrevistos, chavePrevisoes, hoje]);

  const idsDaEmpresa = new Set(equipamentos.map((e) => e.id));
  const checklists = todosDaFinalidade.filter((c) => idsDaEmpresa.has(c.equipamentoId));
  const pendencias = pendenciasAbertasEq(checklists);
  const nomeDe = (c: ChecklistEquipamentoRegistro) =>
    nomeDoChecklistEq({ patrimonio: equipamentosTodos.find((e) => e.id === c.equipamentoId)?.patrimonio ?? "", fallbackEquipamento: c.equipamentoRotulo, periodicidade: rotuloPeriodo(c.periodicidade), responsavelNome: c.responsavelNome });
  // A lista só traz o que tem periodicidade ou responsável; o livre (sem os dois) fica na aba de avulsos.
  const naLista = checklists.filter(checklistVisivelNaListaEq);
  const avulsos = checklists.filter((c) => !checklistVisivelNaListaEq(c));
  const mesLista = mesEscolhidoLista ?? hoje.slice(0, 7);
  // Sem associação mas com pendência NOK aberta (de um avulso) continua na situação: o contador de pendências do cabeçalho conta essa linha.
  const noSituacao = (e: { id: string }) => periodicidadesDe(e.id).length > 0 || pendenciasAbertasEq(checklists, e.id).length > 0;
  const equipamentosSemAssociacao = equipamentos.filter((e) => !noSituacao(e)).length;
  const equipamentosDaSituacao = equipamentos.filter((e) => semAssociacao || noSituacao(e));
  const mesDaLista = mesLista === "todos" ? null : mesLista;
  const naListaDoMes = naLista.filter((c) => noMesDaLista(c, mesDaLista));
  const avulsosDoMes = avulsos.filter((c) => noMesDaLista(c, mesDaLista));
  const avulsoNovo = tela?.tipo === "novo" && tipoEscolhido === "avulso";
  const atual = tela?.tipo === "check" ? (todosDaFinalidade.find((c) => c.id === tela.id) ?? null) : null;
  const equipamentosDoDialogo = equipamentos.filter((e) => e.status === "Ativo");
  const equipamentoEscolhido = equipamentosDoDialogo.find((e) => e.id === equipamentoId);
  // O equipamento escolhido pode ter sido excluído ou desativado numa das janelas ao lado: sem ele na lista, a escolha é limpa e a pessoa é avisada.
  useEffect(() => {
    if (tela?.tipo === "novo" && equipamentoId && !equipamentoEscolhido && !equipamentosAberto) {
      setEquipamentoId("");
      toast.info("O equipamento escolhido não está mais disponível. Escolha outro.");
    }
  }, [tela, equipamentoId, equipamentoEscolhido, equipamentosAberto]);
  const associacaoEscolhida = equipamentoEscolhido ? associacaoDe(equipamentoEscolhido.id) : undefined;
  const responsaveis = equipamentoEscolhido?.empresaId ? empregadosAtivos.filter((e) => e.empresa_id === equipamentoEscolhido.empresaId) : empregadosAtivos;
  const opcaoDoChecklist = (patrimonio: string, periodicidade: string) =>
    nomeDoChecklistEq({ patrimonio, periodicidade: periodicidade === "avulso" ? "" : rotuloPeriodo(periodicidade), responsavelNome: periodicidade === "avulso" ? "" : (associacaoEscolhida?.responsavel?.nome ?? "") });
  // Atalhos para a associação de itens (grupos, periodicidade e responsável) e para o cadastro dos itens, abertos em janelas ao lado do Novo check list.
  const botaoLink = (texto: string, aoClicar: () => void) => (
    <button type="button" className="font-medium text-primary underline underline-offset-2" onClick={aoClicar}>{texto}</button>
  );
  const linkAssociar = canWrite ? botaoLink("Associar itens de check list a um equipamento", () => setAssociarAberto(true)) : `Associe em Parâmetros > Equipamentos > ${titulo}.`;
  const linkItens = canWrite ? botaoLink("Cadastrar itens de check list", () => setItensAberto(true)) : `Cadastre em Parâmetros > Equipamentos > ${titulo}.`;
  // Só os grupos habilitados na associação do equipamento e os da periodicidade escolhida; o avulso traz os grupos avulsos (ou, sem associação, os do tipo).
  const gruposDoEquipamento = !equipamentoEscolhido || !tipoEscolhido ? [] : avulsoNovo
    ? (associacaoEscolhida ? gruposDoChecklistEq(associacaoEscolhida, parte.grupos, "avulso") : gruposDoTipoEq(parte.grupos, equipamentoEscolhido.tipoId))
    : gruposDoChecklistEq(associacaoEscolhida, parte.grupos, tipoEscolhido as Periodicidade);
  const itensDoEquipamento = gruposDoEquipamento.reduce((t, g) => t + g.itens.length, 0);

  const lista = (visao === "avulsos" ? avulsosDoMes : naListaDoMes)
    .filter((c) => !soPendencias || c.itens.some(pendenciaAbertaEq))
    .filter((c) => combinaBusca(busca, c.codigo, nomeDe(c), c.equipamentoRotulo, c.responsavelNome, c.tipoEquipamento, c.status, formatarData(c.data)))
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  const listaVisivel = todosOsChecklists ? lista : lista.slice(0, 10);
  // Mudou o mês, a visão, a busca ou o filtro de pendências: a lista volta às dez primeiras.
  useEffect(() => { setTodosOsChecklists(false); }, [mesLista, visao, busca, soPendencias]);

  function abrirNovo(equipamento?: { id: string; empresaId: string }, periodicidade?: string) {
    setTipoEscolhido(periodicidade ?? "");
    setEquipamentoId(equipamento ? equipamento.id : "");
    setResponsavelId((equipamento && associacaoDe(equipamento.id)?.responsavel?.id) || "");
    setTela({ tipo: "novo" });
  }
  function abrirNovoAvulso() {
    setTipoEscolhido("avulso");
    setEquipamentoId("");
    setResponsavelId("");
    setTela({ tipo: "novo", avulso: true });
  }

  // Responsável da associação que ainda pode responder (ativo e da empresa do equipamento): só então o campo fica escondido e vale o dele.
  const responsavelDaAssociacaoAtivo = !!associacaoEscolhida?.responsavel && responsaveis.some((x) => x.id === associacaoEscolhida.responsavel?.id);

  function iniciar(e: React.FormEvent) {
    e.preventDefault();
    if (trava.current || !equipamentoEscolhido) {
      if (!equipamentoEscolhido) toast.error("Selecione o equipamento.");
      return;
    }
    if (!tipoEscolhido) return void toast.error("Escolha o tipo de check list.");
    // Com associação que define o responsável, o campo fica escondido e vale o dela, mesmo que a associação tenha sido criada depois de o equipamento ser escolhido (pela janela ao lado).
    const idResponsavel = (!avulsoNovo && responsavelDaAssociacaoAtivo && associacaoEscolhida?.responsavel?.id) || responsavelId;
    // O responsável pré-preenchido pode ter sido desligado: o campo mostra vazio, então o envio também recusa.
    if (idResponsavel && !responsaveis.some((x) => x.id === idResponsavel)) return void toast.error("Selecione o responsável: o anterior não está mais ativo.");
    trava.current = true;
    let criado: ChecklistEquipamentoRegistro | undefined;
    const ok = executar(() => {
      const base = { equipamentoId: equipamentoEscolhido.id, equipamentoRotulo: rotuloDoEquipamento(equipamentoEscolhido), tipoEquipamento: nomeDoTipo(equipamentoEscolhido), finalidade, grupos: gruposDoEquipamento };
      criado = avulsoNovo
        ? iniciarChecklistAvulsoEq(base)
        : iniciarChecklistEq({ ...base, periodicidade: tipoEscolhido, responsavelId: idResponsavel, responsavelNome: empregadosAtivos.find((x) => x.id === idResponsavel)?.nome ?? associacaoEscolhida?.responsavel?.nome ?? "" });
    }, avulsoNovo ? "Check list avulso iniciado" : "Check list iniciado");
    if (ok && criado) setTela({ tipo: "check", id: criado.id });
    window.setTimeout(() => { trava.current = false; }, 600);
  }

  const avaliar = (c: ChecklistEquipamentoRegistro, i: ItemChecklist, avaliacao: string | null, observacao = i.observacao) => { executar(() => avaliarItemEq(c.id, i.id, { avaliacao, observacao })); };
  function concluir(c: ChecklistEquipamentoRegistro) {
    setConfirmando(null);
    if (trava.current) return;
    trava.current = true;
    const nok = c.itens.filter((i) => i.avaliacao === "NOK").length;
    executar(() => concluirChecklistEq(c.id), nok > 0 ? `Check list concluído: ${nok} ocorrência(s) aberta(s)` : "Check list concluído");
    window.setTimeout(() => { trava.current = false; }, 800);
  }
  function gerarPdf(c: ChecklistEquipamentoRegistro) {
    const e = equipamentosTodos.find((x) => x.id === c.equipamentoId);
    const empresa = empresas.find((x) => x.id === e?.empresaId)?.razao_social ?? "GEMAPE";
    abrirDocumento({
      titulo: `${titulo} ${c.codigo}`,
      html: montarChecklistHtml({ ...c, veiculoRotulo: c.equipamentoRotulo, tipoVeiculo: c.tipoEquipamento }, empresa, "equipamento"),
      arquivo: nomeArquivoDocumento(titulo, c.codigo, c.equipamentoRotulo, c.data),
    });
  }
  function resolver(c: ChecklistEquipamentoRegistro) {
    if (!resolvendo || trava.current) return;
    trava.current = true;
    window.setTimeout(() => { trava.current = false; }, 600);
    const ok = executar(() => resolverPendenciaEq(c.id, resolvendo, capitalizarTexto(textoResolucao)), "Pendência resolvida");
    if (ok) { setResolvendo(null); setTextoResolucao(""); }
  }

  const andamento = atual?.status === "Em andamento";
  const resumo = atual ? resumoChecklist(atual) : null;
  const grupos = atual ? [...new Set(atual.itens.map((i) => i.grupo))] : [];
  // O painel usa os mesmos campos do de Veículos: aqui o "veículo" é o equipamento.
  const emAndamento = todosDaFinalidade.filter((c) => c.status === "Em andamento" && idsDaEmpresa.has(c.equipamentoId));
  const pendente = maisRecenteEmAndamento(emAndamento);
  const outrosPendentes = Math.max(0, emAndamento.length - 1);
  const paraPainel = todosDaFinalidade.filter(checklistVisivelNaListaEq).map((c) => ({ ...c, veiculoId: c.equipamentoId }));

  return (
    <div className="space-y-5">
      {tela === null && pendente && (
        <BannerLancamentoAberto
          criadoEm={pendente.criadoEm} nome={nomeDe(pendente)} outros={outrosPendentes} podeDescartar={canWrite}
          aoContinuar={() => setTela({ tipo: "check", id: pendente.id })}
          aoDescartar={() => { executar(() => excluirChecklistEmAndamentoEq(pendente.id), "Check list descartado"); }}
        />
      )}
      <ChecklistPainelMensal
        previsoes={previsoes} checklists={paraPainel} idsDosVeiculos={idsDaEmpresa} hoje={hoje} onAbrirChecklist={(id) => setTela({ tipo: "check", id })}
        objeto="Equipamento" textoVazio={`Nenhum check list previsto: associe itens de check list aos equipamentos em Parâmetros > Equipamentos > ${titulo}.`}
      />

      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold">Situação por equipamento</h2>
          <p className="text-xs text-muted-foreground">{pendencias.length} pendência(s) NOK aberta(s).</p>
          { equipamentosSemAssociacao > 0 && <Button variant="ghost" size="sm" aria-pressed={semAssociacao} onClick={() => setSemAssociacao((v) => !v)}>{semAssociacao ? "Ocultar" : "Mostrar"} sem associação ({equipamentosSemAssociacao})</Button>}
          <Button requiresWrite="operar" className="ml-auto" onClick={() => abrirNovo()}>Novo check list</Button>
        </div>
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Equipamento</TableHead><TableHead>Tipo</TableHead><TableHead>Periodicidade</TableHead><TableHead>Situação</TableHead><TableHead className="text-right">Pendências</TableHead><TableHead /></TableRow>
            </TableHeader>
            <TableBody>
              {equipamentosDaSituacao.length === 0 && <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">{equipamentos.length === 0 ? "Nenhum equipamento cadastrado." : "Nenhum equipamento com check list associado."}</TableCell></TableRow>}
              {equipamentosDaSituacao.flatMap((e) => {
                // Uma linha por periodicidade do equipamento; sem associação, uma linha só.
                const periodicidades: (Periodicidade | null)[] = periodicidadesDe(e.id).length > 0 ? periodicidadesDe(e.id) : [null];
                return periodicidades.map((per) => {
                  const doEquipamento = naLista.filter((c) => c.equipamentoId === e.id && (per === null || c.periodicidade === per));
                  const sit = per ? situacaoPeriodica(per, doEquipamento, hoje) : null;
                  const aberto = doEquipamento.find((c) => c.status === "Em andamento");
                  return (
                    <TableRow key={`${e.id}-${per ?? "sem"}`}>
                      <TableCell>{rotuloDoEquipamento(e)}</TableCell>
                      <TableCell>{nomeDoTipo(e)}</TableCell>
                      <TableCell>{per ? rotuloPeriodo(per) : "—"}</TableCell>
                      <TableCell>{sit ? <Badge variant="outline" className={SITUACAO[sit].classe}>{SITUACAO[sit].rotulo}</Badge> : <span className="text-xs text-muted-foreground">Sem associação</span>}</TableCell>
                      <TableCell className="text-right">{pendenciasAbertasEq(checklists, e.id).filter((p) => per === null || p.checklist.periodicidade === per).length}</TableCell>
                      <TableCell className="text-right">
                        {aberto
                          ? <Button requiresWrite="operar" variant="ghost" size="sm" onClick={() => setTela({ tipo: "check", id: aberto.id })}>Continuar</Button>
                          : <Button requiresWrite="operar" variant="ghost" size="sm" disabled={!per || e.status !== "Ativo"} onClick={() => abrirNovo(e, per ?? undefined)}>Iniciar</Button>}
                      </TableCell>
                    </TableRow>
                  );
                });
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex flex-wrap items-end gap-2">
          <h2 className="text-sm font-semibold">Check lists</h2>
          <div className="flex gap-1" role="group" aria-label="Tipo de check list">
            <Button size="sm" variant={visao === "periodicos" ? "default" : "outline"} aria-pressed={visao === "periodicos"} onClick={() => setVisao("periodicos")}>Periódicos ({naListaDoMes.length})</Button>
            <Button size="sm" variant={visao === "avulsos" ? "default" : "outline"} aria-pressed={visao === "avulsos"} onClick={() => setVisao("avulsos")}>Avulsos ({avulsosDoMes.length})</Button>
          </div>
          <Button variant={soPendencias ? "default" : "outline"} size="sm" onClick={() => setSoPendencias((v) => !v)}>
            Com pendências abertas ({(visao === "avulsos" ? avulsosDoMes : naListaDoMes).filter((c) => c.itens.some(pendenciaAbertaEq)).length})
          </Button>
          <BarraDeFiltros>
            <div className="flex items-center gap-1.5">
              <Label htmlFor="mes_lista" className="text-xs">Mês</Label>
              <Select value={mesLista} onValueChange={setMesLista}>
                <SelectTrigger id="mes_lista" className="h-8 w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os meses</SelectItem>
                  {mesesDisponiveis(hoje).map((m) => <SelectItem key={m} value={m}>{rotuloDoMes(m)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Input aria-label="Buscar check list" placeholder="Buscar por código, equipamento ou responsável" className="max-w-xs" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </BarraDeFiltros>
          {visao === "avulsos" && <Button requiresWrite="operar" size="sm" onClick={abrirNovoAvulso}>Novo check list avulso</Button>}
        </div>
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Código</TableHead><TableHead>Check list</TableHead><TableHead>Data</TableHead><TableHead>Avaliação</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Pendências</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {lista.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">{busca.trim() || soPendencias ? "Nenhum resultado para o filtro." : visao === "avulsos" ? "Nenhum check list avulso feito ainda." : "Nenhum check list feito ainda."}</TableCell></TableRow>
              )}
              {listaVisivel.map((c) => {
                const r = resumoChecklist(c);
                return (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => setTela({ tipo: "check", id: c.id })}>
                    <TableCell className="font-mono text-xs">{c.codigo}</TableCell>
                    <TableCell className="whitespace-nowrap font-medium">{nomeDe(c)}</TableCell>
                    <TableCell>{formatarData(c.data)}</TableCell>
                    <TableCell className="text-xs">{r.avaliados}/{r.total} · {r.ok} OK · {r.nok} NOK · {r.na} N.A.</TableCell>
                    <TableCell><Badge variant="outline" className={seloDaSituacao(c.status)}>{c.status}</Badge></TableCell>
                    <TableCell className="text-right">{r.pendenciasAbertas > 0 ? <span className="font-semibold text-red-700 dark:text-red-300">{r.pendenciasAbertas}</span> : 0}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {lista.length > 10 && (
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" onClick={() => setTodosOsChecklists((v) => !v)}>{todosOsChecklists ? "Mostrar menos" : `Mostrar todos os ${lista.length} check lists`}</Button>
          </div>
        )}
      </section>

      <Dialog open={tela?.tipo === "novo"} onOpenChange={(a) => !a && setTela(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo {titulo.toLowerCase()}</DialogTitle>
            <DialogDescription>
              {avulsoNovo
                ? "Escolha o equipamento: o avulso traz só os grupos marcados como Avulso na associação do equipamento, para registrar itens mais simples."
                : `Escolha o equipamento e o tipo de check list: as opções são os check lists associados ao equipamento em Parâmetros > Equipamentos > ${titulo}.`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={iniciar} className="min-w-0 space-y-4 [&_p]:break-words">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="ck_equipamento">Equipamento</Label>
              <Select
                value={equipamentoId}
                onValueChange={(id) => {
                  setEquipamentoId(id);
                  // O tipo de check list escolhido só vale se o novo equipamento tem essa opção.
                  setTipoEscolhido((t) => (t === "avulso" || periodicidadesDe(id).includes(t as Periodicidade) ? t : ""));
                  // O responsável definido na associação já vem preenchido.
                  setResponsavelId(associacaoDe(id)?.responsavel?.id ?? "");
                }}
              >
                <SelectTrigger id="ck_equipamento" className="min-w-0 [&>span]:min-w-0 [&>span]:truncate"><SelectValue placeholder="Selecione o equipamento" /></SelectTrigger>
                <SelectContent>{equipamentosDoDialogo.map((e) => <SelectItem key={e.id} value={e.id}>{rotuloDoEquipamento(e)}</SelectItem>)}</SelectContent>
              </Select>
              {canWrite && (
                <p className="text-xs text-muted-foreground">
                  Equipamento não está na lista? {botaoLink("Cadastrar equipamento", () => setEquipamentosAberto(true))}
                </p>
              )}
              {equipamentosDoDialogo.length === 0 && <p className="text-xs text-muted-foreground">Nenhum equipamento ativo cadastrado. A situação e o tipo do equipamento são definidos em Parâmetros &gt; Equipamentos &gt; Cadastrar equipamento.</p>}
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="ck_modo">Tipo de check list</Label>
              <Select value={tipoEscolhido} onValueChange={setTipoEscolhido} disabled={!equipamentoEscolhido}>
                <SelectTrigger id="ck_modo" className="min-w-0 [&>span]:min-w-0 [&>span]:truncate"><SelectValue placeholder={equipamentoEscolhido ? "Selecione o tipo de check list" : "Escolha o equipamento primeiro"} /></SelectTrigger>
                <SelectContent>
                  {equipamentoEscolhido && periodicidadesDe(equipamentoEscolhido.id).map((p) => <SelectItem key={p} value={p}>{opcaoDoChecklist(equipamentoEscolhido.patrimonio, p)}</SelectItem>)}
                  {equipamentoEscolhido && <SelectItem value="avulso">{opcaoDoChecklist(equipamentoEscolhido.patrimonio, "avulso")}</SelectItem>}
                </SelectContent>
              </Select>
              {equipamentoEscolhido && periodicidadesDe(equipamentoEscolhido.id).length === 0 && <p className="text-xs text-muted-foreground">Este equipamento não tem check list periódico associado. {linkAssociar}</p>}
              {equipamentoEscolhido && !tipoEscolhido && <p className="text-xs text-muted-foreground">Escolha o tipo de check list para ver os itens e iniciar.</p>}
              {equipamentoEscolhido && tipoEscolhido && (
                <p className="text-xs text-muted-foreground">
                  {gruposDoEquipamento.length === 0
                    ? (avulsoNovo ? (associacaoEscolhida ? <>Este equipamento não tem grupos Avulso na associação. {linkAssociar}</> : <>Não há itens de check list para o tipo deste equipamento. {linkItens}</>) : <>Este equipamento não tem itens associados. {linkAssociar}</>)
                    : `${itensDoEquipamento} ${itensDoEquipamento === 1 ? "item" : "itens"} em ${gruposDoEquipamento.length} ${gruposDoEquipamento.length === 1 ? "grupo" : "grupos"}: ${gruposDoEquipamento.map((g) => g.nome).join(", ")}.`}
                  {!avulsoNovo && pendenciasAbertasEq(checklists, equipamentoEscolhido.id).length > 0 && ` · ${pendenciasAbertasEq(checklists, equipamentoEscolhido.id).length} pendência(s) aberta(s) de check lists anteriores`}
                </p>
              )}
            </div>
            {!avulsoNovo && tipoEscolhido && !responsavelDaAssociacaoAtivo && (
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="ck_resp">Responsável pelo check list</Label>
                <Select value={responsavelId} onValueChange={setResponsavelId}>
                  <SelectTrigger id="ck_resp" className="min-w-0 [&>span]:min-w-0 [&>span]:truncate"><SelectValue placeholder="Selecione o responsável" /></SelectTrigger>
                  <SelectContent>{responsaveis.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTela(null)}>Cancelar</Button>
              <Button type="submit" disabled={!!equipamentoEscolhido && !!tipoEscolhido && gruposDoEquipamento.length === 0}>Iniciar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DialogItensChecklistEquipamento aberto={itensAberto} onAbrirMudou={setItensAberto} finalidade={finalidade} />
      <DialogAssociarChecklistEquipamento aberto={associarAberto} onAbrirMudou={setAssociarAberto} finalidade={finalidade} equipamentoId={equipamentoId} />
      <EquipamentoDialog
        aberto={equipamentosAberto}
        onAberto={setEquipamentosAberto}
        editando={null}
        modelo={null}
        onSalvo={() => window.dispatchEvent(new Event(EVENTO_REGISTROS_EQUIPAMENTO))}
      />

      <Dialog open={!!atual} onOpenChange={(a) => { if (!a) { (document.activeElement as HTMLElement | null)?.blur(); setTela(null); } }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
          {atual && resumo && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  {atual.codigo} <Badge variant={andamento ? "outline" : "secondary"}>{atual.status}</Badge>
                  <span className="text-sm font-normal text-muted-foreground">{nomeDe(atual)}</span>
                </DialogTitle>
                <DialogDescription>
                  {atual.equipamentoRotulo} · {atual.tipoEquipamento || "sem tipo"} · {checklistVisivelNaListaEq(atual) ? `${rotuloPeriodo(atual.periodicidade)} · ${formatarData(atual.data)} · responsável: ${atual.responsavelNome}` : `avulso · ${formatarData(atual.data)}`}
                  {atual.concluidoEm && ` · concluído em ${dataHoraBrasilia(atual.concluidoEm)}`}
                </DialogDescription>
              </DialogHeader>
              <p className="text-sm">
                {resumo.avaliados}/{resumo.total} avaliados · {resumo.ok} OK · <span className="text-red-700 dark:text-red-300">{resumo.nok} NOK</span> · {resumo.na} N.A.
                {resumo.pendenciasAbertas > 0 && ` · ${resumo.pendenciasAbertas} pendência(s) aberta(s)`}
              </p>
              {grupos.map((g) => (
                <section key={g} className="space-y-2">
                  <h3 className="text-sm font-semibold">{g}</h3>
                  {atual.itens.filter((i) => i.grupo === g).map((i) => (
                    <div key={i.id} className="space-y-2 rounded-lg border p-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="min-w-0 flex-1 text-sm">{i.nome}</span>
                        <div className="flex gap-1" role="group" aria-label={`Avaliação de ${i.nome}`}>
                          {AVALIACOES.map((a) => (
                            <Button key={a} type="button" size="sm" disabled={!andamento} variant={i.avaliacao === a ? "default" : "outline"} className={i.avaliacao === a ? COR_AVALIACAO[a] : ""} aria-pressed={i.avaliacao === a}
                              onClick={() => avaliar(atual, i, i.avaliacao === a ? null : a)}>{a}</Button>
                          ))}
                        </div>
                      </div>
                      {andamento ? (
                        <Input capitalizar="texto" aria-label={`Observação de ${i.nome}`} placeholder={i.avaliacao === "NOK" ? "Descreva o problema (obrigatório)" : "Observação (opcional)"} maxLength={500} defaultValue={i.observacao}
                          onBlur={(e) => { if (e.target.value.trim() !== i.observacao) avaliar(atual, i, i.avaliacao, capitalizarTexto(e.target.value)); }} />
                      ) : (i.observacao && <p className="text-xs text-muted-foreground">Observação: {i.observacao}</p>)}
                      {(andamento || i.fotos.length > 0) && (
                        <div className="flex flex-wrap items-center gap-2">
                          {andamento && <BotaoAnexarFotos quantidadeAtual={i.fotos.length} maximo={MAX_FOTOS_ITEM} oQue="item" onFotos={(f) => executar(() => adicionarFotosItemEq(atual.id, i.id, f), "Fotos anexadas")} />}
                          <GaleriaFotos fotos={i.fotos} onAmpliar={(n) => setVisor({ foto: i.fotos[n] ?? "", titulo: `${i.nome} (${atual.codigo})` })}
                            onRemover={andamento ? (n) => { executar(() => removerFotoItemEq(atual.id, i.id, n), "Foto removida"); } : undefined} />
                        </div>
                      )}
                      {i.avaliacao === "NOK" && !andamento && (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {i.ocorrenciaCodigo && <Badge variant="outline">Ocorrência {i.ocorrenciaCodigo}</Badge>}
                          {i.resolucao ? (
                            <span className="text-emerald-700 dark:text-emerald-300">Pendência resolvida em {dataHoraBrasilia(i.resolucao.resolvidaEm)}: {i.resolucao.descricao}</span>
                          ) : (
                            <>
                              <span className="font-medium text-red-700 dark:text-red-300">Pendência aberta</span>
                              {canWrite && <Button type="button" size="sm" variant="outline" onClick={() => { setTextoResolucao(""); setResolvendo(i.id); }}>Resolver pendência</Button>}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </section>
              ))}
              <DialogFooter className="gap-2">
                {andamento ? (
                  <>
                    <Button type="button" variant="destructive" onClick={() => setConfirmando("descartar")}>Descartar</Button>
                    <Button type="button" variant="outline" onClick={() => setTela(null)}>Continuar depois</Button>
                    <Button type="button" onClick={() => setConfirmando("concluir")}>Concluir check list</Button>
                  </>
                ) : (
                  <>
                    <Button type="button" variant="outline" onClick={() => setTela(null)}>Fechar</Button>
                    <Button type="button" onClick={() => gerarPdf(atual)}>Gerar PDF</Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmando === "concluir"} onOpenChange={(a) => !a && setConfirmando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concluir o check list?</AlertDialogTitle>
            <AlertDialogDescription>
              {atual && resumo && (resumo.nok > 0
                ? `Os ${resumo.nok} item(ns) NOK vão gerar ${resumo.nok} ocorrência(s) aberta(s) do equipamento e ficar como pendência. Depois de concluído, as avaliações não podem mais ser alteradas.`
                : "Depois de concluído, as avaliações não podem mais ser alteradas.")}
              {atual && resumo && resumo.avaliados < resumo.total && ` Faltam ${resumo.total - resumo.avaliados} item(ns) para avaliar.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => atual && concluir(atual)}>Sim, concluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmando === "descartar"} onOpenChange={(a) => !a && setConfirmando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar o check list em andamento?</AlertDialogTitle>
            <AlertDialogDescription>Todas as avaliações e fotos deste check list serão perdidas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { const id = atual?.id; setConfirmando(null); if (id && executar(() => excluirChecklistEmAndamentoEq(id), "Check list descartado")) setTela(null); }}>Descartar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={resolvendo !== null} onOpenChange={(a) => !a && setResolvendo(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resolver pendência</DialogTitle>
            <DialogDescription>Registre o que foi feito. A ocorrência ligada segue a sua própria tratativa.</DialogDescription>
          </DialogHeader>
          <Textarea capitalizar="texto" aria-label="Como foi resolvida" rows={4} maxLength={500} value={textoResolucao} onChange={(e) => setTextoResolucao(e.target.value)} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setResolvendo(null)}>Cancelar</Button>
            <Button type="button" onClick={() => atual && resolver(atual)}>Resolver</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VisorFoto foto={visor?.foto ?? null} titulo={visor?.titulo ?? ""} onFechar={() => setVisor(null)} />
    </div>
  );
}
