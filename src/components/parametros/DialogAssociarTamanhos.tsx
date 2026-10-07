import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { TamanhosMedidasUnificado } from "@/components/parametros/TamanhosMedidasUnificado";

// A tela de Tamanho e Medidas de Produto, a mesma do menu (cadastro e associação juntos, decisão 89), numa janela aberta de dentro
// do cadastro de EPI (decisão 87). Deve ficar ao lado (nunca dentro) do diálogo do cadastro: assim o formulário
// continua montado, com tudo o que foi preenchido, enquanto a associação é feita e salva.
export function DialogAssociarTamanhos({ aberto, onAbrirMudou, de }: { aberto: boolean; onAbrirMudou: (aberto: boolean) => void; de: "epi" | "uniformes" }) {
  return (
    <Dialog open={aberto} onOpenChange={onAbrirMudou}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Tamanho e Medidas de Produto</DialogTitle>
          <DialogDescription>Associa tamanhos e medidas à subcategoria. Ao fechar, o cadastro continua de onde parou.</DialogDescription>
        </DialogHeader>
        <TamanhosMedidasUnificado de={de} emJanela />
      </DialogContent>
    </Dialog>
  );
}
