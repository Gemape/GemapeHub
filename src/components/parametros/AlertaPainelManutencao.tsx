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
  texto = TEXTO_ALERTA_PAINEL,
  onSim,
  onNao,
}: {
  aberto: boolean;
  detalhe?: string | undefined;
  texto?: string;
  onSim: () => void;
  onNao: () => void;
}) {
  return (
    <AlertDialog open={aberto} onOpenChange={(v) => !v && onNao()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Salvar alterações?</AlertDialogTitle>
          <AlertDialogDescription>
            {texto}
            {detalhe && <span className="mt-2 block">{detalhe}</span>}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar sem salvar</AlertDialogCancel>
          <AlertDialogAction onClick={onSim}>Salvar no painel de manutenções</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
