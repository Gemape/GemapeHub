import { rotuloDoVeiculo } from "@/components/modules/rotulo-veiculo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEmpresa } from "@/lib/empresa-context";
import { formatarData } from "@/lib/gemape";
import { useVeiculos } from "@/lib/hooks-gemape";
import { resumoManutencao, type ManutencaoVeiculo } from "@/lib/registros-veiculo";
import { useManutencoesVeiculo } from "@/lib/use-registros-veiculo";
import { useParametrosBase } from "@/lib/use-parametros-base";

const reais = (n: number | null | undefined) => (n === null || n === undefined ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));

// Dec 226: no card Manutenção do veículo de trabalho de Viagens, em vez de registrar de novo, escolhe uma manutenção que já está em Módulos > Veículos > Manutenção.
export function EscolherManutencaoDialog({
  aberto, aoMudar, aoEscolher,
}: { aberto: boolean; aoMudar: (aberto: boolean) => void; aoEscolher: (registro: ManutencaoVeiculo, servico: string) => void }) {
  const { empresaId } = useEmpresa();
  const parametros = useParametrosBase();
  const { data: veiculos = [] } = useVeiculos(empresaId);
  const todas = useManutencoesVeiculo();
  const porId = new Map(veiculos.map((v) => [v.id, v]));
  const servicoDe = (m: ManutencaoVeiculo) => resumoManutencao(m, (id) => parametros.acoesManutencaoVeiculo.find((a) => a.id === id)?.nome);
  const lista = todas.filter((m) => porId.has(m.veiculoId)).sort((a, b) => b.data.localeCompare(a.data) || b.km - a.km);

  return (
    <Dialog open={aberto} onOpenChange={aoMudar}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manutenções registradas</DialogTitle>
          <DialogDescription>Escolha a manutenção desta despesa; a data, o detalhamento e o custo total dela vêm para o card.</DialogDescription>
        </DialogHeader>
        {lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma manutenção registrada. Use a Nova manutenção.</p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {lista.map((m) => {
              const v = porId.get(m.veiculoId);
              return (
                <li key={m.id}>
                  <Button type="button" variant="outline" className="h-auto w-full justify-start whitespace-normal py-2 text-left" onClick={() => { aoMudar(false); aoEscolher(m, servicoDe(m)); }}>
                    <span className="block text-sm">
                      <span className="block font-medium">{v ? rotuloDoVeiculo(parametros, v) : "Veículo"}</span>
                      <span className="block text-xs text-muted-foreground">{formatarData(m.data)} · {m.tipo} · {reais(m.custoTotal)}</span>
                      <span className="block text-xs text-muted-foreground">{servicoDe(m)}</span>
                    </span>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
