import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { AssociarTamanhosPainel } from "@/components/parametros/AssociarTamanhosPainel";

// A rotina de Tamanho e Medidas de Produto > Associar ao produto, a mesma tela do menu, numa janela aberta de dentro
// do cadastro de EPI (decisão 87). Deve ficar ao lado (nunca dentro) do diálogo do cadastro: assim o formulário
// continua montado, com tudo o que foi preenchido, enquanto a associação é feita e salva.
export function DialogAssociarTamanhos({ aberto, onAbrirMudou }: { aberto: boolean; onAbrirMudou: (aberto: boolean) => void }) {
  return (
    <Dialog open={aberto} onOpenChange={onAbrirMudou}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Tamanho e Medidas de Produto: associar ao produto</DialogTitle>
          <DialogDescription>Associa tamanhos e medidas à subcategoria. Ao fechar, o cadastro continua de onde parou.</DialogDescription>
        </DialogHeader>
        <AssociarTamanhosPainel />
      </DialogContent>
    </Dialog>
  );
}
