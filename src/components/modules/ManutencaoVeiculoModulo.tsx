import { useRef, useState } from "react";

import { rotuloDoVeiculo } from "@/components/modules/rotulo-veiculo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAccess } from "@/lib/access-context";
import { hojeLocal } from "@/lib/empregados";
import { useEmpresa } from "@/lib/empresa-context";
import { formatarData } from "@/lib/gemape";
import { useVeiculos } from "@/lib/hooks-gemape";
import { registrarManutencao, removerManutencao } from "@/lib/registros-veiculo";
import { useManutencoesVeiculo } from "@/lib/use-registros-veiculo";
import { executar, useParametrosBase } from "@/lib/use-parametros-base";

const MODO_DEMO = import.meta.env["VITE_DEMO_MODE"] !== "false";

// Módulos > Veículos > Manutenção (decisão 57): preventiva (uma ação de Parâmetros > Veículos >
// Ações de manutenção) ou corretiva (descrição do serviço), sempre com data e km. A última
// preventiva de cada ação alimenta as sugestões do extrato. Só modo demonstração.
export function ManutencaoVeiculoModulo() {
  const { empresaId } = useEmpresa();
  const { isAdmin } = useAccess();
  const parametros = useParametrosBase();
  const { data: veiculos = [] } = useVeiculos(empresaId);
  const todas = useManutencoesVeiculo();
  const [aberto, setAberto] = useState(false);
  const [veiculoId, setVeiculoId] = useState("");
  const [tipo, setTipo] = useState("Preventiva");
  const [acaoId, setAcaoId] = useState("");
  const trava = useRef(false);

  const acoes = parametros.acoesManutencaoVeiculo;
  const idsDaEmpresa = new Set(veiculos.map((v) => v.id));
  const lista = todas
    .filter((m) => idsDaEmpresa.has(m.veiculoId))
    .sort((a, b) => b.data.localeCompare(a.data) || b.km - a.km);

  if (!MODO_DEMO) {
    return <p className="text-sm text-muted-foreground">A manutenção de veículos estará disponível após a Fase 2 (banco real).</p>;
  }

  function abrir() {
    setVeiculoId("");
    setTipo("Preventiva");
    setAcaoId("");
    setAberto(true);
  }

  function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (trava.current) return;
    const f = new FormData(e.currentTarget);
    trava.current = true;
    const ok = executar(
      () =>
        registrarManutencao(
          { veiculoId, tipo, acaoId, data: String(f.get("data") ?? ""), km: String(f.get("km") ?? ""), descricao: String(f.get("descricao") ?? "") },
          undefined,
          new Date(),
          acoes.map((a) => a.id),
        ),
      "Manutenção registrada",
    );
    trava.current = false;
    if (ok) setAberto(false);
  }

  function excluir(id: string) {
    if (!confirm("Excluir esta manutenção?")) return;
    executar(() => removerManutencao(id), "Manutenção excluída");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted-foreground">{lista.length} manutenção(ões) registrada(s).</p>
        <Button requiresWrite className="ml-auto" onClick={abrir}>Nova manutenção</Button>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Veículo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Serviço</TableHead>
              <TableHead className="text-right">Km</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">Nenhuma manutenção registrada.</TableCell></TableRow>
            )}
            {lista.map((m) => {
              const v = veiculos.find((x) => x.id === m.veiculoId);
              const servico = m.acaoId ? (acoes.find((a) => a.id === m.acaoId)?.nome ?? "Ação removida de Parâmetros") : m.descricao;
              return (
                <TableRow key={m.id}>
                  <TableCell>{formatarData(m.data)}</TableCell>
                  <TableCell>{v ? rotuloDoVeiculo(parametros, v) : "—"}</TableCell>
                  <TableCell><Badge variant={m.tipo === "Preventiva" ? "secondary" : "outline"}>{m.tipo}</Badge></TableCell>
                  <TableCell>{servico}</TableCell>
                  <TableCell className="text-right">{m.km.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right">
                    {isAdmin && (
                      <Button requiresWrite variant="ghost" size="sm" aria-label="Excluir manutenção" className="text-destructive hover:text-destructive" onClick={() => excluir(m.id)}>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova manutenção</DialogTitle>
            <DialogDescription>Preventiva escolhe a ação de Parâmetros; corretiva descreve o serviço.</DialogDescription>
          </DialogHeader>
          <form onSubmit={salvar} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="veiculo">Veículo</Label>
              <Select value={veiculoId} onValueChange={setVeiculoId}>
                <SelectTrigger id="veiculo"><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
                <SelectContent>
                  {veiculos.map((v) => <SelectItem key={v.id} value={v.id}>{rotuloDoVeiculo(parametros, v)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger id="tipo"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Preventiva">Preventiva</SelectItem>
                  <SelectItem value="Corretiva">Corretiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="data">Data</Label>
              <Input id="data" name="data" type="date" defaultValue={hojeLocal()} max={hojeLocal()} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="km">Km do veículo</Label>
              <Input id="km" name="km" inputMode="numeric" placeholder="Ex.: 50.000" />
            </div>
            {tipo === "Preventiva" ? (
              <div className="space-y-1.5">
                <Label htmlFor="acao">Ação de manutenção</Label>
                <Select value={acaoId} onValueChange={setAcaoId}>
                  <SelectTrigger id="acao"><SelectValue placeholder="Selecione a ação" /></SelectTrigger>
                  <SelectContent>
                    {acoes.map((a) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                {acoes.length === 0 && (
                  <p className="text-xs text-muted-foreground">Cadastre as ações em Parâmetros &gt; Veículos &gt; Ações de manutenção.</p>
                )}
              </div>
            ) : (
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="descricao">Descrição do serviço</Label>
                <Textarea id="descricao" name="descricao" rows={2} maxLength={300} placeholder="Ex.: troca das pastilhas de freio dianteiras" />
              </div>
            )}
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
