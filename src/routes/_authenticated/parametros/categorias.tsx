import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Cabecalho } from "@/components/parametros/Cabecalho";
import { ListaEditavel } from "@/components/parametros/ListaEditavel";
import {
  adicionarCategoria,
  adicionarSubcategoria,
  removerCategoria,
  removerSubcategoria,
  renomearCategoria,
  renomearSubcategoria,
  subcategoriasDa,
} from "@/lib/parametros-base";
import { executar, useParametrosBase } from "@/lib/use-parametros-base";

export const Route = createFileRoute("/_authenticated/parametros/categorias")({
  head: () => ({ meta: [{ title: "Categorias e subcategorias | Patrimônio GEMAPE" }] }),
  component: Categorias,
});

function Categorias() {
  const dados = useParametrosBase();
  const [escolhida, setEscolhida] = useState("");
  const categoria = dados.categorias.find((c) => c.id === escolhida) ?? dados.categorias[0];
  const subcategorias = categoria ? subcategoriasDa(dados, categoria.id) : [];

  return (
    <div className="space-y-5">
      <Cabecalho
        titulo="Categorias e subcategorias"
        descricao="Categorias de todos os tipos de produto e, dentro de cada uma, as subcategorias. Clique numa categoria para ver as subcategorias dela."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <ListaEditavel
          titulo="Categorias"
          novo="Nova categoria"
          itens={dados.categorias}
          selecionado={categoria?.id}
          onSelecionar={setEscolhida}
          detalhe={(c) => <Badge variant="secondary">{subcategoriasDa(dados, c.id).length}</Badge>}
          onAdicionar={(nome) =>
            executar(() => setEscolhida(adicionarCategoria(nome).id), "Categoria incluída.")
          }
          onRenomear={(id, nome) => executar(() => renomearCategoria(id, nome))}
          onRemover={(c) => {
            if (confirm(`Excluir a categoria ${c.nome}?`))
              executar(() => removerCategoria(c.id), "Categoria excluída.");
          }}
        />
        {categoria ? (
          <ListaEditavel
            titulo={`Subcategorias de ${categoria.nome}`}
            novo="Nova subcategoria"
            itens={subcategorias}
            vazio="Nenhuma subcategoria nesta categoria."
            onAdicionar={(nome) =>
              executar(() => adicionarSubcategoria(categoria.id, nome), "Subcategoria incluída.")
            }
            onRenomear={(id, nome) => executar(() => renomearSubcategoria(id, nome))}
            onRemover={(s) => {
              if (
                confirm(
                  `Excluir a subcategoria ${s.nome}? Os tamanhos e unidades autorizados para ela também saem.`,
                )
              ) {
                executar(() => removerSubcategoria(s.id), "Subcategoria excluída.");
              }
            }}
          />
        ) : (
          <div className="panel p-4 text-sm text-muted-foreground">
            Cadastre uma categoria para incluir subcategorias.
          </div>
        )}
      </div>
    </div>
  );
}
