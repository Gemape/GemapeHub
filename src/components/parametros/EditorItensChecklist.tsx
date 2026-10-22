import { Plus, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

// Itens de um grupo do check list: marcam-se os itens do padrão, e os selecionados aparecem numa lista que se edita (renomear, remover) e à qual se
// acrescentam itens próprios. O valor é o mesmo de antes (um item por linha), então quem grava não muda.
export type GrupoCatalogo = { titulo: string; itens: readonly string[] };

const LIMITE_GRUPO = 5000;
const LIMITE_ITEM = 200;
const normalizar = (t: string) => t.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");

export function EditorItensChecklist({ id, value, onChange, catalogo }: { id: string; value: string; onChange: (v: string) => void; catalogo: readonly GrupoCatalogo[] }) {
  const [novo, setNovo] = useState("");
  const linhas = value.split("\n");
  const selecionados = linhas.filter((l) => l.trim());
  const tem = (item: string) => linhas.some((l) => normalizar(l) === normalizar(item));
  const [aviso, setAviso] = useState("");
  // Uma linha só, esvaziada na edição, vira um espaço: a linha continua na tela para o texto ser reescrito (a gravação ignora linha em branco).
  const grava = (proximas: string[]) => {
    const texto = proximas.length === 1 && proximas[0] === "" ? " " : proximas.join("\n");
    // Mesmo limite de antes, de 5000 caracteres no grupo; quem passa disso não entra.
    if (texto.length > LIMITE_GRUPO && texto.length > value.length) {
      setAviso(`Limite de ${LIMITE_GRUPO} caracteres no grupo.`);
      return;
    }
    setAviso("");
    onChange(texto);
  };

  const alternar = (item: string, marcar: boolean) => {
    if (marcar) {
      if (!tem(item)) grava([...linhas.filter((l) => l.trim()), item]);
    } else grava(linhas.filter((l) => normalizar(l) !== normalizar(item)));
  };
  const adicionar = () => {
    const texto = novo.trim();
    if (!texto) return;
    if (!tem(texto)) grava([...linhas.filter((l) => l.trim()), texto]);
    setNovo("");
  };

  return (
    <div className="space-y-3" id={id}>
      {catalogo.length > 0 && (
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">Itens padrão (marque para incluir no grupo)</legend>
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
            {catalogo.map((g) => {
              const marcados = g.itens.filter(tem).length;
              return (
                <details key={g.titulo} className="rounded">
                  <summary className="cursor-pointer text-sm font-medium">
                    {g.titulo} <span className="font-normal text-muted-foreground">({marcados} de {g.itens.length})</span>
                  </summary>
                  <ul className="mt-1 space-y-1 pl-4">
                    {g.itens.map((item) => (
                      <li key={item}>
                        <label className="flex cursor-pointer items-start gap-2 text-sm">
                          <Checkbox className="mt-0.5" checked={tem(item)} onCheckedChange={(v) => alternar(item, v === true)} aria-label={item} />
                          <span>{item}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })}
          </div>
        </fieldset>
      )}

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">Itens do grupo ({selecionados.length} {selecionados.length === 1 ? "selecionado" : "selecionados"})</legend>
        {selecionados.length === 0 ? <p className="text-xs text-muted-foreground">Nenhum item ainda. Marque itens do padrão ou adicione um item próprio.</p> : null}
        <ul className="max-h-48 space-y-1.5 overflow-y-auto">
          {(value === "" ? [] : linhas).map((l, n) => (
            <li key={n} className="flex items-center gap-2">
              <Input id={`${id}-${n}`} value={l} maxLength={LIMITE_ITEM} aria-label={`Item ${n + 1}`} onChange={(e) => grava(linhas.map((x, k) => (k === n ? e.target.value : x)))} />
              <Button type="button" size="icon" variant="ghost" aria-label={`Remover ${l}`} onClick={() => grava(linhas.filter((_, k) => k !== n))}>
                <X className="size-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <Input
            value={novo}
            maxLength={LIMITE_ITEM}
            placeholder="Novo item do grupo"
            aria-label="Novo item do grupo"
            onChange={(e) => setNovo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                adicionar();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={adicionar}>
            <Plus className="mr-1 size-4" aria-hidden="true" />Adicionar
          </Button>
        </div>
        {aviso && <p role="alert" className="text-xs text-destructive">{aviso}</p>}
      </fieldset>
    </div>
  );
}
