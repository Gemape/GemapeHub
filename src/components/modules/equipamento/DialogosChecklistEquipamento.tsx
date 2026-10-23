import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AssociarEquipamento, ListaGrupos } from "@/components/parametros/ChecklistEquipamento";
import { FINALIDADES, type FinalidadeChecklist } from "@/lib/equipamentos-checklist";
import { EVENTO_REGISTROS_EQUIPAMENTO } from "@/lib/registros-equipamento";
import { useVersaoArmazenamento } from "@/lib/use-versao-armazenamento";

// Quem grava na janela avisa as telas do módulo (que leem o armazenamento) pelo mesmo evento dos registros de Equipamentos.
function useAvisoDeMudanca(): [number, () => void] {
  const [versao, mudou] = useVersaoArmazenamento();
  return [versao, () => { mudou(); window.dispatchEvent(new Event(EVENTO_REGISTROS_EQUIPAMENTO)); }];
}

function ConteudoAssociar({ finalidade, equipamentoId }: { finalidade: FinalidadeChecklist; equipamentoId: string }) {
  const [versao, aoMudar] = useAvisoDeMudanca();
  // Já abre o formulário (equipamento, responsável, periodicidade e itens), com o equipamento que estava escolhido no Novo check list.
  return <AssociarEquipamento finalidade={finalidade} versao={versao} aoMudar={aoMudar} abrirDireto={{ equipamentoId }} />;
}
function ConteudoItens({ finalidade }: { finalidade: FinalidadeChecklist }) {
  const [versao, aoMudar] = useAvisoDeMudanca();
  return <ListaGrupos finalidade={finalidade} nomeFinalidade={FINALIDADES.find((f) => f.id === finalidade)?.nome ?? ""} versao={versao} aoMudar={aoMudar} />;
}

// A tela "Associar itens de check list a um equipamento", a mesma de Parâmetros, numa janela aberta de dentro do Novo check list (como em Veículos). Deve ficar ao lado
// (nunca dentro) do diálogo do check list: assim o que já foi escolhido continua montado enquanto a associação é feita e salva.
export function DialogAssociarChecklistEquipamento({ aberto, onAbrirMudou, finalidade, equipamentoId = "" }: { aberto: boolean; onAbrirMudou: (aberto: boolean) => void; finalidade: FinalidadeChecklist; equipamentoId?: string }) {
  return (
    <Dialog open={aberto} onOpenChange={onAbrirMudou}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Associar itens de check list a um equipamento</DialogTitle>
          <DialogDescription>Associa grupos de itens, periodicidade e responsável ao equipamento. Ao fechar, o check list continua de onde parou.</DialogDescription>
        </DialogHeader>
        {aberto && <ConteudoAssociar finalidade={finalidade} equipamentoId={equipamentoId} />}
      </DialogContent>
    </Dialog>
  );
}

// A tela "Itens check list" de Parâmetros > Equipamentos, numa janela aberta de dentro do Novo check list avulso (como em Veículos).
export function DialogItensChecklistEquipamento({ aberto, onAbrirMudou, finalidade }: { aberto: boolean; onAbrirMudou: (aberto: boolean) => void; finalidade: FinalidadeChecklist }) {
  return (
    <Dialog open={aberto} onOpenChange={onAbrirMudou}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Itens check list</DialogTitle>
          <DialogDescription>Cadastra os grupos de itens do check list por tipo de equipamento. Ao fechar, o check list continua de onde parou.</DialogDescription>
        </DialogHeader>
        {aberto && <ConteudoItens finalidade={finalidade} />}
      </DialogContent>
    </Dialog>
  );
}
