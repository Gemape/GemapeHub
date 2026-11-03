import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_MOTIVOS } from "@/lib/epi-parametros";

// Lista de motivos que a pessoa cadastra: acrescentar, tirar e salvar.
export function CartaoDeMotivos({
  id,
  titulo,
  ajuda,
  inicial,
  salvar,
  singular = "motivo",
  salvos: mensagemSalvos,
}: {
  singular?: string;
  salvos?: string;
  id: string;
  titulo: string;
  ajuda: string;
  inicial: string[];
  salvar: (motivos: string[]) => string[];
}) {
  const [salvos, setSalvos] = useState(inicial);
  const [lista, setLista] = useState(inicial);
  const [novo, setNovo] = useState("");
  const igual = lista.length === salvos.length && lista.every((m, i) => m === salvos[i]);

  function acrescentar() {
    const texto = novo.trim().replace(/\s+/g, " ");
    if (!texto) return;
    if (lista.some((m) => m.toLocaleLowerCase("pt-BR") === texto.toLocaleLowerCase("pt-BR"))) {
      toast.error(`Este ${singular} já está na lista.`);
      return;
    }
    if (lista.length >= MAX_MOTIVOS) {
      toast.error(`No máximo ${MAX_MOTIVOS} ${singular === "motivo" ? "motivos" : "áreas"}.`);
      return;
    }
    setLista([...lista, texto]);
    setNovo("");
  }
  function gravar() {
    try {
      const gravada = salvar(lista);
      setSalvos(gravada);
      setLista(gravada);
      toast.success(mensagemSalvos ?? `${titulo} salvos.`);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar.");
    }
  }
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div>
        <h3 className="text-sm font-semibold">{titulo}</h3>
        <p className="text-xs text-muted-foreground">{ajuda}</p>
      </div>
      <ul className="flex flex-wrap gap-2" aria-label={titulo}>
        {lista.map((m) => (
          <li
            key={m}
            className="flex items-center gap-1 rounded-full border bg-muted/40 py-1 pl-3 pr-1 text-sm"
          >
            {m}
            <button
              type="button"
              aria-label={`Tirar ${m}`}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
              onClick={() => setLista(lista.filter((x) => x !== m))}
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <Label htmlFor={`${id}-novo`}>{singular === "motivo" ? "Novo motivo" : `Nova ${singular}`}</Label>
          <Input
            id={`${id}-novo`}
            value={novo}
            maxLength={60}
            capitalizar="texto"
            onChange={(e) => setNovo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                acrescentar();
              }
            }}
          />
        </div>
        <Button type="button" variant="outline" onClick={acrescentar} disabled={!novo.trim()}>
          Adicionar
        </Button>
      </div>
      <Button requiresWrite type="button" disabled={igual || lista.length === 0} onClick={gravar}>
        Salvar {titulo.toLocaleLowerCase("pt-BR")}
      </Button>
    </div>
  );
}
