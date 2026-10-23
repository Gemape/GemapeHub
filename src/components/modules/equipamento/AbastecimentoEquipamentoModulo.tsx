import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAccess } from "@/lib/access-context";
import { formatarData } from "@/lib/gemape";
import { combinaBusca } from "@/lib/parametros-base";
import { registrarAbastecimentoEq, removerAbastecimentoEq, ultimoHorimetro } from "@/lib/registros-equipamento";
import { executar } from "@/lib/use-parametros-base";
import { abasteceCombustivel, agoraBrasilia, hoje, horimetroEmTexto, numero, reais, rotuloDoEquipamento, TODOS, useAbastecimentosEq, useEquipamentosDaEmpresa } from "./comum";


// Módulos > Equipamentos > Abastecimento: como em Veículos, mas com horímetro no lugar do km. Só aparecem equipamentos com motor a combustão
// (diesel, gasolina ou gás); o histórico mostra as horas trabalhadas, o consumo em L/h e o R$/L de cada abastecimento. Só modo demonstração.
export function AbastecimentoEquipamentoModulo() {
  const { canDelete } = useAccess();
  const equipamentos = useEquipamentosDaEmpresa().filter(abasteceCombustivel);
  const todos = useAbastecimentosEq();
  const [aberto, setAberto] = useState(false);
  const [filtro, setFiltro] = useState(TODOS);
  const [busca, setBusca] = useState("");
  const ids = new Set(equipamentos.map((e) => e.id));
  const filtroValido = filtro === TODOS || ids.has(filtro) ? filtro : TODOS;

  // Histórico por equipamento (as horas só fazem sentido dentro do mesmo equipamento), do mais recente ao mais antigo.
  const linhas = useMemo(() => {
    const doEquipamento = (id: string) => todos.filter((a) => a.equipamentoId === id).sort((a, b) => `${a.data}T${a.hora}`.localeCompare(`${b.data}T${b.hora}`) || a.horimetro - b.horimetro);
    return equipamentos
      .filter((e) => filtroValido === TODOS || e.id === filtroValido)
      .flatMap((e) => doEquipamento(e.id).map((a, i, lista) => {
        const horas = i === 0 ? null : a.horimetro - lista[i - 1]!.horimetro;
        return { ...a, rotulo: rotuloDoEquipamento(e), horas, litrosPorHora: horas && horas > 0 ? a.litros / horas : null, precoLitro: a.litros > 0 ? a.valor / a.litros : null };
      }))
      .filter((a) => combinaBusca(busca, a.rotulo, formatarData(a.data), a.hora, String(a.horimetro), String(a.litros)))
      .sort((a, b) => `${b.data}T${b.hora}`.localeCompare(`${a.data}T${a.hora}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipamentos.length, todos, filtroValido, busca]);
  const resumo = { litros: linhas.reduce((s, a) => s + a.litros, 0), gasto: linhas.reduce((s, a) => s + a.valor, 0) };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="filtro_equipamento">Histórico por equipamento</Label>
          <Select value={filtroValido} onValueChange={setFiltro}>
            <SelectTrigger id="filtro_equipamento" className="w-80 max-w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos os equipamentos a combustão</SelectItem>
              {equipamentos.map((e) => <SelectItem key={e.id} value={e.id}>{rotuloDoEquipamento(e)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Input aria-label="Buscar abastecimento" placeholder="Buscar por equipamento, data ou horímetro" className="max-w-xs" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <Button requiresWrite className="ml-auto" onClick={() => setAberto(true)} disabled={equipamentos.length === 0}>Novo abastecimento</Button>
      </div>
      {equipamentos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum equipamento com motor a combustão cadastrado. Cadastre em Parâmetros &gt; Equipamentos com propulsão a diesel, gasolina ou gás.</p>}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Abastecimentos</p><p className="text-lg font-semibold">{linhas.length}</p></div>
        <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Litros</p><p className="text-lg font-semibold">{numero(resumo.litros)}</p></div>
        <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Total gasto</p><p className="text-lg font-semibold">{reais(resumo.gasto)}</p></div>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data e hora</TableHead><TableHead>Equipamento</TableHead>
              <TableHead className="text-right">Horímetro</TableHead><TableHead className="text-right">Horas trabalhadas</TableHead>
              <TableHead className="text-right">Litros</TableHead><TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">R$/L</TableHead><TableHead className="text-right">L/h</TableHead><TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 && <TableRow><TableCell colSpan={9} className="py-6 text-center text-muted-foreground">{busca.trim() ? "Nenhum resultado para a busca." : "Nenhum abastecimento registrado."}</TableCell></TableRow>}
            {linhas.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{formatarData(a.data)} {a.hora}</TableCell>
                <TableCell>{a.rotulo}</TableCell>
                <TableCell className="text-right">{numero(a.horimetro)} h</TableCell>
                <TableCell className="text-right">{a.horas === null ? "—" : `${numero(a.horas)} h`}</TableCell>
                <TableCell className="text-right">{numero(a.litros)}</TableCell>
                <TableCell className="text-right">{reais(a.valor)}</TableCell>
                <TableCell className="text-right">{reais(a.precoLitro)}</TableCell>
                <TableCell className="text-right">{a.litrosPorHora === null ? "—" : numero(a.litrosPorHora)}</TableCell>
                <TableCell className="text-right">
                  {canDelete && <Button requiresWrite variant="ghost" size="sm" aria-label="Excluir abastecimento" className="text-destructive hover:text-destructive" onClick={() => { if (confirm("Excluir este abastecimento?")) executar(() => removerAbastecimentoEq(a.id), "Abastecimento excluído"); }}>Excluir</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <NovoAbastecimento aberto={aberto} aoMudar={setAberto} equipamentos={equipamentos} aoSalvar={(id) => setFiltro(id)} />
    </div>
  );
}

function NovoAbastecimento({ aberto, aoMudar, equipamentos, aoSalvar }: { aberto: boolean; aoMudar: (v: boolean) => void; equipamentos: { id: string; patrimonio: string; nome: string }[]; aoSalvar: (id: string) => void }) {
  const [equipamentoId, setEquipamentoId] = useState("");
  const sugestao = equipamentoId ? ultimoHorimetro(equipamentoId) : null;
  // Fechar (cancelar ou salvar) limpa o equipamento escolhido.
  const fechar = (v: boolean) => { if (!v) setEquipamentoId(""); aoMudar(v); };
  return (
    <Dialog open={aberto} onOpenChange={fechar}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo abastecimento</DialogTitle>
          <DialogDescription>Escolha o equipamento e informe o horímetro (nunca menor que o do registro anterior), os litros e o valor.</DialogDescription>
        </DialogHeader>
        <form
          key={String(aberto)}
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(ev) => {
            ev.preventDefault();
            const f = new FormData(ev.currentTarget);
            const ok = executar(() => registrarAbastecimentoEq({ equipamentoId, data: String(f.get("data")), hora: String(f.get("hora")), horimetro: String(f.get("horimetro")), litros: String(f.get("litros")), valor: String(f.get("valor")) }), "Abastecimento registrado");
            if (ok) { aoSalvar(equipamentoId); fechar(false); }
          }}
        >
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="eq_abast">Equipamento</Label>
            <Select value={equipamentoId} onValueChange={setEquipamentoId}>
              <SelectTrigger id="eq_abast"><SelectValue placeholder="Selecione o equipamento" /></SelectTrigger>
              <SelectContent>{equipamentos.map((e) => <SelectItem key={e.id} value={e.id}>{rotuloDoEquipamento(e)}</SelectItem>)}</SelectContent>
            </Select>
            {sugestao !== null && <p className="text-xs text-muted-foreground">Último horímetro registrado: {numero(sugestao)} h.</p>}
          </div>
          <div className="space-y-1.5"><Label htmlFor="data">Data</Label><Input id="data" name="data" type="date" max={hoje()} defaultValue={hoje()} required /></div>
          <div className="space-y-1.5"><Label htmlFor="hora">Hora</Label><Input id="hora" name="hora" type="time" defaultValue={agoraBrasilia()} required /></div>
          <div className="space-y-1.5"><Label htmlFor="horimetro">Horímetro (h)</Label><Input id="horimetro" name="horimetro" inputMode="decimal" key={equipamentoId} defaultValue={horimetroEmTexto(sugestao)} required /></div>
          <div className="space-y-1.5"><Label htmlFor="litros">Litros</Label><Input id="litros" name="litros" inputMode="decimal" placeholder="40,5" required /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="valor">Valor (R$)</Label><Input id="valor" name="valor" inputMode="decimal" placeholder="250,00" required /></div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => fechar(false)}>Cancelar</Button>
            <Button requiresWrite type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
