import { ArrowDown, ArrowUp, Check, Eye, EyeOff, X } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

import { AcoesLinha } from "@/components/parametros/AcoesLinha";
import { Badge } from "@/components/ui/badge";
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
  onRenomear: (id: string, nome: string) => boolean | Promise<boolean>;
  onRemover: (item: Item) => void;
  onMover?: (id: string, passo: -1 | 1) => void;
  detalhe?: (item: Item) => ReactNode;
  selecionado?: string | undefined;
  onSelecionar?: ((id: string) => void) | undefined;
  vazio?: string;
  // Desativar: o item sai das listas de seleção dos cadastros, mas continua aqui e nos
  // cadastros que já o usam.
  inativos?: string[];
  onAlternarAtivo?: (item: Item, ativar: boolean) => void;
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
  inativos = [],
  onAlternarAtivo,
}: Props) {
  const [nome, setNome] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [nomeEdicao, setNomeEdicao] = useState("");
  const idCampo = `novo-${titulo.toLowerCase().replace(/\W+/g, "-")}`;
  const campoNovo = useRef<HTMLInputElement>(null);

  // Clonar: leva o nome para o campo de inclusão, como cadastro novo. Quem decide o nome
  // final e inclui é o usuário; nada do item de origem (uso, autorizações) é herdado.
  function clonar(item: Item) {
    setNome(item.nome);
    campoNovo.current?.focus();
    campoNovo.current?.select();
  }

  function incluir(e: React.FormEvent) {
    e.preventDefault();
    if (onAdicionar(nome)) setNome("");
  }

  async function confirmarEdicao(id: string) {
    if (await onRenomear(id, nomeEdicao)) setEditando(null);
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
          ref={campoNovo}
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
          const desativado = inativos.includes(item.id);
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
                    desativado && "text-muted-foreground line-through",
                  )}
                  onClick={() => onSelecionar(item.id)}
                >
                  {item.nome}
                </button>
              ) : (
                <span
                  className={cn(
                    "flex-1 truncate px-1 py-1 text-sm",
                    desativado && "text-muted-foreground line-through",
                  )}
                >
                  {item.nome}
                </span>
              )}
              {desativado && <Badge variant="outline">Desativado</Badge>}
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
              {onAlternarAtivo && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  aria-label={desativado ? `Reativar ${item.nome}` : `Desativar ${item.nome}`}
                  title={desativado ? "Reativar" : "Desativar"}
                  onClick={() => onAlternarAtivo(item, desativado)}
                >
                  {desativado ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </Button>
              )}
              <AcoesLinha
                rotulo={item.nome}
                onClonar={() => clonar(item)}
                onEditar={() => {
                  setEditando(item.id);
                  setNomeEdicao(item.nome);
                }}
                onExcluir={() => onRemover(item)}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
