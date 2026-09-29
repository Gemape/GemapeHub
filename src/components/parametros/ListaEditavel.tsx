import { ArrowDown, ArrowUp, Check, Pencil, Trash2, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Item = { id: string; nome: string };

type Props = {
  titulo: string;
  itens: Item[];
  // Rótulo do campo de inclusão (ex.: "Nova categoria").
  novo: string;
  onAdicionar: (nome: string) => boolean;
  onRenomear: (id: string, nome: string) => boolean;
  onRemover: (item: Item) => void;
  onMover?: (id: string, passo: -1 | 1) => void;
  detalhe?: (item: Item) => ReactNode;
  selecionado?: string | undefined;
  onSelecionar?: ((id: string) => void) | undefined;
  vazio?: string;
};

// Lista com inclusão, renomeação e exclusão, usada em Cadastros > Gerais.
export function ListaEditavel({
  titulo,
  itens,
  novo,
  onAdicionar,
  onRenomear,
  onRemover,
  onMover,
  detalhe,
  selecionado,
  onSelecionar,
  vazio = "Nenhum item cadastrado.",
}: Props) {
  const [nome, setNome] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [nomeEdicao, setNomeEdicao] = useState("");
  const idCampo = `novo-${titulo.toLowerCase().replace(/\W+/g, "-")}`;

  function incluir(e: React.FormEvent) {
    e.preventDefault();
    if (onAdicionar(nome)) setNome("");
  }

  function confirmarEdicao(id: string) {
    if (onRenomear(id, nomeEdicao)) setEditando(null);
  }

  return (
    <section className="panel space-y-3 p-4">
      <h2 className="text-sm font-semibold">
        {titulo} <span className="font-normal text-muted-foreground">({itens.length})</span>
      </h2>
      <form onSubmit={incluir} className="flex gap-2">
        <label htmlFor={idCampo} className="sr-only">
          {novo}
        </label>
        <Input
          id={idCampo}
          placeholder={novo}
          value={nome}
          maxLength={60}
          onChange={(e) => setNome(e.target.value)}
        />
        <Button type="submit" disabled={!nome.trim()}>
          Incluir
        </Button>
      </form>
      <ul aria-label={titulo} className="max-h-[26rem] divide-y overflow-y-auto rounded-md border">
        {itens.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">{vazio}</li>}
        {itens.map((item, i) => {
          const ativo = selecionado === item.id;
          if (editando === item.id) {
            return (
              <li key={item.id} className="flex items-center gap-2 px-2 py-1.5">
                <Input
                  aria-label={`Novo nome de ${item.nome}`}
                  autoFocus
                  className="h-8"
                  value={nomeEdicao}
                  maxLength={60}
                  onChange={(e) => setNomeEdicao(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      confirmarEdicao(item.id);
                    }
                    if (e.key === "Escape") setEditando(null);
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  aria-label="Salvar nome"
                  onClick={() => confirmarEdicao(item.id)}
                >
                  <Check className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  aria-label="Cancelar"
                  onClick={() => setEditando(null)}
                >
                  <X className="size-4" />
                </Button>
              </li>
            );
          }
          return (
            <li
              key={item.id}
              className={cn("flex items-center gap-1 px-2 py-1", ativo && "bg-primary/10")}
            >
              {onSelecionar ? (
                <button
                  type="button"
                  aria-pressed={ativo}
                  className={cn(
                    "flex-1 truncate px-1 py-1 text-left text-sm",
                    ativo && "font-semibold",
                  )}
                  onClick={() => onSelecionar(item.id)}
                >
                  {item.nome}
                </button>
              ) : (
                <span className="flex-1 truncate px-1 py-1 text-sm">{item.nome}</span>
              )}
              {detalhe?.(item)}
              {onMover && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    aria-label={`Subir ${item.nome}`}
                    disabled={i === 0}
                    onClick={() => onMover(item.id, -1)}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    aria-label={`Descer ${item.nome}`}
                    disabled={i === itens.length - 1}
                    onClick={() => onMover(item.id, 1)}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                </>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                aria-label={`Renomear ${item.nome}`}
                onClick={() => {
                  setEditando(item.id);
                  setNomeEdicao(item.nome);
                }}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-destructive"
                aria-label={`Excluir ${item.nome}`}
                onClick={() => onRemover(item)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
