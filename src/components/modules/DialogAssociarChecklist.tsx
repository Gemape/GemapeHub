import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { AssociarChecklistVeiculo } from "@/components/parametros/AssociarChecklistVeiculo";

// A tela "Associar itens de check list a um veículo", a mesma do menu Parâmetros, numa janela aberta de dentro do Novo
// check list (decisão 93). Deve ficar ao lado (nunca dentro) do diálogo do check list: assim o que já foi escolhido
// continua montado enquanto a associação é feita e salva.
export function DialogAssociarChecklist({ aberto, onAbrirMudou }: { aberto: boolean; onAbrirMudou: (aberto: boolean) => void }) {
  return (
    <Dialog open={aberto} onOpenChange={onAbrirMudou}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Associar itens de check list a um veículo</DialogTitle>
          <DialogDescription>Associa grupos de itens, periodicidade e responsável ao veículo. Ao fechar, o check list continua de onde parou.</DialogDescription>
        </DialogHeader>
        <AssociarChecklistVeiculo />
      </DialogContent>
    </Dialog>
  );
}
