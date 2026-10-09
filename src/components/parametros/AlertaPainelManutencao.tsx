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

export const TEXTO_ALERTA_PAINEL = "As alterações feitas modificarão o painel de manutenções na rotina de parâmetros. Definitivamente. Tem certeza que deseja fazer isso?";

/** Alerta de salvamento das Ações de manutenção (decisões 145 e 146): Sim grava, Não volta para a janela sem gravar. */
export function AlertaPainelManutencao({
  aberto,
  detalhe,
  onSim,
  onNao,
}: {
  aberto: boolean;
  detalhe?: string | undefined;
  onSim: () => void;
  onNao: () => void;
}) {
  return (
    <AlertDialog open={aberto} onOpenChange={(v) => !v && onNao()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Salvar alterações?</AlertDialogTitle>
          <AlertDialogDescription>
            {TEXTO_ALERTA_PAINEL}
            {detalhe && <span className="mt-2 block">{detalhe}</span>}
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
