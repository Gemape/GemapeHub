import { useNavigate, useSearch } from "@tanstack/react-router";
import { useVoltarAoExtrato } from "@/lib/use-voltar-ao-extrato";
import { CalendarCheck, ClipboardList } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { gruposAvulsosDaAssociacao, gruposDaPeriodicidade, nomeDoChecklistAssociado } from "@/lib/checklist-associacao-veiculo";
import { capitalizarTexto } from "@/lib/formatacao-cadastral";
import { toast } from "sonner";

import { BotaoAnexarFotos, GaleriaFotos, VisorFoto } from "@/components/modules/FotosOcorrencia";
import { DialogItensChecklist } from "@/components/modules/DialogItensChecklist";
import { DialogAssociarChecklist } from "@/components/modules/DialogAssociarChecklist";
import { DialogCadastroVeiculos } from "@/components/modules/DialogCadastroVeiculos";
import { ChecklistListaAvulsa, ChecklistListaPeriodica } from "@/components/modules/ChecklistListasVeiculo";
import { useFocoDaTela } from "@/lib/use-foco-da-tela";
import { ChecklistResultadosPainel } from "@/components/modules/ChecklistResultadosPainel";
import { rotuloDoVeiculo } from "@/components/modules/rotulo-veiculo";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAccess } from "@/lib/access-context";
import {
  adicionarFotosItem, AVALIACOES, avaliarItem, concluirChecklist, ehPeriodicidade, excluirChecklistEmAndamento,
  hojeBrasilia, iniciarChecklist, MAX_FOTOS_ITEM, pendenciasAbertas, removerFotoItem,
  PERIODICIDADES, periodicidadeObrigatoria, periodicidadesDaAssociacao, checklistVisivelNaLista, nomeDoChecklist, gruposAssociadosDoVeiculo, gruposAplicaveis, iniciarChecklistAvulso, veiculosDoTipoChecklist, TIPOS_CHECKLIST, tipoChecklistDaSubcategoria, GRUPOS_CHECKLIST, type GrupoChecklist, ehTipoChecklist, resolverPendencia, resumoChecklist, type ChecklistVeiculo, type ItemChecklist, type Periodicidade,
} from "@/lib/checklist-veiculo";
import { mesDe, noMesDaLista, sincronizarPrevisoes, type VeiculoPrevisto } from "@/lib/checklist-painel";
import { montarChecklistHtml } from "@/lib/checklist-veiculo-html";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { grupoDeAreaPorNome } from "@/lib/area-responsaveis";
import { soEmpregadosDeVeiculos } from "@/lib/empregados-veiculos";
import { dataHoraBrasilia, formatarData } from "@/lib/gemape";
import { definirTituloDaPagina } from "@/lib/titulo-pagina";
import { useEmpregados, useVeiculos, type Veiculo } from "@/lib/hooks-gemape";
import { resolverSubcategoria } from "@/lib/subcategoria-referencia";
import { useAssociacoesChecklist, useChecklistsVeiculo, usePrevisoesChecklist } from "@/lib/use-registros-veiculo";
import { executar, useParametrosBase } from "@/lib/use-parametros-base";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";

type VeiculoChecklist = Veiculo;


const COR_AVALIACAO: Record<string, string> = {
  OK: "border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-600",
  NOK: "border-red-500 bg-red-600 text-white hover:bg-red-600",
  "N.A.": "border-slate-500 bg-slate-600 text-white hover:bg-slate-600",
};

type Tela = { tipo: "novo"; avulso?: boolean } | { tipo: "check"; id: string } | null;

