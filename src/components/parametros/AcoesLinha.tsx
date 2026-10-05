import { Button } from "@/components/ui/button";
import { useAccess } from "@/lib/access-context";

// Botões padrão das listas de Parâmetros (decisão 45): Clonar, Editar e Excluir, sempre nesta
// ordem. Excluir é só do Administrador. Cada lista passa só as ações que tem.
export function AcoesLinha({
  rotulo,
  onClonar,
  onEditar,
  onExcluir,
}: {
  rotulo: string;
  onClonar?: () => void;
  onEditar?: () => void;
  onExcluir?: () => void;
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
        <Button requiresWrite variant="ghost" size="sm" aria-label={`Editar ${rotulo}`} onClick={onEditar}>
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
