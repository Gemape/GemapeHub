import { CircleHelp } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Ícone (?) ao lado de um termo técnico: abre uma frase simples dizendo quando usar. Popover (e não só tooltip) para funcionar também no toque.
export function AjudaTermo({ termo, children }: { termo: string; children: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`O que é: ${termo}`} className="inline-flex size-5 shrink-0 items-center justify-center rounded-full align-middle text-muted-foreground transition-colors hover:text-primary focus-visible:text-primary">
          <CircleHelp className="size-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 text-sm" side="top">
        <p className="mb-1 font-semibold">{termo}</p>
        <p className="text-muted-foreground">{children}</p>
      </PopoverContent>
    </Popover>
  );
}
