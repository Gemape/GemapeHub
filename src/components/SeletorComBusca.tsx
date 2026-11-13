import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { combinaBuscaTolerante } from "@/lib/busca-tolerante";

// Lista com busca ao digitar (código ou nome): o valor escolhido vai num campo oculto, para o formulário enviar como os demais.
export function SeletorComBusca({ id, nome, valor, opcoes, onChange }: { id: string; nome: string; valor: string; opcoes: { id: string; rotulo: string }[]; onChange: (id: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const escolhido = opcoes.find((o) => o.id === valor);
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <input type="hidden" name={nome} value={valor} />
      <PopoverTrigger asChild>
        <button id={id} type="button" role="combobox" aria-expanded={aberto} className="flex h-9 w-full cursor-pointer items-center justify-between rounded-md border border-input bg-white/60 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring dark:bg-white/5">
          <span className={`truncate ${escolhido ? "" : "text-muted-foreground"}`}>{escolhido?.rotulo ?? "Selecione"}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        {/* O valor do item é o id (único, mesmo com rótulos iguais); o filtro padrão compararia também o id, então a busca olha só o rótulo. */}
        <Command filter={(_valor, busca, rotulos) => (combinaBuscaTolerante(busca, ...(rotulos ?? [])) ? 1 : 0)}>
          <CommandInput placeholder="Digite para buscar…" />
          <CommandList>
            <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
            <CommandGroup>
              {opcoes.map((o) => (
                <CommandItem key={o.id} value={o.id} keywords={[o.rotulo]} onSelect={() => { onChange(o.id); setAberto(false); }}>
                  <Check className={`mr-2 h-4 w-4 ${o.id === valor ? "opacity-100" : "opacity-0"}`} />
                  {o.rotulo}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