// Módulos > Veículos > Check list (decisão 63): por veículo, os itens do tipo dele (Parâmetros >
// Veículos > Itens check list) são avaliados como OK, NOK ou N.A., com observação e fotos. Item NOK
// gera uma ocorrência e uma pendência no próprio check list, que fica aberta até ser resolvida. A
// periodicidade vem da associação do veículo em Parâmetros (decisão 75). Só modo demonstração; nada no Supabase.
// Dia de hoje em Brasília que se renova sozinho: com a tela aberta na virada do dia, o painel e as previsões acompanham.
function useHojeBrasilia(): string {
  const [hoje, setHoje] = useState(() => hojeBrasilia());
  useEffect(() => {
    const id = window.setInterval(() => setHoje(hojeBrasilia()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return hoje;
}

export function ChecklistVeiculoModulo() {
  const { empresaId, empresas } = useEmpresa();
  const { canWrite } = useAccess();
  const parametros = useParametrosBase();
  const { data: veiculosLista = [] } = useVeiculos(empresaId);
  const veiculos = veiculosLista as VeiculoChecklist[];
  // O painel mensal prevê os check lists de todas as empresas, para não perder previsões ao trocar de empresa.
  const { data: veiculosTodasLista = [], isSuccess: veiculosCarregados } = useVeiculos(TODAS);
  const { data: empregadosAtivos = [] } = useEmpregados(TODAS, true);
  const todos = useChecklistsVeiculo();
  const [tela, setTela] = useState<Tela>(null);
  // Tela principal (decisão 298): o painel com os indicadores e os resultados dos responsáveis, e as listas do check list periódico e do avulso, em botões separados.
  const [aba, setAba] = useState<"painel" | "periodicos" | "avulsos">("painel");
  // Foco do teclado ao trocar de tela (decisão 333).
  const { voltarRef, botaoDaTela } = useFocoDaTela(aba, "painel");
  // O título grande da página acompanha a lista aberta: Check list periódico ou Check list avulso (decisão 326); no painel volta a ser o nome da aba.
  useEffect(() => {
    definirTituloDaPagina(aba === "periodicos" ? "Check list periódico" : aba === "avulsos" ? "Check list avulso" : null);
    return () => definirTituloDaPagina(null);
  }, [aba]);
  // Novo check list (decisão 157): primeiro o veículo, depois o tipo de check list, uma das opções "Placa >> Periodicidade >> Responsável"
  // da associação do veículo ou Avulso. Guarda a periodicidade escolhida, "avulso" ou vazio (ainda sem escolha).
  const [tipoEscolhido, setTipoEscolhido] = useState("");
  const [veiculoId, setVeiculoId] = useState("");
  const [veiculosAberto, setVeiculosAberto] = useState(false);
  const [associarAberto, setAssociarAberto] = useState(false);
  const [itensAberto, setItensAberto] = useState(false);
  const [responsavelId, setResponsavelId] = useState("");
  // De quem é o check list (decisão 323): só vale o que a pessoa escolheu; sem escolha, o campo mostra o padrão (grupoPadrao).
  const [grupoEscolhido, setGrupoEscolhido] = useState<GrupoChecklist | "">("");
  const [visor, setVisor] = useState<{ foto: string; titulo: string } | null>(null);
  const [confirmando, setConfirmando] = useState<"concluir" | "descartar" | null>(null);
  const [resolvendo, setResolvendo] = useState<string | null>(null);
  const [textoResolucao, setTextoResolucao] = useState("");
  const trava = useRef(false);
  const hoje = useHojeBrasilia();
  const associacoes = useAssociacoesChecklist();
  const previsoes = usePrevisoesChecklist();
  // A periodicidade não é escolhida aqui: vem de Parâmetros > Veículos > Check list.
  const associacaoDe = (v: VeiculoChecklist) => associacoes.find((a) => a.veiculoId === v.id);
  // Periodicidade do check list periódico: a escolhida (se o veículo tem mais de uma) ou a mais frequente (decisão 119).
  const periodicidadesDe = (v: VeiculoChecklist) => periodicidadesDaAssociacao(associacaoDe(v));
  const periodicidadeDe = (v: VeiculoChecklist) => periodicidadesDe(v)[0] ?? null; // a mais frequente: situação por veículo e painel
  const periodicidadeDoDialogo = (v: VeiculoChecklist) => periodicidadesDe(v).find((p) => p === tipoEscolhido) ?? null;

  // Mantém em vigor as previsões do painel mensal (decisão 80): veículos ativos com associação, desde o dia da
  // associação. Só roda com a lista de veículos carregada: sem ela, as previsões em vigor seriam apagadas.
  // Uma previsão por periodicidade do veículo (decisão 124): Semanal e Mensal viram dois prazos no painel.
  const previstos: VeiculoPrevisto[] = (veiculosTodasLista as VeiculoChecklist[]).flatMap((v) => {
    const associacao = associacoes.find((a) => a.veiculoId === v.id);
    return v.status === "Ativo" && associacao
      ? periodicidadesDaAssociacao(associacao).map((periodicidade) => ({
          veiculoId: v.id, veiculoRotulo: rotuloDoVeiculo(parametros, v), periodicidade,
          responsavelNome: associacao.responsavel?.nome ?? "Não definido", obrigatorio: periodicidadeObrigatoria(associacao, periodicidade), desde: Number.isNaN(Date.parse(associacao.atualizadoEm)) ? hoje : hojeBrasilia(new Date(associacao.atualizadoEm)),
        }))
      : [];
  });
  const chavePrevistos = JSON.stringify(previstos);
  useEffect(() => {
    if (!veiculosCarregados) return;
    try {
      sincronizarPrevisoes({ veiculos: JSON.parse(chavePrevistos) as VeiculoPrevisto[], hoje });
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível atualizar o painel do mês.", { id: "painel-checklist-sync" });
    }
  }, [veiculosCarregados, chavePrevistos, hoje]);

  const idsDaEmpresa = new Set(veiculos.map((v) => v.id));
  const rotuloDe = (v: VeiculoChecklist) => rotuloDoVeiculo(parametros, v);
  const tipoDe = (v: VeiculoChecklist) => resolverSubcategoria(parametros, "cat-veiculos", v);
  const tipoCheckDe = (v: VeiculoChecklist) => tipoChecklistDaSubcategoria(tipoDe(v)?.nome);
  const checklists = todos.filter((c) => idsDaEmpresa.has(c.veiculoId));
  // Nome do check list (decisão 90): Placa >> Periodicidade >> Responsável.
  const nomeDe = (c: ChecklistVeiculo) =>
    nomeDoChecklist({ placa: veiculos.find((v) => v.id === c.veiculoId)?.placa ?? "", fallbackVeiculo: c.veiculoRotulo, periodicidade: c.periodicidade, responsavelNome: c.responsavelNome });
  // O avulso (decisão 90) não tem periodicidade nem responsável: fica numa lista à parte e não entra no painel do mês nem na situação por veículo.
  const avulsos = checklists.filter((c) => !checklistVisivelNaLista(c));
  const previstosDoMes = previsoes.filter((pv) => idsDaEmpresa.has(pv.veiculoId) && mesDe(pv.fim) === mesDe(hoje)).length;
  const avulsosDoMesAtual = avulsos.filter((c) => noMesDaLista(c, mesDe(hoje))).length;
  const avulsoNovo = tela?.tipo === "novo" && tipoEscolhido === "avulso";
  const atual = tela?.tipo === "check" ? (todos.find((c) => c.id === tela.id) ?? null) : null;
  // No avulso não há campo de tipo de veículo (decisão 118): entram todos os veículos ativos que têm tipo de check list, e o tipo vem do veículo.
  const veiculosDoDialogo = veiculos.filter((v) => v.status === "Ativo" && tipoCheckDe(v) !== null);
  const veiculoEscolhido = veiculosDoDialogo.find((v) => v.id === veiculoId);
  // O responsável é da mesma empresa do veículo (a lista de empregados traz todas as empresas).
  // Só quem foi escolhido em Parâmetros > Veículos > Parâmetros Específicos (lista vazia = todos).
  const responsaveisDoVeiculo = soEmpregadosDeVeiculos(veiculoEscolhido?.empresa_id ? empregadosAtivos.filter((e) => e.empresa_id === veiculoEscolhido.empresa_id) : empregadosAtivos);
  const tipoCheckNome = TIPOS_CHECKLIST.find((t) => t.id === (veiculoEscolhido ? tipoCheckDe(veiculoEscolhido) : null))?.nome ?? "";
  // Opção do tipo de check list: o nome do check list como está na associação do veículo (Parâmetros > Veículos > Check list):
  // Placa >> Periodicidade >> Responsável; o avulso é "Não definida" na periodicidade.
  const opcaoDoChecklist = (v: VeiculoChecklist, periodicidade: string) =>
    nomeDoChecklistAssociado((v.placa ?? "").trim().toUpperCase() || rotuloDe(v), associacaoDe(v), periodicidade);
  // Atalho para a associação de itens (grupos, periodicidade e responsável), aberta numa janela ao lado do Novo check list.
  const linkAssociar = canWrite ? (
    <button type="button" className="font-medium text-primary underline underline-offset-2" onClick={() => setAssociarAberto(true)}>
      Associar itens de check list a um veículo
    </button>
  ) : "Associe em Parâmetros > Veículos > Check list.";
  // Atalho para o cadastro dos itens padrão (Parâmetros > Veículos > Check list), aberto numa janela ao lado do Novo check list avulso.
  const linkItens = canWrite ? (
    <button type="button" className="font-medium text-primary underline underline-offset-2" onClick={() => setItensAberto(true)}>
      Cadastrar itens de check list
    </button>
  ) : "Cadastre em Parâmetros > Veículos > Check list.";
  // Só os grupos habilitados na associação do veículo escolhido (decisão 76), e só os da periodicidade do check list (decisão 119):
  // o periódico traz os grupos da sua periodicidade; o avulso traz os "Não definida" (ou todos, se o veículo é de check list avulso).
  // Veículo sem associação: o avulso traz os grupos do tipo do veículo.
  const associacaoEscolhida = veiculoEscolhido ? associacaoDe(veiculoEscolhido) : undefined;
  const comoAssociacao = (itens: { grupoId: string; itensIds?: string[] }[]) => gruposAssociadosDoVeiculo({ itens } as never, parametros.itensChecklistVeiculo);
  const gruposDoVeiculo = !veiculoEscolhido
    ? []
    : avulsoNovo
      ? (!associacaoEscolhida
        ? gruposAplicaveis(parametros.itensChecklistVeiculo, tipoDe(veiculoEscolhido)?.id ?? null, true)
        : comoAssociacao(gruposAvulsosDaAssociacao(associacaoEscolhida)))
      : comoAssociacao(gruposDaPeriodicidade(associacaoEscolhida, periodicidadeDoDialogo(veiculoEscolhido) ?? ""));
  const itensDoVeiculo = gruposDoVeiculo.reduce((t, g) => t + g.itens.length, 0);

  // Vindo do extrato do veículo (?veiculo=), abre o Novo check list desse veículo uma vez e tira o parâmetro do endereço (decisão 331).
  const { veiculo: veiculoPedido, avulso: avulsoPedido, periodicidade: periodicidadePedida, voltar } = useSearch({ from: "/_authenticated/veiculos" });
  const navegar = useNavigate();
  useEffect(() => {
    if (!veiculoPedido || !veiculosCarregados) return;
    const v = (veiculosTodasLista as VeiculoChecklist[]).find((x) => x.id === veiculoPedido);
    if (v) {
      if (avulsoPedido) {
        abrirNovoAvulso();
        setVeiculoId(v.id);
      } else abrirNovo(v, periodicidadePedida);
    }
    void navegar({ to: "/veiculos", search: { aba: "checklist" }, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [veiculoPedido, veiculosCarregados]);

  // Vindo do extrato (decisão 346), ao fechar a tela do check list a pessoa volta ao extrato do veículo.
  useVoltarAoExtrato(tela !== null, voltar);

  function abrirNovoAvulso() {
    setTipoEscolhido("avulso");
    setVeiculoId("");
    setResponsavelId("");
    setGrupoEscolhido("");
    setTela({ tipo: "novo", avulso: true });
  }

  function abrirNovo(v?: VeiculoChecklist, periodicidade?: string) {
    setTipoEscolhido(periodicidade ?? (v ? periodicidadeDe(v) ?? "" : ""));
    setVeiculoId(v && tipoCheckDe(v) ? v.id : "");
    setResponsavelId((v && associacaoDe(v)?.responsavel?.id) || v?.empregado_responsavel_id || "");
    setGrupoEscolhido("");
    setTela({ tipo: "novo" });
  }

  // Responsável da associação que ainda pode responder (ativo e da empresa do veículo): só então o campo fica escondido e vale o dele.
  const responsavelDaAssociacaoAtivo = !!associacaoEscolhida?.responsavel && responsaveisDoVeiculo.some((x) => x.id === associacaoEscolhida.responsavel?.id);

  // Padrão do campo "Check list de": o do último check list do veículo; sem nenhum, o da área do responsável (PCM) ou Técnicos.
  const nomeDoResponsavel = (!avulsoNovo && responsavelDaAssociacaoAtivo ? associacaoEscolhida?.responsavel?.nome : empregadosAtivos.find((x) => x.id === responsavelId)?.nome) ?? "";
  const grupoPadrao: GrupoChecklist | "" = !veiculoEscolhido
    ? ""
    : (checklists.filter((c) => c.veiculoId === veiculoEscolhido.id && c.grupo).sort((a, b) => b.data.localeCompare(a.data) || b.criadoEm.localeCompare(a.criadoEm))[0]?.grupo
      ?? (grupoDeAreaPorNome()(nomeDoResponsavel) === "PCM" ? "PCM" : "Técnicos"));
  const grupoDoChecklist = grupoEscolhido || grupoPadrao;

  function iniciar(e: React.FormEvent) {
    e.preventDefault();
    if (trava.current || !veiculoEscolhido) {
      if (!veiculoEscolhido) toast.error("Selecione o veículo.");
      return;
    }
    if (!tipoEscolhido) {
      toast.error("Escolha o tipo de check list.");
      return;
    }
    // A periodicidade escolhida pode ter saído da associação (Realizar numa linha antiga): sem ela o check list não seria periódico.
    if (!avulsoNovo && !periodicidadeDoDialogo(veiculoEscolhido)) {
      toast.error("Este veículo não tem mais esse check list periódico associado. Escolha outro tipo de check list.");
      return;
    }
    // Com associação que define o responsável, o campo fica escondido e vale o dela, mesmo que a associação tenha sido criada depois de o veículo ser escolhido (pela janela ao lado).
    const idResponsavel = (!avulsoNovo && responsavelDaAssociacaoAtivo && associacaoEscolhida?.responsavel?.id) || responsavelId;
    // O responsável pré-preenchido pode ter sido desligado: o campo mostra vazio, então o envio também recusa.
    if (idResponsavel && !responsaveisDoVeiculo.some((x) => x.id === idResponsavel)) {
      toast.error("Selecione o responsável: o anterior não está mais ativo.");
      return;
    }
    trava.current = true;
    let criado: ChecklistVeiculo | undefined;
    const ok = executar(() => {
      const base = { veiculoId: veiculoEscolhido.id, veiculoRotulo: rotuloDe(veiculoEscolhido), tipoVeiculo: tipoCheckNome, grupos: gruposDoVeiculo, grupoChecklist: grupoDoChecklist || undefined };
      criado = avulsoNovo
        ? iniciarChecklistAvulso(base)
        : iniciarChecklist({
          ...base,
          periodicidade: periodicidadeDoDialogo(veiculoEscolhido),
          responsavelId: idResponsavel,
          responsavelNome: empregadosAtivos.find((x) => x.id === idResponsavel)?.nome ?? associacaoEscolhida?.responsavel?.nome ?? "",
        });
    }, avulsoNovo ? "Check list avulso iniciado" : "Check list iniciado");
    if (ok && criado) setTela({ tipo: "check", id: criado.id });
    window.setTimeout(() => { trava.current = false; }, 600);
  }

  function avaliar(c: ChecklistVeiculo, i: ItemChecklist, avaliacao: string | null, observacao = i.observacao) {
    executar(() => avaliarItem(c.id, i.id, { avaliacao, observacao }));
  }

  function concluir(c: ChecklistVeiculo) {
    setConfirmando(null);
    if (trava.current) return;
    trava.current = true;
    const nok = c.itens.filter((i) => i.avaliacao === "NOK").length;
    executar(() => concluirChecklist(c.id), nok > 0 ? `Check list concluído: ${nok} ocorrência(s) aberta(s)` : "Check list concluído");
    window.setTimeout(() => { trava.current = false; }, 800);
  }

  function gerarPdf(c: ChecklistVeiculo) {
    const v = veiculos.find((x) => x.id === c.veiculoId);
    const empresa = empresas.find((e) => e.id === v?.empresa_id)?.razao_social ?? "GEMAPE";
    abrirDocumento({
      titulo: `Check list ${c.codigo}`,
      html: montarChecklistHtml(c, empresa),
      arquivo: nomeArquivoDocumento("Check list", c.codigo, c.veiculoRotulo, c.data),
    });
  }

  function resolver(c: ChecklistVeiculo) {
    if (!resolvendo || trava.current) return;
    trava.current = true;
    window.setTimeout(() => { trava.current = false; }, 600);
    const ok = executar(() => resolverPendencia(c.id, resolvendo, capitalizarTexto(textoResolucao)), "Pendência resolvida");
    if (ok) { setResolvendo(null); setTextoResolucao(""); }
  }

  const andamento = atual?.status === "Em andamento";
  const resumo = atual ? resumoChecklist(atual) : null;
  const grupos = atual ? [...new Set(atual.itens.map((i) => i.grupo))] : [];

  return (
    <div className="space-y-5">
      {aba === "painel" && (
        <>
          {/* Os dois tipos de check list são botões azuis no canto superior direito, na linha do período; a contagem de cada um vai dentro do botão. */}
          <ChecklistResultadosPainel
            previsoes={previsoes}
            checklists={todos.filter(checklistVisivelNaLista)}
            idsDosVeiculos={idsDaEmpresa}
            hoje={hoje}
            acoes={
              <section className="flex flex-wrap justify-end gap-2" aria-label="Tipos de check list">
                <Button ref={botaoDaTela("periodicos")} type="button" onClick={() => setAba("periodicos")}>
                  <CalendarCheck className="h-4 w-4" aria-hidden="true" /> Check list periódico
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-normal">{previstosDoMes} previsto(s) neste mês</span>
                </Button>
                <Button ref={botaoDaTela("avulsos")} type="button" onClick={() => setAba("avulsos")}>
                  <ClipboardList className="h-4 w-4" aria-hidden="true" /> Check list avulso
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-normal">{avulsosDoMesAtual} neste mês</span>
                </Button>
              </section>
            }
          />
        </>
      )}

      {aba === "periodicos" && (
        <ChecklistListaPeriodica
          previsoes={previsoes}
          checklists={checklists}
          idsDosVeiculos={idsDaEmpresa}
          hoje={hoje}
          onVer={(id) => setTela({ tipo: "check", id })}
          onRealizar={(idDoVeiculo, periodicidade) => abrirNovo(veiculos.find((v) => v.id === idDoVeiculo), periodicidade)}
          onNovo={() => abrirNovo()}
          onVoltar={() => setAba("painel")}
          voltarRef={voltarRef}
        />
      )}

      {aba === "avulsos" && (
        <ChecklistListaAvulsa
          avulsos={avulsos}
          hoje={hoje}
          nomeDoVeiculo={(c) => rotuloDe(veiculos.find((v) => v.id === c.veiculoId) as VeiculoChecklist) || c.veiculoRotulo}
          onVer={(id) => setTela({ tipo: "check", id })}
          onNovo={abrirNovoAvulso}
          onVoltar={() => setAba("painel")}
          voltarRef={voltarRef}
        />
      )}

      <Dialog open={tela?.tipo === "novo"} onOpenChange={(a) => !a && setTela(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo check list</DialogTitle>
            <DialogDescription>
              {avulsoNovo
                ? "Escolha o veículo e o tipo de check list: o avulso traz só os grupos marcados como Avulso na associação do veículo, para registrar itens mais simples."
                : "Escolha o veículo e o tipo de check list: as opções são os check lists associados ao veículo em Parâmetros > Veículos > Check list."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={iniciar} className="min-w-0 space-y-4 [&_p]:break-words">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="ck_veiculo">Veículo</Label>
              <Select
                value={veiculoId}
                onValueChange={(id) => {
                  setVeiculoId(id);
                  const novoVeiculo = veiculosDoDialogo.find((v) => v.id === id);
                  // O tipo de check list escolhido só vale se o novo veículo tem essa opção.
                  setTipoEscolhido((t) => (t === "avulso" || (novoVeiculo && periodicidadesDe(novoVeiculo).includes(t as Periodicidade)) ? t : ""));
                  // O responsável definido na associação já vem preenchido.
                  setResponsavelId(associacoes.find((a) => a.veiculoId === id)?.responsavel?.id ?? novoVeiculo?.empregado_responsavel_id ?? "");
                  setGrupoEscolhido("");
                }}
              >
                <SelectTrigger id="ck_veiculo" aria-describedby="ck_veiculo_ajuda" className="min-w-0 [&>span]:min-w-0 [&>span]:truncate"><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
                <SelectContent>{veiculosDoDialogo.map((v) => <SelectItem key={v.id} value={v.id}>{rotuloDe(v)}</SelectItem>)}</SelectContent>
              </Select>
              {canWrite && <p className="text-xs text-muted-foreground">
                Veículo não está na lista?{" "}
                <button type="button" className="font-medium text-primary underline underline-offset-2" onClick={() => setVeiculosAberto(true)}>
                  Cadastrar veículo
                </button>
              </p>}
              {veiculosDoDialogo.length === 0 && (
                <p id="ck_veiculo_ajuda" className="text-xs text-muted-foreground">Nenhum veículo ativo com tipo de check list. A subcategoria do veículo é definida em Parâmetros &gt; Veículos &gt; Cadastro de Veículos.</p>
              )}
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="ck_modo">Tipo de check list</Label>
              <Select value={tipoEscolhido} onValueChange={setTipoEscolhido} disabled={!veiculoEscolhido}>
                <SelectTrigger id="ck_modo" className="min-w-0 [&>span]:min-w-0 [&>span]:truncate"><SelectValue placeholder={veiculoEscolhido ? "Selecione o tipo de check list" : "Escolha o veículo primeiro"} /></SelectTrigger>
                <SelectContent>
                  {veiculoEscolhido && periodicidadesDe(veiculoEscolhido).map((p) => (
                    <SelectItem key={p} value={p}>
                      {opcaoDoChecklist(veiculoEscolhido, p)}
                    </SelectItem>
                  ))}
                  {veiculoEscolhido && <SelectItem value="avulso">{opcaoDoChecklist(veiculoEscolhido, "avulso")}</SelectItem>}
                </SelectContent>
              </Select>
              {/* Atalho fixo para a associação de itens (decisão 322): abre a janela ao lado, sem perder o que foi preenchido, e ao fechar volta para cá. */}
              <p className="text-xs text-muted-foreground">{linkAssociar}</p>
              {veiculoEscolhido && periodicidadesDe(veiculoEscolhido).length === 0 && (
                <p className="text-xs text-muted-foreground">Este veículo não tem check list periódico associado.</p>
              )}
              {veiculoEscolhido && !tipoEscolhido && (
                <p className="text-xs text-muted-foreground">Escolha o tipo de check list para ver os itens e iniciar.</p>
              )}
              {veiculoEscolhido && tipoEscolhido && (
                <p className="text-xs text-muted-foreground">
                  {gruposDoVeiculo.length === 0
                    ? (avulsoNovo ? (associacaoEscolhida ? <>Este veículo não tem grupos Avulso na associação.</> : <>Não há itens de check list para o tipo deste veículo. {linkItens}</>) : <>Este veículo não tem itens associados.</>)
                    : `${itensDoVeiculo} ${itensDoVeiculo === 1 ? "item" : "itens"} em ${gruposDoVeiculo.length} ${gruposDoVeiculo.length === 1 ? "grupo" : "grupos"}: ${gruposDoVeiculo.map((g) => g.nome).join(", ")}.`}
                  {!avulsoNovo && pendenciasAbertas(checklists, veiculoEscolhido.id).length > 0 && ` · ${pendenciasAbertas(checklists, veiculoEscolhido.id).length} pendência(s) aberta(s) de check lists anteriores`}
                </p>
              )}
            </div>
            {veiculoEscolhido && tipoEscolhido && <div className="min-w-0 space-y-1.5">
              <Label htmlFor="ck_grupo">Check list de</Label>
              <Select value={grupoDoChecklist} onValueChange={(v) => setGrupoEscolhido(v as GrupoChecklist)}>
                <SelectTrigger id="ck_grupo" className="min-w-0 [&>span]:min-w-0 [&>span]:truncate"><SelectValue placeholder="Técnicos ou PCM" /></SelectTrigger>
                <SelectContent>{GRUPOS_CHECKLIST.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Separa os indicadores do check list dos técnicos e do PCM.</p>
            </div>}
            {!avulsoNovo && tipoEscolhido && !responsavelDaAssociacaoAtivo && <div className="min-w-0 space-y-1.5">
              <Label htmlFor="ck_resp">Responsável pelo check list</Label>
              <Select value={responsavelId} onValueChange={setResponsavelId}>
                <SelectTrigger id="ck_resp" className="min-w-0 [&>span]:min-w-0 [&>span]:truncate"><SelectValue placeholder="Selecione o responsável" /></SelectTrigger>
                <SelectContent>{responsaveisDoVeiculo.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTela(null)}>Cancelar</Button>
              <Button type="submit" disabled={!!veiculoEscolhido && gruposDoVeiculo.length === 0}>Iniciar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DialogItensChecklist aberto={itensAberto} onAbrirMudou={setItensAberto} />

      <DialogAssociarChecklist aberto={associarAberto} onAbrirMudou={setAssociarAberto} />

      <DialogCadastroVeiculos
        aberto={veiculosAberto}
        onAbrirMudou={(aberto) => {
          setVeiculosAberto(aberto);
          // O veículo escolhido pode ter sido excluído ou mudado de tipo na janela: sem ele na lista, a escolha é limpa e o usuário é avisado.
          if (!aberto && veiculoId && !veiculoEscolhido) {
            setVeiculoId("");
            toast.info("O veículo escolhido não está mais disponível para este tipo. Escolha outro.");
          }
        }}
      />

      <Dialog
        open={!!atual}
        onOpenChange={(a) => {
          // Tira o foco antes de fechar para gravar a observação que estava sendo digitada.
          if (!a) { (document.activeElement as HTMLElement | null)?.blur(); setTela(null); }
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
          {atual && resumo && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  {atual.codigo} <Badge variant={andamento ? "outline" : "secondary"}>{atual.status}</Badge>
                  <span className="text-sm font-normal text-muted-foreground">{nomeDe(atual)}</span>
                </DialogTitle>
                <DialogDescription>
                  {atual.veiculoRotulo} · {atual.tipoVeiculo || "sem tipo"} · {checklistVisivelNaLista(atual) ? `${atual.periodicidade} · ${formatarData(atual.data)} · responsável: ${atual.responsavelNome}` : `avulso · ${formatarData(atual.data)}`}
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
                            <Button
                              key={a} type="button" size="sm" disabled={!andamento}
                              variant={i.avaliacao === a ? "default" : "outline"}
                              className={i.avaliacao === a ? COR_AVALIACAO[a] : ""}
                              aria-pressed={i.avaliacao === a}
                              onClick={() => avaliar(atual, i, i.avaliacao === a ? null : a)}
                            >
                              {a}
                            </Button>
                          ))}
                        </div>
                      </div>
                      {andamento ? (
                        <Input
                          capitalizar="texto"
                          aria-label={`Observação de ${i.nome}`}
                          placeholder={i.avaliacao === "NOK" ? "Descreva o problema (obrigatório)" : "Observação (opcional)"}
                          maxLength={500}
                          defaultValue={i.observacao}
                          onBlur={(e) => { if (e.target.value.trim() !== i.observacao) avaliar(atual, i, i.avaliacao, capitalizarTexto(e.target.value)); }}
                        />
                      ) : (
                        i.observacao && <p className="text-xs text-muted-foreground">Observação: {i.observacao}</p>
                      )}
                      {(andamento || i.fotos.length > 0) && (
                        <div className="flex flex-wrap items-center gap-2">
                          {andamento && (
                            <BotaoAnexarFotos
                              quantidadeAtual={i.fotos.length} maximo={MAX_FOTOS_ITEM} oQue="item"
                              onFotos={(f) => executar(() => adicionarFotosItem(atual.id, i.id, f), "Fotos anexadas")}
                            />
                          )}
                          <GaleriaFotos
                            fotos={i.fotos}
                            onAmpliar={(n) => setVisor({ foto: i.fotos[n] ?? "", titulo: `${i.nome} (${atual.codigo})` })}
                            onRemover={andamento ? (n) => { executar(() => removerFotoItem(atual.id, i.id, n), "Foto removida"); } : undefined}
                          />
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
                ? `Os ${resumo.nok} item(ns) NOK vão gerar ${resumo.nok} ocorrência(s) aberta(s) e ficar como pendência. Depois de concluído, as avaliações não podem mais ser alteradas.`
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
            <AlertDialogAction onClick={() => { const id = atual?.id; setConfirmando(null); if (id && executar(() => excluirChecklistEmAndamento(id), "Check list descartado")) setTela(null); }}>Descartar</AlertDialogAction>
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
