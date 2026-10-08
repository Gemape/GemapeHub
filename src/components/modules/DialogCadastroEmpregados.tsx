import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { EmpregadosCadastroModulo } from "@/components/modules/EmpregadosCadastroModulo";

// A tela de Empregados numa janela aberta de dentro de Associar itens de check list (decisão 120), para cadastrar o
// responsável. Deve ficar ao lado (nunca dentro) do diálogo da associação: assim o que já foi escolhido continua montado.
export function DialogCadastroEmpregados({ aberto, onAbrirMudou }: { aberto: boolean; onAbrirMudou: (aberto: boolean) => void }) {
  return (
    <Dialog open={aberto} onOpenChange={onAbrirMudou}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Empregados</DialogTitle>
          <DialogDescription>Cadastre ou ajuste o empregado e feche a janela: a associação continua de onde parou.</DialogDescription>
        </DialogHeader>
        <EmpregadosCadastroModulo />
      </DialogContent>
    </Dialog>
  );
}
