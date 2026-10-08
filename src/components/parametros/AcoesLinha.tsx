import { Button } from "@/components/ui/button";
import { useAccess } from "@/lib/access-context";

// Botões padrão das listas de Parâmetros (decisão 45): Clonar, Editar e Excluir, sempre nesta
// ordem. Excluir é só do Administrador. Cada lista passa só as ações que tem.
export function AcoesLinha({
  rotulo,
  onClonar,
  onEditar,
  onExcluir,
  editarLivre = false,
}: {
  rotulo: string;
  onClonar?: () => void;
  onEditar?: () => void;
  onExcluir?: () => void;
  // Quem só lê também pode abrir o registro (a gravação continua exigindo permissão no formulário).
  editarLivre?: boolean;
}) {
  const { isAdmin } = useAccess();
  return (
    <div className="flex justify-end gap-1">
      {onClonar && (
        <Button requiresWrite variant="ghost" size="sm" aria-label={`Clonar ${rotulo}`} onClick={onClonar}>
          Clonar
        </Button>
      )}
      {onEditar && (
        <Button requiresWrite={!editarLivre} variant="ghost" size="sm" aria-label={`Editar ${rotulo}`} onClick={onEditar}>
          Editar
        </Button>
      )}
      {onExcluir && isAdmin && (
        <Button requiresWrite variant="ghost" size="sm" aria-label={`Excluir ${rotulo}`} className="text-destructive hover:text-destructive" onClick={onExcluir}>
          Excluir
        </Button>
      )}
    </div>
  );
}
