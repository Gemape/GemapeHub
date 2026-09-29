import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type MarcadosDualList = { disponiveis: string[]; selecionadas: string[] };

type Props = {
  disponiveis: string[];
  selecionadas: string[];
  onAdicionar: (nomes: string[]) => void;
  onRemover: (nomes: string[]) => void;
  // Informação extra ao lado do item (ex.: quantos produtos usam a opção).
  detalhe?: ((nome: string) => ReactNode) | undefined;
  // Ações extras que dependem dos itens marcados (ex.: renomear, excluir).
  acoes?: (marcados: MarcadosDualList, limpar: () => void) => ReactNode;
  titulo?: string;
};

// Lista dupla: à esquerda as opções disponíveis, à direita as selecionadas.
// Clique marca e desmarca; duplo clique move o item para o outro lado.
export function DualList({
  disponiveis,
  selecionadas,
  onAdicionar,
  onRemover,
  detalhe,
  acoes,
  titulo = "opções",
}: Props) {
  const [marcadosEsq, setMarcadosEsq] = useState<string[]>([]);
  const [marcadosDir, setMarcadosDir] = useState<string[]>([]);
  // Ignora marcações de itens que já mudaram de lado ou deixaram de existir.
  const esquerda = marcadosEsq.filter((item) => disponiveis.includes(item));
  const direita = marcadosDir.filter((item) => selecionadas.includes(item));

  const limpar = () => {
    setMarcadosEsq([]);
    setMarcadosDir([]);
  };
  const adicionar = (nomes: string[]) => {
    if (nomes.length === 0) return;
    onAdicionar(nomes);
    setMarcadosEsq([]);
  };
  const remover = (nomes: string[]) => {
    if (nomes.length === 0) return;
    onRemover(nomes);
    setMarcadosDir([]);
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <Button
          requiresWrite
          type="button"
          disabled={esquerda.length === 0}
          onClick={() => adicionar(esquerda)}
        >
          Adicionar <ChevronRight className="size-4" />
        </Button>
        <Button
          requiresWrite
          type="button"
          disabled={direita.length === 0}
          onClick={() => remover(direita)}
        >
          <ChevronLeft className="size-4" /> Remover
        </Button>
        <Coluna
          rotulo={`${titulo} disponíveis`}
          titulo="Disponíveis"
          itens={disponiveis}
          marcados={esquerda}
          setMarcados={setMarcadosEsq}
          onMover={(nome) => adicionar([nome])}
          detalhe={detalhe}
        />
        <Coluna
          rotulo={`${titulo} selecionadas`}
          titulo="Selecionadas"
          itens={selecionadas}
          marcados={direita}
          setMarcados={setMarcadosDir}
          onMover={(nome) => remover([nome])}
          detalhe={detalhe}
        />
        <TodosNenhum itens={disponiveis} marcados={esquerda} setMarcados={setMarcadosEsq} />
        <TodosNenhum itens={selecionadas} marcados={direita} setMarcados={setMarcadosDir} />
      </div>
      {acoes?.({ disponiveis: esquerda, selecionadas: direita }, limpar)}
    </div>
  );
}

function Coluna({
  rotulo,
  titulo,
  itens,
  marcados,
  setMarcados,
  onMover,
  detalhe,
}: {
  rotulo: string;
  titulo: string;
  itens: string[];
  marcados: string[];
  setMarcados: (marcados: string[]) => void;
  onMover: (nome: string) => void;
  detalhe?: ((nome: string) => ReactNode) | undefined;
}) {
  const alternar = (nome: string) =>
    setMarcados(
      marcados.includes(nome) ? marcados.filter((item) => item !== nome) : [...marcados, nome],
    );

  return (
    <div className="flex min-w-0 flex-col">
      <p className="mb-1 text-xs font-medium text-muted-foreground">
        {titulo} ({itens.length})
      </p>
      <ul aria-label={rotulo} className="h-56 overflow-y-auto rounded-md border bg-background">
        {itens.length === 0 && (
          <li className="px-3 py-2 text-sm text-muted-foreground">Nenhuma opção.</li>
        )}
        {itens.map((nome) => {
          const marcado = marcados.includes(nome);
          return (
            <li key={nome} className="border-b last:border-b-0">
              <button
                type="button"
                aria-pressed={marcado}
                onClick={() => alternar(nome)}
                onDoubleClick={() => onMover(nome)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm",
                  marcado ? "bg-primary/15" : "hover:bg-muted",
                )}
              >
                <span className="truncate">{nome}</span>
                {detalhe?.(nome)}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TodosNenhum({
  itens,
  marcados,
  setMarcados,
}: {
  itens: string[];
  marcados: string[];
  setMarcados: (marcados: string[]) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        type="button"
        size="sm"
        disabled={itens.length === 0 || marcados.length === itens.length}
        onClick={() => setMarcados([...itens])}
      >
        Todos
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={marcados.length === 0}
        onClick={() => setMarcados([])}
      >
        Nenhum
      </Button>
    </div>
  );
}
