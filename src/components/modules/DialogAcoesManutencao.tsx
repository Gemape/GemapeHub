import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { AcoesManutencaoVeiculoLista } from "@/components/parametros/VeiculosListasParametros";

// A tela "Ações de manutenção", a mesma do menu Parâmetros > Veículos > Manutenção, numa janela aberta de dentro do
// Cadastrar nova manutenção (decisão 162). Deve ficar ao lado (nunca dentro) do diálogo da manutenção: assim o que
// já foi preenchido continua montado enquanto os grupos e as ações são cadastrados.
export function DialogAcoesManutencao({ aberto, onAbrirMudou }: { aberto: boolean; onAbrirMudou: (aberto: boolean) => void }) {
  return (
    <Dialog open={aberto} onOpenChange={onAbrirMudou}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Ações de manutenção</DialogTitle>
          <DialogDescription>Cadastra os grupos de ações (pai) e suas ações (filhos). Ao fechar, a manutenção continua de onde parou.</DialogDescription>
        </DialogHeader>
        <AcoesManutencaoVeiculoLista />
      </DialogContent>
    </Dialog>
  );
}
