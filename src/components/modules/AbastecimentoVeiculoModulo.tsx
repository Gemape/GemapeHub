import { useMemo, useRef, useState } from "react";

import { rotuloDoVeiculo } from "@/components/modules/rotulo-veiculo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAccess } from "@/lib/access-context";
import { hojeLocal } from "@/lib/empregados";
import { useEmpresa } from "@/lib/empresa-context";
import { historicoAbastecimentos, mediaKmPorLitro, ultimoAbastecimentoDoVeiculo } from "@/lib/extrato-veiculo";
import { formatarData } from "@/lib/gemape";
import { useVeiculos } from "@/lib/hooks-gemape";
import { combinaBusca } from "@/lib/parametros-base";
import { registrarAbastecimento, removerAbastecimento } from "@/lib/registros-veiculo";
import { useAbastecimentos } from "@/lib/use-registros-veiculo";
import { executar, useParametrosBase } from "@/lib/use-parametros-base";

const MODO_DEMO = import.meta.env["VITE_DEMO_MODE"] !== "false";
const TODOS = "todos";

const reais = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const numero = (n: number) => n.toLocaleString("pt-BR");
const horaAgora = () => `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;

// Módulos > Veículos > Abastecimento (decisão 58): escolhe o veículo (a tela já traz o km do
// último abastecimento), informa data, hora, km (nunca menor que o anterior), litros e valor em
// reais. O histórico por veículo mostra o trecho rodado, o km/L e o R$/L de cada abastecimento.
// Só modo demonstração; nada no Supabase.
export function AbastecimentoVeiculoModulo() {
  const { empresaId } = useEmpresa();
  const { isAdmin } = useAccess();
  const parametros = useParametrosBase();
  const { data: veiculos = [] } = useVeiculos(empresaId);
  const todos = useAbastecimentos();
  const [aberto, setAberto] = useState(false);
  const [veiculoId, setVeiculoId] = useState("");
  const [km, setKm] = useState("");
  const [filtro, setFiltro] = useState(TODOS);
  const [busca, setBusca] = useState("");
  const trava = useRef(false);

  const idsDaEmpresa = new Set(veiculos.map((v) => v.id));
  const daEmpresa = todos.filter((a) => idsDaEmpresa.has(a.veiculoId));
  const veiculo = (id: string) => veiculos.find((v) => v.id === id);
  const filtroValido = filtro === TODOS || idsDaEmpresa.has(filtro) ? filtro : TODOS;

  // Histórico de cada veículo (o trecho só faz sentido dentro do mesmo veículo), do mais recente ao mais antigo.
  const linhas = useMemo(
    () =>
      veiculos
        .filter((v) => filtroValido === TODOS || v.id === filtroValido)
        .flatMap((v) => historicoAbastecimentos(daEmpresa.filter((a) => a.veiculoId === v.id)))
        .filter((a) => {
          const v = veiculos.find((x) => x.id === a.veiculoId);
          return combinaBusca(busca, v ? rotuloDoVeiculo(parametros, v) : "", formatarData(a.data), a.hora, String(a.km), numero(a.km), String(a.litros), a.litros.toLocaleString("pt-BR"), a.valor ? `${a.valor} ${reais(a.valor)}` : "");
        })
        .sort((a, b) => `${b.data}T${b.hora ?? "00:00"}`.localeCompare(`${a.data}T${a.hora ?? "00:00"}`) || b.km - a.km),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [veiculos, todos, filtroValido, busca, parametros],
  );
  const doFiltro = filtroValido === TODOS ? null : veiculo(filtroValido);
  const resumo = doFiltro
    ? {
        litros: linhas.reduce((s, a) => s + a.litros, 0),
        gasto: linhas.reduce((s, a) => s + (a.valor ?? 0), 0),
        // A média usa o histórico inteiro do veículo; litros e gasto seguem a busca.
        media: mediaKmPorLitro(daEmpresa.filter((a) => a.veiculoId === doFiltro.id)),
      }
    : null;
  const ultimo = veiculoId ? ultimoAbastecimentoDoVeiculo(daEmpresa, veiculoId) : null;

  if (!MODO_DEMO) {
    return <p className="text-sm text-muted-foreground">O abastecimento de veículos estará disponível após a Fase 2 (banco real).</p>;
  }

  function abrir() {
    setVeiculoId("");
    setKm("");
    setAberto(true);
  }

  // Ao escolher o veículo, o km já vem com o do último abastecimento informado.
  function escolherVeiculo(id: string) {
    setVeiculoId(id);
    const anterior = ultimoAbastecimentoDoVeiculo(daEmpresa, id);
    setKm(anterior ? String(anterior.km) : "");
  }

  function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (trava.current) return;
    const f = new FormData(e.currentTarget);
    trava.current = true;
    const ok = executar(
      () =>
        registrarAbastecimento({
          veiculoId,
          data: String(f.get("data") ?? ""),
          hora: String(f.get("hora") ?? ""),
          km,
          litros: String(f.get("litros") ?? ""),
          valor: String(f.get("valor") ?? ""),
        }),
      "Abastecimento registrado",
    );
    trava.current = false;
    if (ok) {
      setAberto(false);
      setFiltro(veiculoId);
    }
  }

  function excluir(id: string) {
    if (!confirm("Excluir este abastecimento?")) return;
    executar(() => removerAbastecimento(id), "Abastecimento excluído");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="filtro_veiculo">Histórico por veículo</Label>
          <Select value={filtroValido} onValueChange={setFiltro}>
            <SelectTrigger id="filtro_veiculo" className="w-80 max-w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos os veículos</SelectItem>
              {veiculos.map((v) => <SelectItem key={v.id} value={v.id}>{rotuloDoVeiculo(parametros, v)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Input
          aria-label="Buscar abastecimento"
          placeholder="Buscar por veículo, data ou km"
          className="max-w-xs"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <Button requiresWrite className="ml-auto" onClick={abrir}>Novo abastecimento</Button>
      </div>

      {resumo && (
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Abastecimentos</p><p className="text-lg font-semibold">{linhas.length}</p></div>
          <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Litros</p><p className="text-lg font-semibold">{resumo.litros.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</p></div>
          <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Total gasto</p><p className="text-lg font-semibold">{reais(resumo.gasto)}</p></div>
          <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Média de consumo</p><p className="text-lg font-semibold">{resumo.media === null ? "—" : `${resumo.media.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km/L`}</p></div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data e hora</TableHead>
              {!doFiltro && <TableHead>Veículo</TableHead>}
              <TableHead className="text-right">Km</TableHead>
              <TableHead className="text-right">Km rodados</TableHead>
              <TableHead className="text-right">Litros</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">R$/L</TableHead>
              <TableHead className="text-right">Km/L</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 && (
              <TableRow><TableCell colSpan={doFiltro ? 8 : 9} className="py-6 text-center text-muted-foreground">{busca.trim() ? "Nenhum resultado para a busca." : "Nenhum abastecimento registrado."}</TableCell></TableRow>
            )}
            {linhas.map((a) => {
              const v = veiculo(a.veiculoId);
              return (
                <TableRow key={a.id}>
                  <TableCell>{formatarData(a.data)}{a.hora ? ` ${a.hora}` : ""}</TableCell>
                  {!doFiltro && <TableCell>{v ? rotuloDoVeiculo(parametros, v) : "—"}</TableCell>}
                  <TableCell className="text-right">{numero(a.km)}</TableCell>
                  <TableCell className="text-right">{a.kmRodados === null ? "—" : numero(a.kmRodados)}</TableCell>
                  <TableCell className="text-right">{a.litros.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right">{reais(a.valor)}</TableCell>
                  <TableCell className="text-right">{reais(a.precoLitro)}</TableCell>
                  <TableCell className="text-right">{a.kmPorLitro === null ? "—" : a.kmPorLitro.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</TableCell>
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo abastecimento</DialogTitle>
            <DialogDescription>O km não pode ser menor que o do abastecimento anterior do mesmo veículo.</DialogDescription>
          </DialogHeader>
          <form onSubmit={salvar} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="veiculo">Veículo</Label>
              <Select value={veiculoId} onValueChange={escolherVeiculo}>
                <SelectTrigger id="veiculo"><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
                <SelectContent>
                  {veiculos.map((v) => <SelectItem key={v.id} value={v.id}>{rotuloDoVeiculo(parametros, v)}</SelectItem>)}
                </SelectContent>
              </Select>
              {veiculoId && (
                <p className="text-xs text-muted-foreground">
                  {ultimo
                    ? `Último abastecimento: ${numero(ultimo.km)} km em ${formatarData(ultimo.data)}${ultimo.hora ? ` às ${ultimo.hora}` : ""}.`
                    : "Primeiro abastecimento deste veículo."}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="data">Data</Label>
              <Input id="data" name="data" type="date" defaultValue={hojeLocal()} max={hojeLocal()} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hora">Hora</Label>
              <Input id="hora" name="hora" type="time" defaultValue={horaAgora()} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="km">Km no abastecimento</Label>
              <Input id="km" inputMode="numeric" placeholder="Ex.: 50.000" value={km} onChange={(e) => setKm(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="litros">Litros abastecidos</Label>
              <Input id="litros" name="litros" inputMode="decimal" placeholder="Ex.: 40,5" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="valor">Valor abastecido (R$)</Label>
              <Input id="valor" name="valor" inputMode="decimal" placeholder="Ex.: 250,00" />
            </div>
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
