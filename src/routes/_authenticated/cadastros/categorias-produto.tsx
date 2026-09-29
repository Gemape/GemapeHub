import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  adicionarSubcategoria,
  CATEGORIAS_PRODUTO,
  removerSubcategoria,
  renomearSubcategoria,
  type CategoriaProduto,
} from "@/lib/categorias-produto";
import { useSubcategorias } from "@/lib/use-subcategorias";

export const Route = createFileRoute("/_authenticated/cadastros/categorias-produto")({
  head: () => ({ meta: [{ title: "Categorias de Produto | Patrimônio GEMAPE" }] }),
  component: PaginaCategorias,
});

type DefinicaoCategoria = (typeof CATEGORIAS_PRODUTO)[number];
type Edicao = { categoria: DefinicaoCategoria; atual: string | null };

// A tabela muda conforme a categoria, e os tipos gerados do Supabase não aceitam essa união.
type TabelaProdutos = {
  select(coluna: string): PromiseLike<{ data: unknown[] | null; error: unknown }>;
  update(valores: Record<string, string>): {
    eq(coluna: string, valor: string): PromiseLike<{ error: unknown }>;
  };
};
const tabelaProdutos = (definicao: DefinicaoCategoria) =>
  supabase.from(definicao.tabela) as unknown as TabelaProdutos;

// Quantos produtos usam cada subcategoria, para impedir a exclusão de uma que está em uso.
function useUsoSubcategorias(definicao: DefinicaoCategoria) {
  return useQuery({
    queryKey: [definicao.tabela, "uso-subcategorias"],
    queryFn: async () => {
      const { data, error } = await tabelaProdutos(definicao).select(definicao.coluna);
      if (error) throw error;
      const uso = new Map<string, number>();
      for (const linha of (data ?? []) as Record<string, string | null>[]) {
        const valor = linha[definicao.coluna];
        if (valor) uso.set(valor, (uso.get(valor) ?? 0) + 1);
      }
      return uso;
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
          Subcategorias de cada categoria, usadas nos cadastros de EPIs, Ferramentas, Uniformes e
          Veículos.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
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
  const subcategorias = useSubcategorias(definicao.chave);
  const { data: uso, isLoading, isError } = useUsoSubcategorias(definicao);

  function excluir(nome: string) {
    const emUso = uso?.get(nome) ?? 0;
    if (emUso > 0) {
      toast.error(`"${nome}" está em uso por ${emUso} produto(s) e não pode ser excluída.`);
      return;
    }
    if (!confirm(`Excluir a subcategoria ${nome}?`)) return;
    removerSubcategoria(definicao.chave, nome);
    toast.success("Subcategoria excluída");
  }

  return (
    <section className="panel space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          {definicao.nome}{" "}
          <span className="text-sm font-normal text-muted-foreground">
            ({subcategorias.length})
          </span>
        </h2>
        <Button requiresWrite size="sm" onClick={onNova}>
          Nova subcategoria
        </Button>
      </div>
      {isError && (
        <p className="text-sm text-destructive">
          Não foi possível verificar quais subcategorias estão em uso.
        </p>
      )}
      <ul className="divide-y rounded-md border">
        {subcategorias.length === 0 && (
          <li className="p-3 text-sm text-muted-foreground">Nenhuma subcategoria cadastrada.</li>
        )}
        {subcategorias.map((nome) => {
          const emUso = uso?.get(nome) ?? 0;
          return (
            <li key={nome} className="flex items-center justify-between gap-2 px-3 py-1.5">
              <span className="flex items-center gap-2 text-sm">
                {nome}
                {emUso > 0 && <Badge variant="secondary">{emUso} em uso</Badge>}
              </span>
              <span className="whitespace-nowrap">
                <Button requiresWrite variant="ghost" size="sm" onClick={() => onRenomear(nome)}>
                  Renomear
                </Button>
                <Button
                  requiresWrite
                  variant="ghost"
                  size="sm"
                  disabled={isLoading || isError || emUso > 0}
                  title={emUso > 0 ? "Em uso por produtos cadastrados" : undefined}
                  onClick={() => excluir(nome)}
                >
                  Excluir
                </Button>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function DialogoSubcategoria({ edicao, onFechar }: { edicao: Edicao; onFechar: () => void }) {
  const queryClient = useQueryClient();
  const [salvando, setSalvando] = useState(false);
  const { categoria, atual } = edicao;
  const chave: CategoriaProduto = categoria.chave;

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const nome = String(new FormData(evento.currentTarget).get("nome") ?? "");
    setSalvando(true);
    try {
      if (atual === null) {
        adicionarSubcategoria(chave, nome);
      } else {
        const novo = renomearSubcategoria(chave, atual, nome);
        // Os produtos que usavam o nome antigo passam a usar o novo.
        if (novo !== atual) {
          const { error } = await tabelaProdutos(categoria)
            .update({ [categoria.coluna]: novo })
            .eq(categoria.coluna, atual);
          if (error) {
            renomearSubcategoria(chave, novo, atual);
            throw new Error("Não foi possível atualizar os produtos com o novo nome.");
          }
          await queryClient.invalidateQueries({ queryKey: [categoria.tabela] });
        }
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
            {atual !== null && " Os produtos com o nome antigo passam a usar o novo."}
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
