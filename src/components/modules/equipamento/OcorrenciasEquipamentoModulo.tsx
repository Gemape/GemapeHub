import { BarraDeFiltros } from "@/components/layout/BarraDeFiltros";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAccess } from "@/lib/access-context";
import { lerManutencaoEquipamento } from "@/lib/equipamentos-manutencao";
import { formatarData } from "@/lib/gemape";
import { combinaBusca } from "@/lib/parametros-base";
import { adicionarFotosOcorrenciaEq, registrarOcorrenciaEq, removerFotoOcorrenciaEq, removerOcorrenciaEq, resolverOcorrenciaEq } from "@/lib/registros-equipamento";
import { BotaoAnexarFotos, GaleriaFotos, VisorFoto } from "@/components/modules/FotosOcorrencia";
import { executar } from "@/lib/use-parametros-base";
import { hoje, rotuloDoEquipamento, TODOS, useEquipamentosDaEmpresa, useOcorrenciasEq } from "./comum";

// Módulos > Equipamentos > Ocorrências: registra o que aconteceu com o equipamento (tipos de Parâmetros > Equipamentos > Tipos de ocorrência) e
// acompanha até a solução. Ocorrência aberta aparece no inventário. Só modo demonstração.
export function OcorrenciasEquipamentoModulo() {
  const { canDelete } = useAccess();
  const equipamentos = useEquipamentosDaEmpresa();
  const todas = useOcorrenciasEq();
  const [aberto, setAberto] = useState(false);
  const [resolvendo, setResolvendo] = useState<string | null>(null);
  const [visor, setVisor] = useState<{ foto: string; titulo: string } | null>(null);
  const [filtro, setFiltro] = useState(TODOS);
  const [status, setStatus] = useState(TODOS);
  const [busca, setBusca] = useState("");
  const rotulos = new Map(equipamentos.map((e) => [e.id, rotuloDoEquipamento(e)]));
  const filtroValido = filtro === TODOS || rotulos.has(filtro) ? filtro : TODOS;

  const linhas = useMemo(
    () => todas
      .filter((o) => rotulos.has(o.equipamentoId) && (filtroValido === TODOS || o.equipamentoId === filtroValido) && (status === TODOS || o.status === status))
      .filter((o) => combinaBusca(busca, rotulos.get(o.equipamentoId) ?? "", o.tipoNome, o.descricao, o.solucao, formatarData(o.data)))
      .sort((a, b) => Number(b.status === "Aberta") - Number(a.status === "Aberta") || b.data.localeCompare(a.data)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todas, equipamentos.length, filtroValido, status, busca],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Button requiresWrite="operar" onClick={() => setAberto(true)} disabled={equipamentos.length === 0}>Nova ocorrência</Button>
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
              <SelectContent><SelectItem value={TODOS}>Todas</SelectItem><SelectItem value="Aberta">Abertas</SelectItem><SelectItem value="Resolvida">Resolvidas</SelectItem></SelectContent>
            </Select>
          </div>
          <Input aria-label="Buscar ocorrência" placeholder="Buscar por equipamento, tipo ou descrição" className="max-w-xs" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </BarraDeFiltros>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Data</TableHead><TableHead>Equipamento</TableHead><TableHead>Tipo</TableHead><TableHead>Descrição</TableHead><TableHead>Situação</TableHead><TableHead /></TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 && <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">{busca.trim() ? "Nenhum resultado para a busca." : "Nenhuma ocorrência registrada."}</TableCell></TableRow>}
            {linhas.map((o) => (
              <TableRow key={o.id}>
                <TableCell>{formatarData(o.data)}</TableCell>
                <TableCell>{rotulos.get(o.equipamentoId)}</TableCell>
                <TableCell>{o.tipoNome}</TableCell>
                <TableCell className="max-w-sm text-sm">{o.descricao}{(o.fotos?.length ?? 0) > 0 || o.status === "Aberta" ? (
                  <span className="mt-2 block space-y-1">
                    <GaleriaFotos fotos={o.fotos ?? []} onAmpliar={(n) => setVisor({ foto: o.fotos?.[n] ?? "", titulo: `${rotulos.get(o.equipamentoId) ?? ""} · foto ${n + 1}` })}
                      onRemover={o.status === "Aberta" ? (n) => { executar(() => removerFotoOcorrenciaEq(o.id, n), "Foto removida"); } : undefined} />
                    {o.status === "Aberta" && <span className="flex flex-wrap items-center gap-2"><BotaoAnexarFotos quantidadeAtual={o.fotos?.length ?? 0} onFotos={(f) => executar(() => adicionarFotosOcorrenciaEq(o.id, f), "Fotos anexadas")} /></span>}
                  </span>
                ) : null}{o.solucao && <span className="block text-xs text-muted-foreground">Solução ({o.resolvidaEm ? formatarData(o.resolvidaEm) : ""}): {o.solucao}</span>}</TableCell>
                <TableCell><Badge variant={o.status === "Aberta" ? "destructive" : "secondary"}>{o.status}</Badge></TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  {o.status === "Aberta" && <Button requiresWrite="operar" variant="ghost" size="sm" onClick={() => setResolvendo(o.id)}>Resolver</Button>}
                  {canDelete && <Button requiresWrite variant="ghost" size="sm" aria-label="Excluir ocorrência" className="text-destructive hover:text-destructive" onClick={() => { if (confirm("Excluir esta ocorrência?")) executar(() => removerOcorrenciaEq(o.id), "Ocorrência excluída"); }}>Excluir</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <NovaOcorrencia aberto={aberto} aoMudar={setAberto} equipamentos={equipamentos} />
      <VisorFoto foto={visor?.foto ?? null} titulo={visor?.titulo ?? ""} onFechar={() => setVisor(null)} />
      <Dialog open={resolvendo !== null} onOpenChange={(v) => { if (!v) setResolvendo(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resolver ocorrência</DialogTitle><DialogDescription>Conte como a ocorrência foi resolvida.</DialogDescription></DialogHeader>
          <form
            onSubmit={(ev) => {
              ev.preventDefault();
              const solucao = String(new FormData(ev.currentTarget).get("solucao") ?? "");
              if (resolvendo && executar(() => resolverOcorrenciaEq(resolvendo, solucao), "Ocorrência resolvida")) setResolvendo(null);
            }}
            className="space-y-3"
          >
            <div className="space-y-1.5"><Label htmlFor="solucao">Solução</Label><Textarea id="solucao" name="solucao" capitalizar="texto" rows={3} required /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setResolvendo(null)}>Cancelar</Button><Button type="submit">Marcar como resolvida</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
