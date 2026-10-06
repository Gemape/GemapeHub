import { useRef, useState } from "react";

import { BotaoAnexarFotos, GaleriaFotos, VisorFoto } from "@/components/modules/FotosOcorrencia";
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
import { hojeLocal } from "@/lib/empregados";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { formatarData } from "@/lib/gemape";
import { useEmpregados, useVeiculos } from "@/lib/hooks-gemape";
import {
  adicionarFotosOcorrencia, contarPorStatus, registrarOcorrenciaVeiculo, removerFotoOcorrencia, salvarTratativa,
  STATUS_OCORRENCIA, type OcorrenciaVeiculo, type StatusOcorrencia,
} from "@/lib/ocorrencias-veiculo";
import { combinaBusca } from "@/lib/parametros-base";
import { useOcorrenciasVeiculo } from "@/lib/use-registros-veiculo";
import { executar, useParametrosBase } from "@/lib/use-parametros-base";

const reais = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const horaAgora = () => `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;
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

type Tela = { tipo: "nova" } | { tipo: "detalhe" | "tratativa"; id: string } | null;

// Módulos > Veículos > Ocorrências (decisão 60): lista com status colorido, nova ocorrência com
// código automático, detalhe com fotos e tratativa feita por quem tem permissão de gravar.
// Só modo demonstração; nada no Supabase.
export function OcorrenciasVeiculoModulo() {
  const { empresaId } = useEmpresa();
  const { isAdmin, canWrite } = useAccess();
  const parametros = useParametrosBase();
  const { data: veiculos = [] } = useVeiculos(empresaId);
  const { data: empregadosAtivos = [] } = useEmpregados(TODAS, true);
  const { data: todosEmpregados = [] } = useEmpregados(TODAS);
  const todas = useOcorrenciasVeiculo();
  const [tela, setTela] = useState<Tela>(null);
  const [filtro, setFiltro] = useState<StatusOcorrencia | "todas">("todas");
  const [busca, setBusca] = useState("");
  const [visor, setVisor] = useState<{ foto: string; titulo: string } | null>(null);
  const [confirmandoEncerrar, setConfirmandoEncerrar] = useState(false);
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
          local: String(f.get("local") ?? ""), descricao: String(f.get("descricao") ?? ""),
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
          descricaoEmpresa: String(f.get("descricaoEmpresa") ?? ""), descricaoTerceiros: String(f.get("descricaoTerceiros") ?? ""),
          custoEmpresa: String(f.get("custoEmpresa") ?? ""), pagamentoTerceiros: String(f.get("pagamentoTerceiros") ?? ""),
        },
        { encerrar, isAdmin },
      ),
      encerrar ? "Tratativa encerrada" : "Tratativa salva",
    );
    soltarTrava(ok);
    setConfirmandoEncerrar(false);
    if (ok) setTela(null);
  }

  function anexarFotos(fotos: string[]) {
    if (!atual) return;
    executar(() => adicionarFotosOcorrencia(atual.id, fotos, { isAdmin }), "Fotos anexadas");
  }

  const tipoAtual = atual?.tratativa;
  const bloqueadoParaEditar = !canWrite || (!!atual && atual.status === "Encerrada" && !isAdmin);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Buscar ocorrência"
          placeholder="Buscar por código, veículo, tipo ou condutor"
          className="max-w-xs"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por status">
          <Button type="button" size="sm" variant={filtro === "todas" ? "default" : "outline"} onClick={() => setFiltro("todas")}>
            Todas ({daEmpresa.length})
          </Button>
          {STATUS_OCORRENCIA.map((s) => (
            <Button
              key={s} type="button" size="sm" variant="outline"
              className={`${COR_STATUS[s]} ${filtro === s ? "ring-2 ring-ring" : ""}`}
              onClick={() => setFiltro(filtro === s ? "todas" : s)}
            >
              {s} ({contagem[s]})
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
              <Input id="oc_local" name="local" maxLength={200} placeholder="Ex.: BR-116, km 40" />
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
              <Textarea id="oc_descricao" name="descricao" rows={3} maxLength={2000} />
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
              </section>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTela(null)}>Fechar</Button>
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
                    <SelectContent>{empregadosAtivos.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {atual.danoEmpresa && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="tr_emp">Tratativa do veículo da empresa</Label>
                    <Textarea id="tr_emp" name="descricaoEmpresa" rows={3} maxLength={2000} defaultValue={atual.tratativa?.descricaoEmpresa ?? ""} />
                  </div>
                )}
                {atual.danoTerceiros && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="tr_ter">Tratativa do veículo de terceiros</Label>
                    <Textarea id="tr_ter" name="descricaoTerceiros" rows={3} maxLength={2000} defaultValue={atual.tratativa?.descricaoTerceiros ?? ""} />
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
                  <Textarea id="tr_pag" name="pagamentoTerceiros" rows={2} maxLength={1000} placeholder="Descreva quem pagou e o quê (se houver)" defaultValue={atual.tratativa?.pagamentoTerceiros ?? ""} />
                </div>
                <DialogFooter className="sm:col-span-2">
                  <Button type="button" variant="outline" onClick={() => setTela(null)}>Cancelar</Button>
                  <Button type="submit">Salvar</Button>
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

      <VisorFoto foto={visor?.foto ?? null} titulo={visor?.titulo ?? ""} onFechar={() => setVisor(null)} />
    </div>
  );
}
