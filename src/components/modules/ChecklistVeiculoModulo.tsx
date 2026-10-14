import { useEffect, useRef, useState } from "react";
import { gruposAvulsosDaAssociacao, gruposDaPeriodicidade } from "@/lib/checklist-associacao-veiculo";
import { capitalizarTexto } from "@/lib/formatacao-cadastral";
import { toast } from "sonner";

import { BotaoAnexarFotos, GaleriaFotos, VisorFoto } from "@/components/modules/FotosOcorrencia";
import { DialogItensChecklist } from "@/components/modules/DialogItensChecklist";
import { DialogAssociarChecklist } from "@/components/modules/DialogAssociarChecklist";
import { DialogCadastroVeiculos } from "@/components/modules/DialogCadastroVeiculos";
import { ChecklistPainelMensal } from "@/components/modules/ChecklistPainelMensal";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAccess } from "@/lib/access-context";
import {
  adicionarFotosItem, AVALIACOES, avaliarItem, concluirChecklist, ehPeriodicidade, excluirChecklistEmAndamento,
  hojeBrasilia, iniciarChecklist, MAX_FOTOS_ITEM, pendenciaAberta, pendenciasAbertas, removerFotoItem,
  PERIODICIDADES, periodicidadeObrigatoria, periodicidadesDaAssociacao, checklistVisivelNaLista, nomeDoChecklist, gruposAssociadosDoVeiculo, gruposAplicaveis, iniciarChecklistAvulso, veiculosDoTipoChecklist, TIPOS_CHECKLIST, tipoChecklistDaSubcategoria, ehTipoChecklist, resolverPendencia, resumoChecklist, situacaoPeriodica, type ChecklistVeiculo, type ItemChecklist, type Periodicidade, type SituacaoPeriodica,
} from "@/lib/checklist-veiculo";
import { sincronizarPrevisoes, type VeiculoPrevisto } from "@/lib/checklist-painel";
import { montarChecklistHtml } from "@/lib/checklist-veiculo-html";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { formatarData } from "@/lib/gemape";
import { useEmpregados, useVeiculos, type Veiculo } from "@/lib/hooks-gemape";
import { combinaBusca } from "@/lib/parametros-base";
import { resolverSubcategoria } from "@/lib/subcategoria-referencia";
import { useAssociacoesChecklist, useChecklistsVeiculo, usePrevisoesChecklist } from "@/lib/use-registros-veiculo";
import { executar, useParametrosBase } from "@/lib/use-parametros-base";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";

type VeiculoChecklist = Veiculo;

