import { useRef, useState } from "react";

import { rotuloDoVeiculo } from "@/components/modules/rotulo-veiculo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { horaBrasilia, hojeLocal } from "@/lib/empregados";
import { useEmpresa } from "@/lib/empresa-context";
import { ultimoAbastecimentoDoVeiculo } from "@/lib/extrato-veiculo";
import { formatarData } from "@/lib/gemape";
import { useVeiculos } from "@/lib/hooks-gemape";
import { registrarAbastecimento, type Abastecimento } from "@/lib/registros-veiculo";
import { useAbastecimentos } from "@/lib/use-registros-veiculo";
import { executar, useParametrosBase } from "@/lib/use-parametros-base";

const numero = (n: number) => n.toLocaleString("pt-BR");

// Janela "Novo abastecimento" de Módulos > Veículos > Abastecimento (decisão 58): escolhe o veículo (já vem com o km do último
// abastecimento), informa data, hora, km (nunca menor que o anterior), litros e valor em reais. É usada na tela do módulo e no card
// Abastecimento de Viagens (dec 223), que só aproveita a data e o valor do registro gravado. Só modo demonstração; nada no Supabase.
export function NovoAbastecimentoDialog({
  aberto, aoMudar, aoSalvar,
}: { aberto: boolean; aoMudar: (aberto: boolean) => void; aoSalvar: (registro: Abastecimento) => void }) {
  const { empresaId } = useEmpresa();
  const parametros = useParametrosBase();
  const { data: veiculos = [] } = useVeiculos(empresaId);
  const todos = useAbastecimentos();
  const [veiculoId, setVeiculoId] = useState("");
  const [km, setKm] = useState("");
  const trava = useRef(false);

  const idsDaEmpresa = new Set(veiculos.map((v) => v.id));
  const daEmpresa = todos.filter((a) => idsDaEmpresa.has(a.veiculoId));
  const ultimo = veiculoId ? ultimoAbastecimentoDoVeiculo(daEmpresa, veiculoId) : null;

  // Cada abertura recomeça vazia.
  function mudar(valor: boolean) {
    if (valor) { setVeiculoId(""); setKm(""); }
    aoMudar(valor);
  }

  // Ao escolher o veículo, o km já vem com o do último abastecimento informado.
  function escolherVeiculo(id: string) {
    setVeiculoId(id);
    const anterior = ultimoAbastecimentoDoVeiculo(daEmpresa, id);
    setKm(anterior ? String(anterior.km) : "");
  }

  function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (trava.current) return;
    const f = new FormData(e.currentTarget);
    trava.current = true;
    let gravado: Abastecimento | null = null;
    const ok = executar(
      () => {
        gravado = registrarAbastecimento({
          veiculoId,
          data: String(f.get("data") ?? ""),
          hora: String(f.get("hora") ?? ""),
          km,
          litros: String(f.get("litros") ?? ""),
          valor: String(f.get("valor") ?? ""),
        });
      },
      "Abastecimento registrado",
    );
    // Depois de gravar, a trava fica um instante: o diálogo ainda está na tela na animação de saída.
    if (ok) window.setTimeout(() => { trava.current = false; }, 800);
    else trava.current = false;
    if (ok && gravado) {
      aoMudar(false);
      aoSalvar(gravado);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={mudar}>
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
            <Input id="hora" name="hora" type="time" defaultValue={horaBrasilia()} />
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
            <Button type="button" variant="outline" onClick={() => aoMudar(false)}>Cancelar</Button>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
