import { useRef, useState } from "react";

import { rotuloDoVeiculo } from "@/components/modules/rotulo-veiculo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAccess } from "@/lib/access-context";
import { useEmpresa } from "@/lib/empresa-context";
import { formatarData } from "@/lib/gemape";
import { hojeLocal } from "@/lib/empregados";
import { useVeiculos } from "@/lib/hooks-gemape";
import { registrarAbastecimento, removerAbastecimento } from "@/lib/registros-veiculo";
import { useAbastecimentos } from "@/lib/use-registros-veiculo";
import { executar, useParametrosBase } from "@/lib/use-parametros-base";

const MODO_DEMO = import.meta.env["VITE_DEMO_MODE"] !== "false";

// Módulos > Veículos > Abastecimento (decisão 57): data, km e litros por veículo. A média km/L
// aparece no extrato. Só modo demonstração; nada no Supabase.
export function AbastecimentoVeiculoModulo() {
  const { empresaId } = useEmpresa();
  const { isAdmin } = useAccess();
  const parametros = useParametrosBase();
  const { data: veiculos = [] } = useVeiculos(empresaId);
  const todos = useAbastecimentos();
  const [aberto, setAberto] = useState(false);
  const [veiculoId, setVeiculoId] = useState("");
  const trava = useRef(false);

  const idsDaEmpresa = new Set(veiculos.map((v) => v.id));
  const lista = todos
    .filter((a) => idsDaEmpresa.has(a.veiculoId))
    .sort((a, b) => b.data.localeCompare(a.data) || b.km - a.km);
  const veiculo = (id: string) => veiculos.find((v) => v.id === id);

  if (!MODO_DEMO) {
    return <p className="text-sm text-muted-foreground">O abastecimento de veículos estará disponível após a Fase 2 (banco real).</p>;
  }

  function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (trava.current) return;
    const f = new FormData(e.currentTarget);
    trava.current = true;
    const ok = executar(
      () => registrarAbastecimento({ veiculoId, data: String(f.get("data") ?? ""), km: String(f.get("km") ?? ""), litros: String(f.get("litros") ?? "") }),
      "Abastecimento registrado",
    );
    trava.current = false;
    if (ok) setAberto(false);
  }

  function excluir(id: string) {
    if (!confirm("Excluir este abastecimento?")) return;
    executar(() => removerAbastecimento(id), "Abastecimento excluído");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted-foreground">{lista.length} abastecimento(s) registrado(s).</p>
        <Button requiresWrite className="ml-auto" onClick={() => { setVeiculoId(""); setAberto(true); }}>
          Novo abastecimento
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Veículo</TableHead>
              <TableHead className="text-right">Km</TableHead>
              <TableHead className="text-right">Litros</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.length === 0 && (
              <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">Nenhum abastecimento registrado.</TableCell></TableRow>
            )}
            {lista.map((a) => {
              const v = veiculo(a.veiculoId);
              return (
                <TableRow key={a.id}>
                  <TableCell>{formatarData(a.data)}</TableCell>
                  <TableCell>{v ? rotuloDoVeiculo(parametros, v) : "—"}</TableCell>
                  <TableCell className="text-right">{a.km.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right">{a.litros.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right">
                    {isAdmin && (
                      <Button requiresWrite variant="ghost" size="sm" aria-label="Excluir abastecimento" className="text-destructive hover:text-destructive" onClick={() => excluir(a.id)}>
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

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo abastecimento</DialogTitle>
            <DialogDescription>O km acompanha a data: não pode ser menor que o de um abastecimento anterior do mesmo veículo.</DialogDescription>
          </DialogHeader>
          <form onSubmit={salvar} className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="veiculo">Veículo</Label>
              <Select value={veiculoId} onValueChange={setVeiculoId}>
                <SelectTrigger id="veiculo"><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
                <SelectContent>
                  {veiculos.map((v) => <SelectItem key={v.id} value={v.id}>{rotuloDoVeiculo(parametros, v)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="data">Data</Label>
                <Input id="data" name="data" type="date" defaultValue={hojeLocal()} max={hojeLocal()} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="km">Km do veículo</Label>
                <Input id="km" name="km" inputMode="numeric" placeholder="Ex.: 50.000" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="litros">Litros</Label>
                <Input id="litros" name="litros" inputMode="decimal" placeholder="Ex.: 40,5" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