const dataHoraBrasilia = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

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
  const [visao, setVisao] = useState<"periodicos" | "avulsos">("periodicos");
  const [busca, setBusca] = useState("");
  const [soPendencias, setSoPendencias] = useState(false);
  // Novo check list (decisão 157): primeiro o veículo, depois o tipo de check list, uma das opções "Placa >> Periodicidade >> Responsável"
  // da associação do veículo ou Avulso. Guarda a periodicidade escolhida, "avulso" ou vazio (ainda sem escolha).
  const [tipoEscolhido, setTipoEscolhido] = useState("");
  const [veiculoId, setVeiculoId] = useState("");
  const [veiculosAberto, setVeiculosAberto] = useState(false);
  const [associarAberto, setAssociarAberto] = useState(false);
  const [itensAberto, setItensAberto] = useState(false);
  const [responsavelId, setResponsavelId] = useState("");
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
  const pendencias = pendenciasAbertas(checklists);
  // Nome do check list (decisão 90): Placa >> Periodicidade >> Responsável.
  const nomeDe = (c: ChecklistVeiculo) =>
    nomeDoChecklist({ placa: veiculos.find((v) => v.id === c.veiculoId)?.placa ?? "", fallbackVeiculo: c.veiculoRotulo, periodicidade: c.periodicidade, responsavelNome: c.responsavelNome });
  // A lista do módulo só traz o que tem periodicidade ou responsável; o livre (sem os dois) não aparece (decisão 116).
  const naLista = checklists.filter(checklistVisivelNaLista);
  // O avulso (decisão 90) não tem periodicidade nem responsável: fica numa lista à parte e não entra no painel do mês nem na situação por veículo.
  const avulsos = checklists.filter((c) => !checklistVisivelNaLista(c));
  const avulsoNovo = tela?.tipo === "novo" && tipoEscolhido === "avulso";
  const atual = tela?.tipo === "check" ? (todos.find((c) => c.id === tela.id) ?? null) : null;
  // No avulso não há campo de tipo de veículo (decisão 118): entram todos os veículos ativos que têm tipo de check list, e o tipo vem do veículo.
  const veiculosDoDialogo = veiculos.filter((v) => v.status === "Ativo" && tipoCheckDe(v) !== null);
  const veiculoEscolhido = veiculosDoDialogo.find((v) => v.id === veiculoId);
  const tipoCheckNome = TIPOS_CHECKLIST.find((t) => t.id === (veiculoEscolhido ? tipoCheckDe(veiculoEscolhido) : null))?.nome ?? "";
  // Opção do tipo de check list, na ordem pedida pelo responsável (decisão 157): Placa >> Responsável >> Periodicidade.
  const opcaoDoChecklist = (v: VeiculoChecklist, periodicidade: string, responsavelNome: string) =>
    [(v.placa ?? "").trim().toUpperCase() || rotuloDe(v), responsavelNome.trim() || "Não definido", periodicidade].map((t) => t.trim().replace(/\s+/g, " ")).join(" >> ");
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
  const comoAssociacao = (itens: { grupoId: string }[]) => gruposAssociadosDoVeiculo({ itens } as never, parametros.itensChecklistVeiculo);
  const gruposDoVeiculo = !veiculoEscolhido
    ? []
    : avulsoNovo
      ? (!associacaoEscolhida
        ? gruposAplicaveis(parametros.itensChecklistVeiculo, tipoDe(veiculoEscolhido)?.id ?? null, true)
        : comoAssociacao(gruposAvulsosDaAssociacao(associacaoEscolhida)))
      : comoAssociacao(gruposDaPeriodicidade(associacaoEscolhida, periodicidadeDoDialogo(veiculoEscolhido) ?? ""));
  const itensDoVeiculo = gruposDoVeiculo.reduce((t, g) => t + g.itens.length, 0);

  const lista = (visao === "avulsos" ? avulsos : naLista)
    .filter((c) => !soPendencias || pendenciaDoChecklist(c) > 0)
    .filter((c) => combinaBusca(busca, c.codigo, nomeDe(c), c.veiculoRotulo, c.responsavelNome, c.tipoVeiculo, c.status, formatarData(c.data)))
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));

  function pendenciaDoChecklist(c: ChecklistVeiculo) {
    return c.itens.filter(pendenciaAberta).length;
  }

  function abrirNovoAvulso() {
    setTipoEscolhido("avulso");
    setVeiculoId("");
    setResponsavelId("");
    setTela({ tipo: "novo", avulso: true });
  }

  function abrirNovo(v?: VeiculoChecklist, periodicidade?: string) {
    setTipoEscolhido(periodicidade ?? (v ? periodicidadeDe(v) ?? "" : ""));
    setVeiculoId(v && tipoCheckDe(v) ? v.id : "");
    setResponsavelId((v && associacaoDe(v)?.responsavel?.id) || v?.empregado_responsavel_id || "");
    setTela({ tipo: "novo" });
  }

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
    // O responsável pré-preenchido pode ter sido desligado: o campo mostra vazio, então o envio também recusa.
    if (responsavelId && !empregadosAtivos.some((x) => x.id === responsavelId)) {
      toast.error("Selecione o responsável: o anterior não está mais ativo.");
      return;
    }
    trava.current = true;
    let criado: ChecklistVeiculo | undefined;
    const ok = executar(() => {
      const base = { veiculoId: veiculoEscolhido.id, veiculoRotulo: rotuloDe(veiculoEscolhido), tipoVeiculo: tipoCheckNome, grupos: gruposDoVeiculo };
      criado = avulsoNovo
        ? iniciarChecklistAvulso(base)
        : iniciarChecklist({
          ...base,
          periodicidade: periodicidadeDoDialogo(veiculoEscolhido),
          responsavelId,
          responsavelNome: empregadosAtivos.find((x) => x.id === responsavelId)?.nome ?? "",
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
      <ChecklistPainelMensal
        previsoes={previsoes}
        checklists={todos.filter(checklistVisivelNaLista)}
        idsDosVeiculos={idsDaEmpresa}
        hoje={hoje}
        onAbrirChecklist={(id) => setTela({ tipo: "check", id })}
      />

      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold">Situação por veículo</h2>
          <p className="text-xs text-muted-foreground">{pendencias.length} pendência(s) NOK aberta(s).</p>
          <Button requiresWrite="operar" className="ml-auto" onClick={() => abrirNovo()}>Novo check list</Button>
        </div>
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Veículo</TableHead><TableHead>Tipo</TableHead><TableHead>Periodicidade</TableHead>
                <TableHead>Situação</TableHead><TableHead className="text-right">Pendências</TableHead><TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {veiculos.length === 0 && <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">Nenhum veículo cadastrado.</TableCell></TableRow>}
              {veiculos.flatMap((v) => {
                // Uma linha por periodicidade do veículo (decisão 123); sem associação, uma linha só.
                const periodicidades: (Periodicidade | null)[] = periodicidadesDe(v).length > 0 ? periodicidadesDe(v) : [null];
                return periodicidades.map((per) => {
                  const doVeiculo = naLista.filter((c) => c.veiculoId === v.id && (per === null || c.periodicidade === per));
                  const sit = per ? situacaoPeriodica(per, doVeiculo, hoje) : null;
                  const aberto = doVeiculo.find((c) => c.status === "Em andamento");
                  return (
                    <TableRow key={`${v.id}-${per ?? "sem"}`}>
                      <TableCell>{rotuloDe(v)}</TableCell>
                      <TableCell>{tipoDe(v)?.nome ?? "—"}</TableCell>
                      <TableCell>{per ?? "—"}</TableCell>
                      <TableCell>{sit ? <Badge variant="outline" className={SITUACAO[sit].classe}>{SITUACAO[sit].rotulo}</Badge> : <span className="text-xs text-muted-foreground">Sem associação</span>}</TableCell>
                      <TableCell className="text-right">{pendenciasAbertas(checklists, v.id).filter((p) => per === null || p.checklist.periodicidade === per).length}</TableCell>
                      <TableCell className="text-right">
                        {aberto ? (
                          <Button requiresWrite="operar" variant="ghost" size="sm" onClick={() => setTela({ tipo: "check", id: aberto.id })}>Continuar</Button>
                        ) : (
                          <Button requiresWrite="operar" variant="ghost" size="sm" disabled={!per || v.status !== "Ativo" || !tipoCheckDe(v)} onClick={() => abrirNovo(v, per ?? undefined)}>Iniciar</Button>
                        )}
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
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold">Check lists</h2>
          <div className="flex gap-1" role="group" aria-label="Tipo de check list">
            <Button size="sm" variant={visao === "periodicos" ? "default" : "outline"} aria-pressed={visao === "periodicos"} onClick={() => setVisao("periodicos")}>Periódicos ({naLista.length})</Button>
            <Button size="sm" variant={visao === "avulsos" ? "default" : "outline"} aria-pressed={visao === "avulsos"} onClick={() => setVisao("avulsos")}>Avulsos ({avulsos.length})</Button>
          </div>
          {visao === "avulsos" && <Button requiresWrite="operar" size="sm" onClick={abrirNovoAvulso}>Novo check list avulso</Button>}
          <Input aria-label="Buscar check list" placeholder="Buscar por código, veículo ou responsável" className="max-w-xs" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <Button variant={soPendencias ? "default" : "outline"} size="sm" onClick={() => setSoPendencias((v) => !v)}>
            Com pendências abertas ({(visao === "avulsos" ? avulsos : naLista).filter((c) => pendenciaDoChecklist(c) > 0).length})
          </Button>
        </div>
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead><TableHead>Check list</TableHead><TableHead>Data</TableHead>
                <TableHead>Avaliação</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Pendências</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">{busca.trim() || soPendencias ? "Nenhum resultado para o filtro." : visao === "avulsos" ? "Nenhum check list avulso feito ainda." : "Nenhum check list feito ainda."}</TableCell></TableRow>
              )}
              {lista.map((c) => {
                const r = resumoChecklist(c);
                return (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => setTela({ tipo: "check", id: c.id })}>
                    <TableCell className="font-mono text-xs">{c.codigo}</TableCell>
                    <TableCell className="whitespace-nowrap font-medium">{nomeDe(c)}</TableCell>
                    <TableCell>{formatarData(c.data)}</TableCell>
                    <TableCell className="text-xs">{r.avaliados}/{r.total} · {r.ok} OK · {r.nok} NOK · {r.na} N.A.</TableCell>
                    <TableCell><Badge variant={c.status === "Concluído" ? "secondary" : "outline"}>{c.status}</Badge></TableCell>
                    <TableCell className="text-right">{r.pendenciasAbertas > 0 ? <span className="font-semibold text-red-700 dark:text-red-300">{r.pendenciasAbertas}</span> : 0}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

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
                      {opcaoDoChecklist(veiculoEscolhido, p, associacaoEscolhida?.responsavel?.nome ?? "")}
                    </SelectItem>
                  ))}
                  {veiculoEscolhido && <SelectItem value="avulso">{`${(veiculoEscolhido.placa ?? "").trim().toUpperCase() || rotuloDe(veiculoEscolhido)} >> Avulso`}</SelectItem>}
                </SelectContent>
              </Select>
              {veiculoEscolhido && periodicidadesDe(veiculoEscolhido).length === 0 && (
                <p className="text-xs text-muted-foreground">Este veículo não tem check list periódico associado. {linkAssociar}</p>
              )}
              {veiculoEscolhido && !tipoEscolhido && (
                <p className="text-xs text-muted-foreground">Escolha o tipo de check list para ver os itens e iniciar.</p>
              )}
              {veiculoEscolhido && tipoEscolhido && (
                <p className="text-xs text-muted-foreground">
                  {gruposDoVeiculo.length === 0
                    ? (avulsoNovo ? (associacaoEscolhida ? <>Este veículo não tem grupos Avulso na associação. {linkAssociar}</> : <>Não há itens de check list para o tipo deste veículo. {linkItens}</>) : <>Este veículo não tem itens associados. {linkAssociar}</>)
                    : `${itensDoVeiculo} ${itensDoVeiculo === 1 ? "item" : "itens"} em ${gruposDoVeiculo.length} ${gruposDoVeiculo.length === 1 ? "grupo" : "grupos"}: ${gruposDoVeiculo.map((g) => g.nome).join(", ")}.`}
                  {!avulsoNovo && pendenciasAbertas(checklists, veiculoEscolhido.id).length > 0 && ` · ${pendenciasAbertas(checklists, veiculoEscolhido.id).length} pendência(s) aberta(s) de check lists anteriores`}
                </p>
              )}
            </div>
            {!avulsoNovo && tipoEscolhido && !associacaoEscolhida?.responsavel && <div className="min-w-0 space-y-1.5">
              <Label htmlFor="ck_resp">Responsável pelo check list</Label>
              <Select value={responsavelId} onValueChange={setResponsavelId}>
                <SelectTrigger id="ck_resp" className="min-w-0 [&>span]:min-w-0 [&>span]:truncate"><SelectValue placeholder="Selecione o responsável" /></SelectTrigger>
                <SelectContent>{empregadosAtivos.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
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
                    <Button type="button" variant="outline" className="text-destructive" onClick={() => setConfirmando("descartar")}>Descartar</Button>
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
