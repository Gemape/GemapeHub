import { X } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { combinaBusca } from "@/lib/parametros-base";
import { cn } from "@/lib/utils";

export type OpcaoBusca = { valor: string; rotulo: string; detalhe?: string };

type Props = {
  id: string;
  opcoes: OpcaoBusca[];
  valor: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  vazio?: string;
};

// Campo com busca por palavra-chave: digita, escolhe na lista e o item fica selecionado.
// Só aceita opções já cadastradas.
export function CampoBusca({
  id,
  opcoes,
  valor,
  onChange,
  placeholder,
  vazio = "Nada encontrado.",
}: Props) {
  const [termo, setTermo] = useState("");
  const [aberto, setAberto] = useState(false);
  const listaId = useId();
  const selecionada = opcoes.find((o) => o.valor === valor);
  const encontradas = opcoes.filter((o) => combinaBusca(termo, o.rotulo, o.detalhe)).slice(0, 8);

  if (selecionada) {
    return (
      <div className="flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-muted/40 px-3 text-sm">
        <span className="min-w-0 truncate">
          {selecionada.rotulo}
          {selecionada.detalhe && (
            <span className="text-muted-foreground"> · {selecionada.detalhe}</span>
          )}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          aria-label="Trocar seleção"
          onClick={() => {
            onChange("");
            setTermo("");
            setAberto(true);
          }}
        >
          <X className="size-4" /> Trocar
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        id={id}
        role="combobox"
        aria-expanded={aberto}
        aria-controls={listaId}
        autoComplete="off"
        placeholder={placeholder}
        value={termo}
        onChange={(e) => {
          setTermo(e.target.value);
          setAberto(true);
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            // Com o campo vazio, Enter não escolhe nada (evita selecionar um item qualquer).
            if (termo.trim() && encontradas[0]) onChange(encontradas[0].valor);
          }
          if (e.key === "Escape") setAberto(false);
        }}
      />
      {aberto && (
        <ul
          id={listaId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover shadow-md"
        >
          {encontradas.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">{vazio}</li>
          )}
          {encontradas.map((o, i) => (
            <li key={o.valor} role="option" aria-selected={false}>
              <button
                type="button"
                className={cn(
                  "w-full px-3 py-1.5 text-left text-sm hover:bg-muted",
                  i === 0 && termo && "bg-muted/60",
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onChange(o.valor)}
              >
                {o.rotulo}
                {o.detalhe && (
                  <span className="block text-xs text-muted-foreground">{o.detalhe}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
