import { rotuloDoVeiculo } from "@/components/modules/rotulo-veiculo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEmpresa } from "@/lib/empresa-context";
import { formatarData } from "@/lib/gemape";
import { useVeiculos } from "@/lib/hooks-gemape";
import type { Abastecimento } from "@/lib/registros-veiculo";
import { useAbastecimentos } from "@/lib/use-registros-veiculo";
import { useParametrosBase } from "@/lib/use-parametros-base";

const reais = (n: number | null | undefined) => (n === null || n === undefined ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));

// Dec 224: no card Abastecimento de Viagens, em vez de registrar de novo, escolhe um abastecimento que já está em Módulos > Veículos > Abastecimento.
export function EscolherAbastecimentoDialog({
  aberto, aoMudar, aoEscolher,
}: { aberto: boolean; aoMudar: (aberto: boolean) => void; aoEscolher: (registro: Abastecimento) => void }) {
  const { empresaId } = useEmpresa();
  const parametros = useParametrosBase();
  const { data: veiculos = [] } = useVeiculos(empresaId);
  const todos = useAbastecimentos();
  const porId = new Map(veiculos.map((v) => [v.id, v]));
  const lista = todos
    .filter((a) => porId.has(a.veiculoId))
    .sort((a, b) => `${b.data} ${b.hora ?? ""}`.localeCompare(`${a.data} ${a.hora ?? ""}`));

  return (
    <Dialog open={aberto} onOpenChange={aoMudar}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Abastecimentos registrados</DialogTitle>
          <DialogDescription>Escolha o abastecimento desta despesa; a data, o valor e os litros dele vêm para o card.</DialogDescription>
        </DialogHeader>
        {lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum abastecimento registrado. Use o Novo abastecimento.</p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {lista.map((a) => {
              const v = porId.get(a.veiculoId);
              return (
                <li key={a.id}>
                  <Button type="button" variant="outline" className="h-auto w-full justify-start whitespace-normal py-2 text-left" onClick={() => { aoMudar(false); aoEscolher(a); }}>
                    <span className="block text-sm">
                      <span className="block font-medium">{v ? rotuloDoVeiculo(parametros, v) : "Veículo"}</span>
                      <span className="block text-xs text-muted-foreground">
                        {formatarData(a.data)}{a.hora ? ` às ${a.hora}` : ""} · {a.km.toLocaleString("pt-BR")} km · {a.litros.toLocaleString("pt-BR")} L · {reais(a.valor)}
                      </span>
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
