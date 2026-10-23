import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { custoDaManutencaoEq, registrarManutencaoEq, removerManutencaoEq, ultimoHorimetro, type AcaoRealizada } from "@/lib/registros-equipamento";
import { executar } from "@/lib/use-parametros-base";
import { hoje, horimetroEmTexto, numero, reais, rotuloDoEquipamento, TODOS, useEquipamentosDaEmpresa, useManutencoesEq } from "./comum";

// Módulos > Equipamentos > Manutenção: registra a manutenção preventiva ou corretiva de um equipamento com as ações realizadas (as de Parâmetros >
// Equipamentos > Manutenção), onde foi feita e os custos. O histórico traz o custo total por equipamento. Só modo demonstração.
export function ManutencaoEquipamentoModulo() {
  const { canDelete } = useAccess();
  const equipamentos = useEquipamentosDaEmpresa();
  const todas = useManutencoesEq();
  const [aberto, setAberto] = useState(false);
  const [filtro, setFiltro] = useState(TODOS);
  const [tipo, setTipo] = useState(TODOS);
  const [busca, setBusca] = useState("");
  const rotulos = new Map(equipamentos.map((e) => [e.id, rotuloDoEquipamento(e)]));
  const filtroValido = filtro === TODOS || rotulos.has(filtro) ? filtro : TODOS;

  const linhas = useMemo(
    () => todas
      .filter((m) => rotulos.has(m.equipamentoId) && (filtroValido === TODOS || m.equipamentoId === filtroValido) && (tipo === TODOS || m.tipo === tipo))
      .filter((m) => combinaBusca(busca, rotulos.get(m.equipamentoId) ?? "", m.tipo, formatarData(m.data), m.localNome, m.observacao, ...m.acoes.map((a) => a.nome)))
      .sort((a, b) => b.data.localeCompare(a.data) || b.horimetro - a.horimetro),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todas, equipamentos.length, filtroValido, tipo, busca],
  );
  const custo = linhas.reduce((s, m) => s + custoDaManutencaoEq(m), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="filtro_eq_manut">Histórico por equipamento</Label>
          <Select value={filtroValido} onValueChange={setFiltro}>
            <SelectTrigger id="filtro_eq_manut" className="w-80 max-w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos os equipamentos</SelectItem>
              {equipamentos.map((e) => <SelectItem key={e.id} value={e.id}>{rotuloDoEquipamento(e)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filtro_eq_tipo">Tipo</Label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger id="filtro_eq_tipo" className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos</SelectItem><SelectItem value="Preventiva">Preventiva</SelectItem><SelectItem value="Corretiva">Corretiva</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Input aria-label="Buscar manutenção" placeholder="Buscar por equipamento, ação ou local" className="max-w-xs" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <Button requiresWrite className="ml-auto" onClick={() => setAberto(true)} disabled={equipamentos.length === 0}>Nova manutenção</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Manutenções</p><p className="text-lg font-semibold">{linhas.length}</p></div>
        <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Preventivas / corretivas</p><p className="text-lg font-semibold">{linhas.filter((m) => m.tipo === "Preventiva").length} / {linhas.filter((m) => m.tipo === "Corretiva").length}</p></div>
        <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Custo total</p><p className="text-lg font-semibold">{reais(custo)}</p></div>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead><TableHead>Equipamento</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">Horímetro</TableHead>
              <TableHead>Ações realizadas</TableHead><TableHead>Local</TableHead><TableHead className="text-right">Parado</TableHead><TableHead className="text-right">Custo</TableHead><TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 && <TableRow><TableCell colSpan={9} className="py-6 text-center text-muted-foreground">{busca.trim() ? "Nenhum resultado para a busca." : "Nenhuma manutenção registrada."}</TableCell></TableRow>}
            {linhas.map((m) => (
              <TableRow key={m.id}>
                <TableCell>{formatarData(m.data)}</TableCell>
                <TableCell>{rotulos.get(m.equipamentoId)}</TableCell>
                <TableCell>{m.tipo}</TableCell>
                <TableCell className="text-right">{numero(m.horimetro)} h</TableCell>
                <TableCell className="max-w-xs text-xs">{m.acoes.map((a) => (a.subitens.length ? `${a.nome} (${a.subitens.join(", ")})` : a.nome)).join("; ")}{m.observacao && <span className="block text-muted-foreground">{m.observacao}</span>}</TableCell>
                <TableCell>{m.localNome}</TableCell>
                <TableCell className="text-right">{m.horasParada ? `${numero(m.horasParada)} h` : "—"}</TableCell>
                <TableCell className="text-right">{reais(custoDaManutencaoEq(m))}</TableCell>
                <TableCell className="text-right">
                  {canDelete && <Button requiresWrite variant="ghost" size="sm" aria-label="Excluir manutenção" className="text-destructive hover:text-destructive" onClick={() => { if (confirm("Excluir esta manutenção?")) executar(() => removerManutencaoEq(m.id), "Manutenção excluída"); }}>Excluir</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <NovaManutencao aberto={aberto} aoMudar={setAberto} equipamentos={equipamentos} />
    </div>
  );
}

function NovaManutencao({ aberto, aoMudar, equipamentos }: { aberto: boolean; aoMudar: (v: boolean) => void; equipamentos: { id: string; patrimonio: string; nome: string }[] }) {
  const acoesDisponiveis = lerManutencaoEquipamento().acoes;
  const [equipamentoId, setEquipamentoId] = useState("");
  const [tipo, setTipo] = useState("Preventiva");
  const [local, setLocal] = useState("empresa");
  const [escolhidas, setEscolhidas] = useState<Record<string, string[]>>({});
  const sugestao = equipamentoId ? ultimoHorimetro(equipamentoId) : null;
  // Fechar (cancelar ou salvar) limpa o que foi escolhido: o formulário reabre em branco, ações e equipamento incluídos.
  function fechar(v: boolean) {
    if (!v) { setEquipamentoId(""); setTipo("Preventiva"); setLocal("empresa"); setEscolhidas({}); }
    aoMudar(v);
  }

  function alternarAcao(id: string, marcada: boolean) {
    setEscolhidas((atual) => { const novo = { ...atual }; if (marcada) novo[id] = novo[id] ?? []; else delete novo[id]; return novo; });
  }
  function alternarSubitem(id: string, nome: string, marcado: boolean) {
    setEscolhidas((atual) => ({ ...atual, [id]: marcado ? [...(atual[id] ?? []), nome] : (atual[id] ?? []).filter((n) => n !== nome) }));
  }

  return (
    <Dialog open={aberto} onOpenChange={fechar}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova manutenção de equipamento</DialogTitle>
          <DialogDescription>Marque as ações realizadas (e, se quiser, os subitens), onde foi feita e os custos.</DialogDescription>
        </DialogHeader>
        <form
          key={String(aberto)}
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(ev) => {
            ev.preventDefault();
            const f = new FormData(ev.currentTarget);
            const acoes: AcaoRealizada[] = acoesDisponiveis.filter((a) => a.id in escolhidas).map((a) => ({ acaoId: a.id, nome: a.nome, subitens: escolhidas[a.id] ?? [] }));
            const ok = executar(() => registrarManutencaoEq({
              equipamentoId, tipo, data: String(f.get("data")), horimetro: String(f.get("horimetro")), acoes, local, localNome: String(f.get("localNome") ?? ""),
              custoPecas: String(f.get("custoPecas") ?? ""), custoMaoDeObra: String(f.get("custoMaoDeObra") ?? ""), observacao: String(f.get("observacao") ?? ""), horasParada: String(f.get("horasParada") ?? ""),
            }), "Manutenção registrada");
            if (ok) fechar(false);
          }}
        >
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="eq_manut">Equipamento</Label>
            <Select value={equipamentoId} onValueChange={setEquipamentoId}>
              <SelectTrigger id="eq_manut"><SelectValue placeholder="Selecione o equipamento" /></SelectTrigger>
              <SelectContent>{equipamentos.map((e) => <SelectItem key={e.id} value={e.id}>{rotuloDoEquipamento(e)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tipo_manut">Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger id="tipo_manut"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Preventiva">Preventiva</SelectItem><SelectItem value="Corretiva">Corretiva</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="data">Data</Label><Input id="data" name="data" type="date" max={hoje()} defaultValue={hoje()} required /></div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="horimetro">Horímetro (h)</Label>
            <Input id="horimetro" name="horimetro" inputMode="decimal" key={equipamentoId} defaultValue={horimetroEmTexto(sugestao)} required />
            {sugestao !== null && <p className="text-xs text-muted-foreground">Último horímetro registrado: {numero(sugestao)} h.</p>}
          </div>
          <fieldset className="space-y-2 rounded-md border p-3 sm:col-span-2">
            <legend className="px-1 text-sm font-medium">Ações realizadas</legend>
            {acoesDisponiveis.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma ação cadastrada. Cadastre em Parâmetros &gt; Equipamentos &gt; Manutenção.</p>}
            {acoesDisponiveis.map((a) => (
              <div key={a.id} className="space-y-1">
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={a.id in escolhidas} onCheckedChange={(v) => alternarAcao(a.id, v === true)} aria-label={a.nome} />{a.nome}</label>
                {a.id in escolhidas && a.subitens.length > 0 && (
                  <div className="ml-6 grid gap-1 sm:grid-cols-2">
                    {a.subitens.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 text-xs"><Checkbox checked={(escolhidas[a.id] ?? []).includes(s.nome)} onCheckedChange={(v) => alternarSubitem(a.id, s.nome, v === true)} aria-label={`${a.nome}: ${s.nome}`} />{s.nome}</label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor="local_manut">Onde foi feita</Label>
            <Select value={local} onValueChange={setLocal}>
              <SelectTrigger id="local_manut"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="empresa">Na empresa</SelectItem><SelectItem value="terceiro">Em terceiro</SelectItem></SelectContent>
            </Select>
          </div>
          {local === "terceiro" && <div className="space-y-1.5"><Label htmlFor="localNome">Nome do terceiro</Label><Input id="localNome" name="localNome" capitalizar="texto" /></div>}
          <div className="space-y-1.5"><Label htmlFor="custoPecas">Custo das peças (R$)</Label><Input id="custoPecas" name="custoPecas" inputMode="decimal" placeholder="0,00" /></div>
          <div className="space-y-1.5"><Label htmlFor="custoMaoDeObra">Custo da mão de obra (R$)</Label><Input id="custoMaoDeObra" name="custoMaoDeObra" inputMode="decimal" placeholder="0,00" /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="horasParada">Tempo parado por causa da manutenção (horas)</Label><Input id="horasParada" name="horasParada" inputMode="decimal" placeholder="0" /><p className="text-xs text-muted-foreground">Alimenta a disponibilidade do equipamento nos Indicadores.</p></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="observacao">Observação</Label><Textarea id="observacao" name="observacao" capitalizar="texto" rows={2} /></div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => fechar(false)}>Cancelar</Button>
            <Button requiresWrite type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
