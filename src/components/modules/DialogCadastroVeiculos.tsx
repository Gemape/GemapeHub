import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { VeiculosCadastroModulo } from "@/components/modules/VeiculosCadastroModulo";

// A tela de Cadastro de Veículos numa janela aberta de dentro do Novo check list (decisão 92). Deve ficar ao lado
// (nunca dentro) do diálogo do check list: assim o que já foi escolhido continua montado enquanto o veículo é cadastrado.
export function DialogCadastroVeiculos({ aberto, onAbrirMudou }: { aberto: boolean; onAbrirMudou: (aberto: boolean) => void }) {
  return (
    <Dialog open={aberto} onOpenChange={onAbrirMudou}>
      <DialogContent telaCheia className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Cadastro de Veículos</DialogTitle>
          <DialogDescription>Preencha o novo veículo e salve ou cancele: o check list continua de onde parou.</DialogDescription>
        </DialogHeader>
        {aberto && <VeiculosCadastroModulo direto aoConcluir={() => onAbrirMudou(false)} />}
      </DialogContent>
    </Dialog>
  );
}
