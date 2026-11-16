import { SearchX, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";

// Busca sem resultado nunca termina num beco sem saída: oferece "Você quis dizer …?" e, quando há como, o cadastro novo já com o texto digitado.
export function SemResultadoBusca({ termo, sugestao, aoSugerir, rotuloCadastro, aoCadastrar }: {
  termo: string; sugestao?: string | undefined; aoSugerir?: (nome: string) => void; rotuloCadastro?: string; aoCadastrar?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-6 text-center text-sm" role="status">
      <SearchX className="size-6 text-muted-foreground" aria-hidden="true" />
      <p className="text-muted-foreground">Nada encontrado para “{termo.trim()}”.</p>
      {sugestao && aoSugerir && (
        <p>Você quis dizer{" "}
          <button type="button" onClick={() => aoSugerir(sugestao)} className="font-medium text-primary underline underline-offset-2">{sugestao}</button>?
        </p>
      )}
      {rotuloCadastro && aoCadastrar && (
        <Button type="button" size="sm" requiresWrite onClick={aoCadastrar}><UserPlus className="size-4" aria-hidden="true" />{rotuloCadastro}</Button>
      )}
    </div>
  );
}
