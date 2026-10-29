import { useRef, useState } from "react";

import { capitalizarTexto } from "@/lib/formatacao-cadastral";
import { BotaoAnexarFotos, GaleriaFotos, VisorFoto } from "@/components/modules/FotosOcorrencia";
import { CartoesOcorrencias } from "@/components/modules/CartoesOcorrencias";
import { GraficosOcorrencias } from "@/components/modules/GraficosVeiculos";
import { RenovarPrazoOcorrencia } from "@/components/modules/RenovarPrazoOcorrencia";
import { rotuloDoVeiculo } from "@/components/modules/rotulo-veiculo";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAccess } from "@/lib/access-context";
import { horaBrasilia, hojeLocal } from "@/lib/empregados";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { formatarData } from "@/lib/gemape";
import { soEmpregadosDeVeiculos } from "@/lib/empregados-veiculos";
import { useEmpregados, useEmpresas, useVeiculos } from "@/lib/hooks-gemape";
import { indicadoresDeOcorrencias } from "@/lib/ocorrencias-indicadores";
import { lerPrazosOcorrencias, lerProrrogacaoOcorrencias } from "@/lib/prazo-ocorrencias";
import { montarOcorrenciaHtml } from "@/lib/ocorrencia-relatorio-html";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";
import {
  adicionarFotosOcorrencia, contarPorStatus, registrarOcorrenciaVeiculo, removerFotoOcorrencia, salvarTratativa,
  type OcorrenciaVeiculo, type StatusOcorrencia,
} from "@/lib/ocorrencias-veiculo";
import { combinaBusca } from "@/lib/parametros-base";
import { useOcorrenciasVeiculo } from "@/lib/use-registros-veiculo";
import { executar, useParametrosBase } from "@/lib/use-parametros-base";

const reais = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const horaAgora = () => horaBrasilia();
const dataHoraLocal = (ocorridoEm: string) => `${formatarData(ocorridoEm.slice(0, 10))} ${ocorridoEm.slice(11, 16)}`;
const dataHoraBrasilia = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

// Cores dos status: aberta em vermelho, em tratativa em amarelo, encerrada em verde.
const COR_STATUS: Record<StatusOcorrencia, string> = {
  Aberta: "border-red-300 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200",
  "Em tratativa": "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
  Encerrada: "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
};
const StatusBadge = ({ status }: { status: StatusOcorrencia }) => (
  <Badge variant="outline" className={COR_STATUS[status]}>{status}</Badge>
);

// Botões da lista (decisão 321): cada um mostra as ocorrências da situação; Todas mostra tudo.
const BOTOES_FILTRO: { filtro: StatusOcorrencia | "todas"; rotulo: string }[] = [
  { filtro: "todas", rotulo: "Todas" }, { filtro: "Aberta", rotulo: "Abertas" }, { filtro: "Em tratativa", rotulo: "Em tratativa" }, { filtro: "Encerrada", rotulo: "Encerradas" },
];

type Tela = { tipo: "nova" } | { tipo: "detalhe" | "tratativa"; id: string } | null;

