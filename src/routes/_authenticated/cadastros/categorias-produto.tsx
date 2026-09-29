import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { DualList } from "@/components/DualList";
import {
  CATEGORIAS_PRODUTO,
  criarSubcategoria,
  disponiveis,
  excluirSubcategorias,
  removerDaSelecao,
  renomearSubcategoria,
  selecionarSubcategorias,
  type CategoriaProduto,
} from "@/lib/categorias-produto";
import { useCategoria } from "@/lib/use-subcategorias";

export const Route = createFileRoute("/_authenticated/cadastros/categorias-produto")({
  head: () => ({ meta: [{ title: "Categorias de Produto | Patrimônio GEMAPE" }] }),
  component: PaginaCategorias,
});

type DefinicaoCategoria = (typeof CATEGORIAS_PRODUTO)[number];
type Edicao = { categoria: DefinicaoCategoria; atual: string | null };

// A tabela muda conforme a categoria, e os tipos gerados do Supabase não aceitam essa união.
type TabelaProdutos = {
  select(
    coluna: string,
    opcoes: { count: "exact"; head: true },
  ): { eq(coluna: string, valor: string): PromiseLike<{ count: number | null; error: unknown }> };
};
const tabelaProdutos = (definicao: DefinicaoCategoria) =>
  supabase.from(definicao.tabela) as unknown as TabelaProdutos;

// Quantos produtos usam cada subcategoria: as em uso não podem sair da seleção nem ser
// renomeadas. Conta uma a uma para não esbarrar no limite de linhas de uma consulta.
function useUsoSubcategorias(definicao: DefinicaoCategoria, opcoes: string[]) {
  return useQuery({
    queryKey: [definicao.tabela, "uso-subcategorias", opcoes],
    queryFn: async () => {
      const contagens = await Promise.all(
        opcoes.map(async (nome) => {
          const { count, error } = await tabelaProdutos(definicao)
            .select("id", { count: "exact", head: true })
            .eq(definicao.coluna, nome);
          if (error) throw error;
          return [nome, count ?? 0] as const;
        }),
      );
      return new Map(contagens);
    },
  });
}

function PaginaCategorias() {
  const [edicao, setEdicao] = useState<Edicao | null>(null);

  return (
    <div className="space-y-5">
      <header>
        <p className="text-eyebrow">Cadastros</p>
        <h1 className="text-2xl font-bold">Categorias de Produto</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha as subcategorias de cada categoria. Só as selecionadas aparecem nos cadastros de
          EPIs, Ferramentas, Uniformes e Veículos.
        </p>
      </header>
      <div className="grid gap-4 xl:grid-cols-2">
        {CATEGORIAS_PRODUTO.map((definicao) => (
          <CartaoCategoria
            key={definicao.chave}
            definicao={definicao}
            onNova={() => setEdicao({ categoria: definicao, atual: null })}
            onRenomear={(atual) => setEdicao({ categoria: definicao, atual })}
          />
        ))}
      </div>
      {edicao && <DialogoSubcategoria edicao={edicao} onFechar={() => setEdicao(null)} />}
    </div>
  );
}

function CartaoCategoria({
  definicao,
  onNova,
  onRenomear,
}: {
  definicao: DefinicaoCategoria;
  onNova: () => void;
  onRenomear: (atual: string) => void;
}) {
  const lista = useCategoria(definicao.chave);
  const { data: uso, isLoading, isError } = useUsoSubcategorias(definicao, lista.opcoes);
  const emUso = (nome: string) => uso?.get(nome) ?? 0;

  function remover(nomes: string[]) {
    if (isLoading || isError) {
      toast.error("Aguarde a verificação das subcategorias em uso e tente de novo.");
      return;
    }
    const bloqueadas = nomes.filter((nome) => emUso(nome) > 0);
    const livres = nomes.filter((nome) => emUso(nome) === 0);
    if (livres.length > 0) removerDaSelecao(definicao.chave, livres);
    if (bloqueadas.length > 0) {
      toast.error(`Em uso por produtos, continuam selecionadas: ${bloqueadas.join(", ")}.`);
    }
  }

  function excluir(nomes: string[], limpar: () => void) {
    if (!confirm(`Excluir ${nomes.join(", ")} das opções?`)) return;
    excluirSubcategorias(definicao.chave, nomes);
    limpar();
    toast.success(nomes.length === 1 ? "Subcategoria excluída" : "Subcategorias excluídas");
  }

  return (
    <section className="panel space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{definicao.nome}</h2>
        <Button requiresWrite size="sm" variant="outline" onClick={onNova}>
          Nova subcategoria
        </Button>
      </div>
      {isError && (
        <p className="text-sm text-destructive">
          Não foi possível verificar quais subcategorias estão em uso.
        </p>
      )}
      <DualList
        titulo={`Subcategorias de ${definicao.nome}`}
        disponiveis={disponiveis(lista)}
        selecionadas={lista.selecionadas}
        onAdicionar={(nomes) => selecionarSubcategorias(definicao.chave, nomes)}
        onRemover={remover}
        detalhe={(nome) =>
          emUso(nome) > 0 ? <Badge variant="secondary">{emUso(nome)} em uso</Badge> : null
        }
        acoes={(marcados, limpar) => {
          const todos = [...marcados.disponiveis, ...marcados.selecionadas];
          return (
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                requiresWrite
                size="sm"
                variant="ghost"
                disabled={todos.length !== 1 || isLoading || isError || emUso(todos[0] ?? "") > 0}
                title={
                  todos.length === 1 && emUso(todos[0] ?? "") > 0
                    ? "Subcategoria em uso por produtos não pode ser renomeada"
                    : undefined
                }
                onClick={() => todos[0] && onRenomear(todos[0])}
              >
                Renomear
              </Button>
              <Button
                requiresWrite
                size="sm"
                variant="ghost"
                disabled={marcados.disponiveis.length === 0 || marcados.selecionadas.length > 0}
                title="Exclui as opções marcadas em Disponíveis"
                onClick={() => excluir(marcados.disponiveis, limpar)}
              >
                Excluir
              </Button>
            </div>
          );
        }}
      />
    </section>
  );
}

function DialogoSubcategoria({ edicao, onFechar }: { edicao: Edicao; onFechar: () => void }) {
  const [salvando, setSalvando] = useState(false);
  const { categoria, atual } = edicao;
  const chave: CategoriaProduto = categoria.chave;

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const nome = String(new FormData(evento.currentTarget).get("nome") ?? "");
    setSalvando(true);
    try {
      if (atual === null) {
        criarSubcategoria(chave, nome);
      } else {
        renomearSubcategoria(chave, atual, nome);
      }
      toast.success("Subcategoria salva");
      onFechar();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar a subcategoria.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(aberto) => {
        if (!aberto) onFechar();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {atual === null ? "Nova subcategoria" : "Renomear subcategoria"}
          </DialogTitle>
          <DialogDescription>
            Categoria {categoria.nome}.
            {atual === null
              ? " A nova opção entra em Disponíveis."
              : " Só é possível renomear subcategorias que nenhum produto usa."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="subcategoria_nome">Nome da subcategoria</Label>
            <Input
              id="subcategoria_nome"
              name="nome"
              required
              autoFocus
              maxLength={60}
              defaultValue={atual ?? ""}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onFechar}>
              Cancelar
            </Button>
            <Button requiresWrite type="submit" disabled={salvando}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
