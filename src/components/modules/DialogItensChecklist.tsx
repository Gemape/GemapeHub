import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ChecklistVeiculoLista } from "@/components/parametros/VeiculosListasParametros";

// A tela "Itens check list", a mesma do menu Parâmetros > Veículos, numa janela aberta de dentro do Novo check list
// avulso (decisão 95). Deve ficar ao lado (nunca dentro) do diálogo do check list: assim o que já foi escolhido
// continua montado enquanto os itens são cadastrados e salvos.
export function DialogItensChecklist({ aberto, onAbrirMudou }: { aberto: boolean; onAbrirMudou: (aberto: boolean) => void }) {
  return (
    <Dialog open={aberto} onOpenChange={onAbrirMudou}>
      <DialogContent telaCheia className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Itens check list</DialogTitle>
          <DialogDescription>Cadastra os grupos de itens do check list por tipo de veículo. Ao fechar, o check list continua de onde parou.</DialogDescription>
        </DialogHeader>
        <ChecklistVeiculoLista />
      </DialogContent>
    </Dialog>
  );
}
