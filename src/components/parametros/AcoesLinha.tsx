import { MoreVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAccess } from "@/lib/access-context";

type Acao = { rotulo: "Clonar" | "Editar" | "Excluir"; fazer: () => void; perigo?: boolean };

// Ações padrão das listas (decisão 45): Clonar, Editar e Excluir, sempre nesta ordem. Excluir é só do Administrador.
// Menos ruído na linha: só a ação principal (Editar) fica à vista; as raras (Clonar, Excluir) vão para o menu ⋮.
// Com uma ação só, ela fica à vista como botão. Cada lista passa só as ações que tem.
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
  const { canWrite, canDelete } = useAccess();
  // Mesma regra de permissão dos botões (requiresWrite): sem permissão, a ação nem aparece.
  const acoes: Acao[] = [
    ...(onClonar && canWrite ? [{ rotulo: "Clonar" as const, fazer: onClonar }] : []),
    ...(onEditar && (editarLivre || canWrite) ? [{ rotulo: "Editar" as const, fazer: onEditar }] : []),
    ...(onExcluir && canDelete && canWrite ? [{ rotulo: "Excluir" as const, fazer: onExcluir, perigo: true }] : []),
  ];
  if (acoes.length === 0) return null;
  const principal = acoes.find((a) => a.rotulo === "Editar") ?? acoes[0]!;
  const noMenu = acoes.filter((a) => a !== principal);
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost" size="sm" aria-label={`${principal.rotulo} ${rotulo}`} onClick={principal.fazer}
        className={principal.perigo ? "text-destructive hover:text-destructive" : undefined}
      >
        {principal.rotulo}
      </Button>
      {noMenu.length > 0 && (
        // modal={false}: a confirmação de Excluir abre por cima sem o menu travar o foco da página.
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="px-2 max-sm:min-w-11" aria-label={`Mais ações de ${rotulo}`} title="Mais ações">
              <MoreVertical className="size-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {noMenu.map((a) => (
              <DropdownMenuItem
                key={a.rotulo} aria-label={`${a.rotulo} ${rotulo}`} onSelect={a.fazer}
                className={a.perigo ? "text-destructive focus:text-destructive" : undefined}
              >
                {a.rotulo}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