// Módulos > Veículos > Ocorrências (decisão 60): lista com status colorido, nova ocorrência com
// código automático, detalhe com fotos e tratativa feita por quem tem permissão de gravar.
// Só modo demonstração; nada no Supabase.
export function OcorrenciasVeiculoModulo() {
  const { empresaId } = useEmpresa();
  const { isAdmin, canWrite } = useAccess();
  const parametros = useParametrosBase();
  const { data: veiculos = [] } = useVeiculos(empresaId);
  const { data: empregadosAtivosTodos = [] } = useEmpregados(TODAS, true);
  // Só quem foi escolhido em Parâmetros > Veículos > Parâmetros Específicos (lista vazia = todos).
  const empregadosAtivos = soEmpregadosDeVeiculos(empregadosAtivosTodos);
  const { data: todosEmpregados = [] } = useEmpregados(TODAS);
  const todas = useOcorrenciasVeiculo();
  const [tela, setTela] = useState<Tela>(null);
  const [filtro, setFiltro] = useState<StatusOcorrencia | "todas">("todas");
  const [busca, setBusca] = useState("");
  const [visor, setVisor] = useState<{ foto: string; titulo: string } | null>(null);
  const [confirmandoEncerrar, setConfirmandoEncerrar] = useState(false);
  // Renovar o prazo da tratativa (supervisor valida) e o convite para gerar o PDF logo depois de encerrar (decisão 309): guardam o id da ocorrência.
  const [renovando, setRenovando] = useState<string | null>(null);
  const [relatorioPara, setRelatorioPara] = useState<string | null>(null);
  const { data: empresas = [] } = useEmpresas();
  const trava = useRef(false);

  // Formulário de nova ocorrência
  const [veiculoId, setVeiculoId] = useState("");
  const [tipoId, setTipoId] = useState("");
  const [condutorId, setCondutorId] = useState("");
  const [danoEmpresa, setDanoEmpresa] = useState(false);
  const [danoTerceiros, setDanoTerceiros] = useState(false);
  const [fotosNovas, setFotosNovas] = useState<string[]>([]);
  // Formulário de tratativa
  const [responsavelId, setResponsavelId] = useState("");
  const [seguradora, setSeguradora] = useState("");
  const formTratativa = useRef<HTMLFormElement>(null);

  const idsDaEmpresa = new Set(veiculos.map((v) => v.id));
  const daEmpresa = todas.filter((o) => idsDaEmpresa.has(o.veiculoId));
  const nomeEmpregado = (id: string | null | undefined) => todosEmpregados.find((e) => e.id === id)?.nome ?? "—";
  const veiculo = (id: string) => veiculos.find((v) => v.id === id);
  const rotuloVeiculo = (id: string) => { const v = veiculo(id); return v ? rotuloDoVeiculo(parametros, v) : "—"; };
  const contagem = contarPorStatus(daEmpresa);
  const indicadores = indicadoresDeOcorrencias({ ocorrencias: daEmpresa, hoje: hojeLocal(), prazos: lerPrazosOcorrencias() });
  const lista = daEmpresa
    .filter((o) => filtro === "todas" || o.status === filtro)
    .filter((o) => combinaBusca(busca, o.codigo, rotuloVeiculo(o.veiculoId), o.tipoNome, nomeEmpregado(o.condutorId), o.local, o.descricao, o.status, dataHoraLocal(o.ocorridoEm)))
    .sort((a, b) => b.cadastradaEm.localeCompare(a.cadastradaEm));
  const atual = tela && tela.tipo !== "nova" ? (todas.find((o) => o.id === tela.id) ?? null) : null;
  const podeTratar = (o: OcorrenciaVeiculo) => canWrite && (o.status !== "Encerrada" || isAdmin);

  function abrirNova() {
    setVeiculoId(""); setTipoId(""); setCondutorId("");
    setDanoEmpresa(false); setDanoTerceiros(false); setFotosNovas([]);
    setTela({ tipo: "nova" });
  }

  function abrirTratativa(o: OcorrenciaVeiculo) {
    setResponsavelId(o.tratativa?.responsavelId ?? "");
    setSeguradora(o.tratativa ? (o.tratativa.seguradora ? "sim" : "nao") : "");
    setTela({ tipo: "tratativa", id: o.id });
  }

  // Depois de gravar, a trava fica um instante: o diálogo ainda está na tela durante a animação
  // de saída e um segundo clique não pode gravar de novo.
  function soltarTrava(gravou: boolean) {
    if (gravou) window.setTimeout(() => { trava.current = false; }, 800);
    else trava.current = false;
  }

  function salvarNova(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (trava.current) return;
    const f = new FormData(e.currentTarget);
    trava.current = true;
    const ok = executar(
      () => registrarOcorrenciaVeiculo(
        {
          veiculoId, tipoId, condutorId, danoEmpresa, danoTerceiros, fotos: fotosNovas,
          data: String(f.get("data") ?? ""), hora: String(f.get("hora") ?? ""),
          local: capitalizarTexto(String(f.get("local") ?? "")), descricao: capitalizarTexto(String(f.get("descricao") ?? "")),
        },
        undefined, new Date(), parametros.tiposOcorrenciaVeiculo,
      ),
      "Ocorrência registrada como Aberta",
    );
    soltarTrava(ok);
    if (ok) setTela(null);
  }

  function gravarTratativa(encerrar: boolean) {
    if (!atual || !formTratativa.current || trava.current) return;
    const f = new FormData(formTratativa.current);
    trava.current = true;
    const ok = executar(
      () => salvarTratativa(
        atual.id,
        {
          responsavelId, seguradora,
          descricaoEmpresa: capitalizarTexto(String(f.get("descricaoEmpresa") ?? "")), descricaoTerceiros: capitalizarTexto(String(f.get("descricaoTerceiros") ?? "")),
          custoEmpresa: String(f.get("custoEmpresa") ?? ""), pagamentoTerceiros: capitalizarTexto(String(f.get("pagamentoTerceiros") ?? "")),
        },
        { encerrar, isAdmin },
      ),
      encerrar ? "Tratativa encerrada" : "Tratativa salva",
    );
    soltarTrava(ok);
    setConfirmandoEncerrar(false);
    if (ok) {
      setTela(null);
      if (encerrar) setRelatorioPara(atual.id);
    }
  }

  // Relatório em PDF da ocorrência (no visualizador do sistema, em tela cheia): dados, tratativa e renovações de prazo.
  function gerarRelatorio(o: OcorrenciaVeiculo) {
    const t = o.tratativa;
    const v = veiculo(o.veiculoId);
    abrirDocumento({
      titulo: `Relatório da ocorrência ${o.codigo}`,
      html: montarOcorrenciaHtml({
        codigo: o.codigo,
        empresa: empresas.find((e) => e.id === v?.empresa_id)?.nome_fantasia ?? "",
        veiculo: rotuloVeiculo(o.veiculoId),
        tipo: o.tipoNome,
        status: o.status,
        cadastradaEm: dataHoraBrasilia(o.cadastradaEm),
        ocorridoEm: dataHoraLocal(o.ocorridoEm),
        local: o.local,
        condutor: nomeEmpregado(o.condutorId),
        danos: [o.danoEmpresa && "Veículo da empresa", o.danoTerceiros && "Veículo de terceiros"].filter(Boolean).join(" e ") || "Sem danos informados",
        descricao: o.descricao,
        fotos: o.fotos.length,
        tratativa: t ? {
          registradaEm: dataHoraBrasilia(t.registradaEm), atualizadaEm: dataHoraBrasilia(t.atualizadaEm), encerradaEm: o.encerradaEm ? dataHoraBrasilia(o.encerradaEm) : null,
          responsavel: nomeEmpregado(t.responsavelId), custoEmpresa: reais(t.custoEmpresa), descricaoEmpresa: t.descricaoEmpresa, descricaoTerceiros: t.descricaoTerceiros,
          pagamentoTerceiros: t.pagamentoTerceiros, seguradora: t.seguradora ? "Sim" : "Não",
        } : null,
        renovacoes: (o.renovacoes ?? []).map((r) => ({ em: dataHoraBrasilia(r.em), passo: r.passo === "iniciar" ? "Iniciar a tratativa" : "Finalizar a tratativa", ate: formatarData(r.ate), autorizadoPor: r.autorizadoPorNome, registradoPor: r.registradoPorNome })),
      }),
      arquivo: nomeArquivoDocumento("Ocorrencia", o.codigo, rotuloVeiculo(o.veiculoId)),
      telaCheia: true,
    });
  }

  function anexarFotos(fotos: string[]) {
    if (!atual) return;
    executar(() => adicionarFotosOcorrencia(atual.id, fotos, { isAdmin }), "Fotos anexadas");
  }

  const tipoAtual = atual?.tratativa;
  const bloqueadoParaEditar = !canWrite || (!!atual && atual.status === "Encerrada" && !isAdmin);

  return (
    <div className="space-y-4">
      <CartoesOcorrencias indicadores={indicadores} />
      <GraficosOcorrencias ocorrencias={daEmpresa} hoje={hojeLocal()} />
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Buscar ocorrência"
          placeholder="Buscar por código, veículo, tipo ou condutor"
          className="max-w-xs"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Ocorrências por situação">
          {BOTOES_FILTRO.map(({ filtro: f, rotulo }) => (
            <Button key={f} type="button" size="sm" variant={filtro === f ? "default" : "outline"} aria-pressed={filtro === f} onClick={() => setFiltro(f)}>
              {rotulo} ({f === "todas" ? daEmpresa.length : contagem[f]})
            </Button>
          ))}
        </div>
        <Button requiresWrite="operar" className="ml-auto" onClick={abrirNova}>Nova ocorrência</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Ocorrido em</TableHead>
              <TableHead>Veículo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Condutor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                  {busca.trim() || filtro !== "todas" ? "Nenhum resultado para a busca." : "Nenhuma ocorrência registrada."}
                </TableCell>
              </TableRow>
            )}
            {lista.map((o) => (
              <TableRow key={o.id} className="cursor-pointer" onClick={() => setTela({ tipo: "detalhe", id: o.id })}>
                <TableCell className="font-mono text-xs">{o.codigo}</TableCell>
                <TableCell>{dataHoraLocal(o.ocorridoEm)}</TableCell>
                <TableCell>{rotuloVeiculo(o.veiculoId)}</TableCell>
                <TableCell>{o.tipoNome}</TableCell>
                <TableCell>{nomeEmpregado(o.condutorId)}</TableCell>
                <TableCell><StatusBadge status={o.status} /></TableCell>
                <TableCell className="text-right">
                  {podeTratar(o) && (
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); abrirTratativa(o); }}>
                      {o.status === "Encerrada" ? "Editar tratativa" : "Tratativa"}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Nova ocorrência */}
      <Dialog open={tela?.tipo === "nova"} onOpenChange={(a) => !a && setTela(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova ocorrência</DialogTitle>
            <DialogDescription>O código e a data e hora do cadastro são gerados ao salvar. A ocorrência entra na lista como Aberta.</DialogDescription>
          </DialogHeader>
          <form onSubmit={salvarNova} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="oc_veiculo">Veículo</Label>
              <Select value={veiculoId} onValueChange={setVeiculoId}>
                <SelectTrigger id="oc_veiculo"><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
                <SelectContent>{veiculos.map((v) => <SelectItem key={v.id} value={v.id}>{rotuloDoVeiculo(parametros, v)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="oc_tipo">Tipo de ocorrência</Label>
              <Select value={tipoId} onValueChange={setTipoId}>
                <SelectTrigger id="oc_tipo"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>{parametros.tiposOcorrenciaVeiculo.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
              </Select>
              {parametros.tiposOcorrenciaVeiculo.length === 0 && (
                <p className="text-xs text-muted-foreground">Cadastre os tipos em Parâmetros &gt; Veículos &gt; Tipos de ocorrência.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="oc_data">Data do ocorrido</Label>
              <Input id="oc_data" name="data" type="date" defaultValue={hojeLocal()} max={hojeLocal()} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="oc_hora">Hora do ocorrido</Label>
              <Input id="oc_hora" name="hora" type="time" defaultValue={horaAgora()} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="oc_local">Local da ocorrência</Label>
              <Input id="oc_local" capitalizar="texto" name="local" maxLength={200} placeholder="Ex.: BR-116, km 40" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="oc_condutor">Condutor</Label>
              <Select value={condutorId} onValueChange={setCondutorId}>
                <SelectTrigger id="oc_condutor"><SelectValue placeholder="Selecione o condutor" /></SelectTrigger>
                <SelectContent>{empregadosAtivos.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <fieldset className="space-y-2 sm:col-span-2">
              <legend className="text-sm font-medium">Danos</legend>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={danoEmpresa} onCheckedChange={(v) => setDanoEmpresa(v === true)} />
                  Veículo da empresa
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={danoTerceiros} onCheckedChange={(v) => setDanoTerceiros(v === true)} />
                  Veículo de terceiros
                </label>
              </div>
            </fieldset>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="oc_descricao">Descrição</Label>
              <Textarea id="oc_descricao" capitalizar="texto" name="descricao" rows={3} maxLength={2000} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <div className="flex flex-wrap items-center gap-2">
                <BotaoAnexarFotos quantidadeAtual={fotosNovas.length} onFotos={(f) => setFotosNovas((a) => [...a, ...f])} />
              </div>
              <GaleriaFotos
                fotos={fotosNovas}
                onAmpliar={(i) => setVisor({ foto: fotosNovas[i]!, titulo: `Foto ${i + 1}` })}
                onRemover={(i) => setFotosNovas((a) => a.filter((_, j) => j !== i))}
              />
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setTela(null)}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dados da ocorrência até agora */}
      <Dialog open={tela?.tipo === "detalhe" && !!atual} onOpenChange={(a) => !a && setTela(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {atual && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">{atual.codigo} <StatusBadge status={atual.status} /></DialogTitle>
                <DialogDescription>Cadastrada em {dataHoraBrasilia(atual.cadastradaEm)}.</DialogDescription>
              </DialogHeader>
              <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                <div><dt className="text-xs text-muted-foreground">Veículo</dt><dd>{rotuloVeiculo(atual.veiculoId)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Tipo</dt><dd>{atual.tipoNome}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Ocorrido em</dt><dd>{dataHoraLocal(atual.ocorridoEm)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Local</dt><dd>{atual.local}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Condutor</dt><dd>{nomeEmpregado(atual.condutorId)}</dd></div>
                <div>
                  <dt className="text-xs text-muted-foreground">Danos</dt>
                  <dd>{[atual.danoEmpresa && "Veículo da empresa", atual.danoTerceiros && "Veículo de terceiros"].filter(Boolean).join(" e ") || "Sem danos informados"}</dd>
                </div>
                <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Descrição</dt><dd className="whitespace-pre-wrap">{atual.descricao}</dd></div>
              </dl>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold">Fotos</h3>
                  <BotaoAnexarFotos quantidadeAtual={atual.fotos.length} onFotos={anexarFotos} desabilitado={bloqueadoParaEditar} />
                </div>
                {atual.fotos.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma foto anexada.</p>}
                <GaleriaFotos
                  fotos={atual.fotos}
                  onAmpliar={(i) => setVisor({ foto: atual.fotos[i]!, titulo: `${atual.codigo} · foto ${i + 1}` })}
                  onRemover={bloqueadoParaEditar ? undefined : (i) => {
                    executar(() => removerFotoOcorrencia(atual.id, i, { isAdmin }), "Foto removida");
                  }}
                />
              </div>
              <section className="space-y-2 rounded-lg border p-3">
                <h3 className="text-sm font-semibold">Tratativa</h3>
                {!tipoAtual ? (
                  <p className="text-sm text-muted-foreground">Ainda sem tratativa registrada.</p>
                ) : (
                  <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                    <div><dt className="text-xs text-muted-foreground">Registrada em</dt><dd>{dataHoraBrasilia(tipoAtual.registradaEm)}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Última atualização</dt><dd>{dataHoraBrasilia(tipoAtual.atualizadaEm)}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Responsável</dt><dd>{nomeEmpregado(tipoAtual.responsavelId)}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Custo para a empresa</dt><dd>{reais(tipoAtual.custoEmpresa)}</dd></div>
                    {tipoAtual.descricaoEmpresa && <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Veículo da empresa</dt><dd className="whitespace-pre-wrap">{tipoAtual.descricaoEmpresa}</dd></div>}
                    {tipoAtual.descricaoTerceiros && <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Veículo de terceiros</dt><dd className="whitespace-pre-wrap">{tipoAtual.descricaoTerceiros}</dd></div>}
                    <div><dt className="text-xs text-muted-foreground">Pagamento feito por terceiros</dt><dd>{tipoAtual.pagamentoTerceiros || "—"}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Uso de seguradora</dt><dd>{tipoAtual.seguradora ? "Sim" : "Não"}</dd></div>
                    {atual.encerradaEm && <div><dt className="text-xs text-muted-foreground">Encerrada em</dt><dd>{dataHoraBrasilia(atual.encerradaEm)}</dd></div>}
                  </dl>
                )}
                {(atual.renovacoes ?? []).length > 0 && (
                  <div className="space-y-1 border-t pt-2">
                    <h4 className="text-xs font-semibold text-muted-foreground">Renovações de prazo</h4>
                    <ul className="text-sm">
                      {(atual.renovacoes ?? []).map((r, n) => (
                        <li key={n}>{dataHoraBrasilia(r.em)}: prazo para {r.passo === "iniciar" ? "iniciar" : "finalizar"} a tratativa renovado{r.ate ? ` até ${formatarData(r.ate)}` : ""}, autorizado por {r.autorizadoPorNome}.</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTela(null)}>Fechar</Button>
                {atual.status === "Encerrada" && <Button variant="outline" onClick={() => gerarRelatorio(atual)}>Relatório (PDF)</Button>}
                {podeTratar(atual) && (
                  <Button onClick={() => abrirTratativa(atual)}>{atual.status === "Encerrada" ? "Editar tratativa" : "Tratativa"}</Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Tratativa */}
      <Dialog open={tela?.tipo === "tratativa" && !!atual} onOpenChange={(a) => !a && setTela(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {atual && (
            <>
              <DialogHeader>
                <DialogTitle>Tratativa de {atual.codigo}</DialogTitle>
                <DialogDescription>
                  A data e a hora da tratativa são registradas sozinhas. Salvar mantém a ocorrência Em tratativa e permite voltar e editar;
                  encerrar fecha a tratativa.{atual.status === "Encerrada" ? " Tratativa encerrada: só o Administrador pode alterar." : ""}
                </DialogDescription>
              </DialogHeader>
              <form ref={formTratativa} onSubmit={(e) => { e.preventDefault(); gravarTratativa(false); }} className="grid gap-3 sm:grid-cols-2" key={atual.id + atual.status}>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="tr_resp">Responsável pela tratativa</Label>
                  <Select value={responsavelId} onValueChange={setResponsavelId}>
                    <SelectTrigger id="tr_resp"><SelectValue placeholder="Selecione o responsável" /></SelectTrigger>
                    <SelectContent>{(!responsavelId || empregadosAtivos.some((e) => e.id === responsavelId) ? empregadosAtivos : [...empregadosAtivos, ...todosEmpregados.filter((e) => e.id === responsavelId)]).map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {atual.danoEmpresa && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="tr_emp">Tratativa do veículo da empresa</Label>
                    <Textarea id="tr_emp" capitalizar="texto" name="descricaoEmpresa" rows={3} maxLength={2000} defaultValue={atual.tratativa?.descricaoEmpresa ?? ""} />
                  </div>
                )}
                {atual.danoTerceiros && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="tr_ter">Tratativa do veículo de terceiros</Label>
                    <Textarea id="tr_ter" capitalizar="texto" name="descricaoTerceiros" rows={3} maxLength={2000} defaultValue={atual.tratativa?.descricaoTerceiros ?? ""} />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="tr_custo">Custo total para a empresa (R$)</Label>
                  <Input id="tr_custo" name="custoEmpresa" inputMode="decimal" placeholder="Ex.: 1.500,00" defaultValue={atual.tratativa ? String(atual.tratativa.custoEmpresa).replace(".", ",") : ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>Uso de seguradora</Label>
                  <RadioGroup value={seguradora} onValueChange={setSeguradora} className="flex gap-4 pt-2">
                    <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="sim" id="tr_seg_sim" />Sim</label>
                    <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="nao" id="tr_seg_nao" />Não</label>
                  </RadioGroup>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="tr_pag">Pagamento feito por terceiros</Label>
                  <Textarea id="tr_pag" capitalizar="texto" name="pagamentoTerceiros" rows={2} maxLength={1000} placeholder="Descreva quem pagou e o quê (se houver)" defaultValue={atual.tratativa?.pagamentoTerceiros ?? ""} />
                </div>
                <DialogFooter className="sm:col-span-2">
                  <Button type="button" variant="outline" onClick={() => setTela(null)}>Cancelar</Button>
                  <Button type="submit">Salvar</Button>
                  {atual.status !== "Encerrada" && import.meta.env.VITE_DEMO_MODE !== "false" && lerProrrogacaoOcorrencias().permitir && (
                    <Button type="button" variant="outline" onClick={() => setRenovando(atual.id)}>Renovar prazo</Button>
                  )}
                  {atual.status !== "Encerrada" && (
                    <Button type="button" variant="destructive" onClick={() => setConfirmandoEncerrar(true)}>Encerrar tratativa</Button>
                  )}
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmandoEncerrar} onOpenChange={setConfirmandoEncerrar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar a tratativa em definitivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Depois de encerrada não será possível editar mais; só o Administrador poderá alterar. Tem certeza?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => gravarTratativa(true)}>Sim, encerrar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RenovarPrazoOcorrencia ocorrencia={renovando ? (todas.find((o) => o.id === renovando) ?? null) : null} onFechar={() => setRenovando(null)} />

      <AlertDialog open={relatorioPara !== null} onOpenChange={(a) => { if (!a) setRelatorioPara(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tratativa encerrada</AlertDialogTitle>
            <AlertDialogDescription>Quer gerar o relatório da ocorrência em PDF? Ele também fica disponível depois, nos dados da ocorrência encerrada.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Agora não</AlertDialogCancel>
            <AlertDialogAction onClick={() => { const o = todas.find((x) => x.id === relatorioPara); if (o) gerarRelatorio(o); }}>Gerar relatório (PDF)</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <VisorFoto foto={visor?.foto ?? null} titulo={visor?.titulo ?? ""} onFechar={() => setVisor(null)} />
    </div>
  );
}
