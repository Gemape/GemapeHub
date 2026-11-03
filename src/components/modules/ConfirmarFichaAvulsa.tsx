import { Link } from "@tanstack/react-router";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Confirmação ao gerar a Ficha de EPI Avulsa (texto do responsável): a ficha é só para itens de consumo corriqueiro; itens de maior custo e durabilidade vão pelo Termo de Entrega,
// e o caminho é um link que abre essa rotina. Sim gera a ficha; Não (ou fechar) volta à tela sem gerar.
export function ConfirmarFichaAvulsa({ aberto, onSim, onNao }: { aberto: boolean; onSim: () => void; onNao: () => void }) {
  return (
    <AlertDialog open={aberto} onOpenChange={(v) => !v && onNao()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Gerar a ficha avulsa?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                A ficha avulsa de entrega de EPI se destina exclusivamente para o registro manual de itens de consumo corriqueiro, como máscaras e luvas. Caso deseje entregar itens de maior
                custo e durabilidade, como botinas, capacetes, óculos, entre outros, utilize a rotina{" "}
                <Link
                  to="/epi"
                  search={{ aba: "termo-entrega" } as never}
                  onClick={onNao}
                  className="font-medium text-primary underline underline-offset-2"
                >
                  {"EPIs >> módulo >> termo de entrega"}
                </Link>
                .
              </p>
              <p>Deseja confirmar a geração da Ficha avulsa de entrega de EPI?</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Não</AlertDialogCancel>
          <AlertDialogAction onClick={onSim}>Sim</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
