import { BarraDeFiltros } from "@/components/layout/BarraDeFiltros";
import { confirmarExclusao } from "@/components/ConfirmarAcao";
import { useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { RenovarPrazoOcorrencia } from "@/components/modules/RenovarPrazoOcorrencia";
import { useAccess } from "@/lib/access-context";
import { TODAS } from "@/lib/empresa-context";
import { capitalizarTexto } from "@/lib/formatacao-cadastral";
import { useEmpregados } from "@/lib/hooks-gemape";
import { lerProrrogacaoOcorrencias } from "@/lib/prazo-ocorrencias";
import { lerManutencaoEquipamento } from "@/lib/equipamentos-manutencao";
import { formatarData } from "@/lib/gemape";
import { combinaBusca } from "@/lib/parametros-base";
import { adicionarFotosOcorrenciaEq, codigoDaOcorrenciaEq, ocorrenciaEncerradaEq, registrarOcorrenciaEq, removerFotoOcorrenciaEq, removerOcorrenciaEq, renovarPrazoTratativaEq, salvarTratativaEq, type OcorrenciaEquipamento } from "@/lib/registros-equipamento";
import { BotaoAnexarFotos, GaleriaFotos, VisorFoto } from "@/components/modules/FotosOcorrencia";
import { executar } from "@/lib/use-parametros-base";
import { ExtratoEquipamento } from "./ExtratoEquipamento";
import { hoje, rotuloDoEquipamento, seloDaSituacao, TODOS, useEquipamentosDaEmpresa, useOcorrenciasEq } from "./comum";

// Módulos > Equipamentos > Ocorrências: registra o que aconteceu com o equipamento (tipos de Parâmetros > Equipamentos > Tipos de ocorrência) e
// acompanha até a solução. Ocorrência aberta aparece no inventário. Só modo demonstração.
export function OcorrenciasEquipamentoModulo() {
  const { canDelete, canWrite, isAdmin } = useAccess();
  const equipamentos = useEquipamentosDaEmpresa();
  const todas = useOcorrenciasEq();
  const [aberto, setAberto] = useState(false);
  // O equipamento da lista abre só as informações de ocorrências dele (decisão 395), como o veículo em Veículos > Ocorrências.
  const [extratoDe, setExtratoDe] = useState<string | null>(null);
  // Tratativa como em Veículos: responsável, descrição, custo, seguradora e pagamento de terceiros; salvar mantém Em tratativa, encerrar fecha.
  const [tratando, setTratando] = useState<string | null>(null);
  const [responsavelId, setResponsavelId] = useState("");
  const [seguradora, setSeguradora] = useState("");
  const [confirmandoEncerrar, setConfirmandoEncerrar] = useState(false);
  const [renovando, setRenovando] = useState<string | null>(null);
  const formTratativa = useRef<HTMLFormElement>(null);
  const trava = useRef(false);
  const { data: empregadosAtivos = [] } = useEmpregados(TODAS, true);
  const { data: todosEmpregados = [] } = useEmpregados(TODAS);
  const [visor, setVisor] = useState<{ foto: string; titulo: string } | null>(null);
  const [filtro, setFiltro] = useState(TODOS);
  const [status, setStatus] = useState(TODOS);
  const [busca, setBusca] = useState("");
  const rotulos = new Map(equipamentos.map((e) => [e.id, rotuloDoEquipamento(e)]));
  const filtroValido = filtro === TODOS || rotulos.has(filtro) ? filtro : TODOS;

  const linhas = useMemo(
    () => todas
      .filter((o) => rotulos.has(o.equipamentoId) && (filtroValido === TODOS || o.equipamentoId === filtroValido) && (status === TODOS || (status === "Encerrada" ? ocorrenciaEncerradaEq(o) : o.status === status)))
      .filter((o) => combinaBusca(busca, rotulos.get(o.equipamentoId) ?? "", codigoDaOcorrenciaEq(o), o.tipoNome, o.descricao, o.solucao, o.status, formatarData(o.data)))
      .sort((a, b) => Number(ocorrenciaEncerradaEq(a)) - Number(ocorrenciaEncerradaEq(b)) || b.data.localeCompare(a.data)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todas, equipamentos.length, filtroValido, status, busca],
  );

  const atual = tratando ? (todas.find((o) => o.id === tratando) ?? null) : null;
  function abrirTratativa(o: OcorrenciaEquipamento) {
    setResponsavelId(o.tratativa?.responsavelId ?? "");
    setSeguradora(o.tratativa ? (o.tratativa.seguradora ? "sim" : "nao") : "");
    setTratando(o.id);
  }
  // Depois de gravar, a trava fica um instante: o diálogo ainda está na tela durante a animação de saída e um segundo clique não pode gravar de novo.
  function gravarTratativa(encerrar: boolean) {
    if (!atual || !formTratativa.current || trava.current) return;
    const f = new FormData(formTratativa.current);
    trava.current = true;
    const ok = executar(
      () => salvarTratativaEq(
        atual.id,
        { responsavelId, seguradora, descricaoEmpresa: capitalizarTexto(String(f.get("descricaoEmpresa") ?? "")), custoEmpresa: String(f.get("custoEmpresa") ?? ""), pagamentoTerceiros: capitalizarTexto(String(f.get("pagamentoTerceiros") ?? "")) },
        { encerrar, isAdmin },
      ),
      encerrar ? "Tratativa encerrada" : "Tratativa salva",
    );
    if (ok) window.setTimeout(() => { trava.current = false; }, 800); else trava.current = false;
    setConfirmandoEncerrar(false);
    if (ok) setTratando(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <BarraDeFiltros>
          <div className="space-y-1.5">
            <Label htmlFor="filtro_eq_ocor">Equipamento</Label>
            <Select value={filtroValido} onValueChange={setFiltro}>
              <SelectTrigger id="filtro_eq_ocor" className="w-80 max-w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos os equipamentos</SelectItem>
                {equipamentos.map((e) => <SelectItem key={e.id} value={e.id}>{rotuloDoEquipamento(e)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filtro_eq_status">Situação</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="filtro_eq_status" className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={TODOS}>Todas</SelectItem><SelectItem value="Aberta">Abertas</SelectItem><SelectItem value="Em tratativa">Em tratativa</SelectItem><SelectItem value="Encerrada">Encerradas</SelectItem></SelectContent>
            </Select>
          </div>
          <Input aria-label="Buscar ocorrência" placeholder="Buscar por equipamento, tipo ou descrição" className="max-w-xs" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </BarraDeFiltros>
        <Button requiresWrite="operar" onClick={() => setAberto(true)} disabled={equipamentos.length === 0}>Nova ocorrência</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Código</TableHead><TableHead>Data</TableHead><TableHead>Equipamento</TableHead><TableHead>Tipo</TableHead><TableHead>Descrição</TableHead><TableHead>Situação</TableHead><TableHead /></TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 && <TableRow><TableCell colSpan={7} className="py-6 text-center text-muted-foreground">{busca.trim() ? "Nenhum resultado para a busca." : "Nenhuma ocorrência registrada."}</TableCell></TableRow>}
            {linhas.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="whitespace-nowrap font-medium">{codigoDaOcorrenciaEq(o)}</TableCell>
                <TableCell>{formatarData(o.data)}</TableCell>
                <TableCell><Button variant="link" size="sm" className="h-auto p-0 text-left font-normal" aria-label={`Ocorrências de ${rotulos.get(o.equipamentoId) ?? ""}`} onClick={() => setExtratoDe(o.equipamentoId)}>{rotulos.get(o.equipamentoId)}</Button></TableCell>
                <TableCell>{o.tipoNome}</TableCell>
                <TableCell className="max-w-sm text-sm">{o.descricao}{(o.fotos?.length ?? 0) > 0 || !ocorrenciaEncerradaEq(o) ? (
                  <span className="mt-2 block space-y-1">
                    <GaleriaFotos fotos={o.fotos ?? []} onAmpliar={(n) => setVisor({ foto: o.fotos?.[n] ?? "", titulo: `${rotulos.get(o.equipamentoId) ?? ""} · foto ${n + 1}` })}
                      onRemover={!ocorrenciaEncerradaEq(o) ? (n) => { executar(() => removerFotoOcorrenciaEq(o.id, n), "Foto removida"); } : undefined} />
                    {!ocorrenciaEncerradaEq(o) && <span className="flex flex-wrap items-center gap-2"><BotaoAnexarFotos quantidadeAtual={o.fotos?.length ?? 0} onFotos={(f) => executar(() => adicionarFotosOcorrenciaEq(o.id, f), "Fotos anexadas")} /></span>}
                  </span>
                ) : null}{o.solucao && <span className="block text-xs text-muted-foreground">Solução ({o.resolvidaEm ? formatarData(o.resolvidaEm) : ""}): {o.solucao}</span>}{o.tratativa && <span className="block text-xs text-muted-foreground">Tratativa: {o.tratativa.descricaoEmpresa}</span>}</TableCell>
                <TableCell><Badge variant="outline" className={seloDaSituacao(o.status)}>{o.status}</Badge></TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  {canWrite && (!ocorrenciaEncerradaEq(o) || isAdmin) && <Button requiresWrite="operar" size="sm" onClick={() => abrirTratativa(o)}>{ocorrenciaEncerradaEq(o) ? "Editar tratativa" : "Tratativa"}</Button>}
                  {canDelete && <Button requiresWrite variant="ghost" size="sm" aria-label="Excluir ocorrência" className="text-destructive hover:text-destructive" onClick={async () => { if (await confirmarExclusao(`a ocorrência de ${formatarData(o.data)} (${o.tipoNome})`)) executar(() => removerOcorrenciaEq(o.id), "Ocorrência excluída"); }}>Excluir</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ExtratoEquipamento equipamento={equipamentos.find((e) => e.id === extratoDe) ?? null} foco="ocorrencias" onFechar={() => setExtratoDe(null)} />
      <NovaOcorrencia aberto={aberto} aoMudar={setAberto} equipamentos={equipamentos} />
      <VisorFoto foto={visor?.foto ?? null} titulo={visor?.titulo ?? ""} onFechar={() => setVisor(null)} />
      <Dialog open={atual !== null} onOpenChange={(v) => { if (!v) setTratando(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {atual && (
            <>
              <DialogHeader>
                <DialogTitle>Tratativa de {codigoDaOcorrenciaEq(atual)}</DialogTitle>
                <DialogDescription>
                  A data e a hora da tratativa são registradas sozinhas. Salvar mantém a ocorrência Em tratativa e permite voltar e editar;
                  encerrar fecha a tratativa.{ocorrenciaEncerradaEq(atual) ? " Tratativa encerrada: só o Administrador pode alterar." : ""}
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
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="tr_emp">Tratativa do equipamento da empresa</Label>
                  <Textarea id="tr_emp" capitalizar="texto" name="descricaoEmpresa" rows={3} maxLength={2000} defaultValue={atual.tratativa?.descricaoEmpresa ?? ""} />
                </div>
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
                  <Button type="button" variant="outline" onClick={() => setTratando(null)}>Cancelar</Button>
                  <Button type="submit">Salvar</Button>
                  {!ocorrenciaEncerradaEq(atual) && import.meta.env.VITE_DEMO_MODE !== "false" && lerProrrogacaoOcorrencias().permitir && (
                    <Button type="button" variant="outline" onClick={() => setRenovando(atual.id)}>Renovar prazo</Button>
                  )}
                  {!ocorrenciaEncerradaEq(atual) && <Button type="button" variant="destructive" onClick={() => setConfirmandoEncerrar(true)}>Encerrar tratativa</Button>}
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
            <AlertDialogDescription>Depois de encerrada não será possível editar mais; só o Administrador poderá alterar. Tem certeza?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => gravarTratativa(true)}>Sim, encerrar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RenovarPrazoOcorrencia
        ocorrencia={(() => { const o = renovando ? todas.find((x) => x.id === renovando) : undefined; return o ? { id: o.id, codigo: codigoDaOcorrenciaEq(o), status: o.status } : null; })()}
        onFechar={() => setRenovando(null)} renovar={renovarPrazoTratativaEq}
      />
    </div>
  );
}

export function NovaOcorrencia({ aberto, aoMudar, equipamentos, equipamentoInicial = "" }: { aberto: boolean; aoMudar: (v: boolean) => void; equipamentos: { id: string; patrimonio: string; nome: string }[]; equipamentoInicial?: string }) {
  const tipos = lerManutencaoEquipamento().tiposOcorrencia;
  const [equipamentoId, setEquipamentoId] = useState(equipamentoInicial);
  const [tipoId, setTipoId] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);
  const [visorNova, setVisorNova] = useState<string | null>(null);
  // Fechar (cancelar ou salvar) limpa o que foi escolhido.
  const fechar = (v: boolean) => { if (!v) { setEquipamentoId(equipamentoInicial); setTipoId(""); setFotos([]); } aoMudar(v); };
  return (
    <>
    <Dialog open={aberto} onOpenChange={fechar}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova ocorrência</DialogTitle><DialogDescription>Escolha o equipamento e o tipo, e descreva o que aconteceu.</DialogDescription></DialogHeader>
        <form
          key={String(aberto)}
          className="space-y-3"
          onSubmit={(ev) => {
            ev.preventDefault();
            const f = new FormData(ev.currentTarget);
            const tipo = tipos.find((t) => t.id === tipoId);
            const ok = executar(() => registrarOcorrenciaEq({ equipamentoId, tipoId, tipoNome: tipo?.nome ?? "", data: String(f.get("data")), descricao: String(f.get("descricao") ?? ""), fotos }), "Ocorrência registrada");
            if (ok) fechar(false);
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="eq_ocor">Equipamento</Label>
            <Select value={equipamentoId} onValueChange={setEquipamentoId}>
              <SelectTrigger id="eq_ocor"><SelectValue placeholder="Selecione o equipamento" /></SelectTrigger>
              <SelectContent>{equipamentos.map((e) => <SelectItem key={e.id} value={e.id}>{rotuloDoEquipamento(e)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tipo_ocor">Tipo de ocorrência</Label>
            <Select value={tipoId} onValueChange={setTipoId}>
              <SelectTrigger id="tipo_ocor"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
              <SelectContent>{tipos.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
            </Select>
            {tipos.length === 0 && <p className="text-xs text-muted-foreground">Nenhum tipo cadastrado. Cadastre em Parâmetros &gt; Equipamentos &gt; Tipos de ocorrência.</p>}
          </div>
          <div className="space-y-1.5"><Label htmlFor="data">Data</Label><Input id="data" name="data" type="date" max={hoje()} defaultValue={hoje()} required /></div>
          <div className="space-y-1.5"><Label htmlFor="descricao">Descrição</Label><Textarea id="descricao" name="descricao" capitalizar="texto" rows={3} required /></div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2"><BotaoAnexarFotos quantidadeAtual={fotos.length} onFotos={(f) => setFotos((a) => [...a, ...f])} /></div>
            <GaleriaFotos fotos={fotos} onAmpliar={(i) => setVisorNova(fotos[i] ?? null)} onRemover={(i) => setFotos((a) => a.filter((_, j) => j !== i))} />
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => fechar(false)}>Cancelar</Button><Button requiresWrite="operar" type="submit">Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <VisorFoto foto={visorNova} titulo="Foto da ocorrência" onFechar={() => setVisorNova(null)} />
    </>
  );
}
