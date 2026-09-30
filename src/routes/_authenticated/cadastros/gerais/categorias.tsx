import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Cabecalho } from "@/components/parametros/Cabecalho";
import { ListaEditavel } from "@/components/parametros/ListaEditavel";
import {
  adicionarCategoria,
  adicionarListaFerramenta,
  adicionarSubcategoria,
  removerCategoria,
  removerListaFerramenta,
  removerSubcategoria,
  renomearCategoria,
  renomearListaFerramenta,
  renomearSubcategoria,
  subcategoriasDa,
} from "@/lib/parametros-base";
import { executar, useParametrosBase } from "@/lib/use-parametros-base";

export const Route = createFileRoute("/_authenticated/cadastros/gerais/categorias")({
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
      <div className="grid gap-5 lg:grid-cols-2">
        <ListaEditavel
          titulo="Categorias de ferramentas"
          novo="Nova categoria de ferramenta"
          itens={dados.categoriasFerramenta}
          onAdicionar={(nome) => executar(() => adicionarListaFerramenta("categoriasFerramenta", nome), "Categoria incluída.")}
          onRenomear={(id, nome) => executar(() => renomearListaFerramenta("categoriasFerramenta", id, nome))}
          onRemover={(item) => {
            if (confirm(`Excluir a categoria de ferramenta ${item.nome}?`))
              executar(() => removerListaFerramenta("categoriasFerramenta", item.id), "Categoria excluída.");
          }}
        />
        <ListaEditavel
          titulo="Grupos de ferramentas"
          novo="Novo grupo de ferramenta"
          itens={dados.gruposFerramenta}
          onAdicionar={(nome) => executar(() => adicionarListaFerramenta("gruposFerramenta", nome), "Grupo incluído.")}
          onRenomear={(id, nome) => executar(() => renomearListaFerramenta("gruposFerramenta", id, nome))}
          onRemover={(item) => {
            if (confirm(`Excluir o grupo de ferramenta ${item.nome}?`))
              executar(() => removerListaFerramenta("gruposFerramenta", item.id), "Grupo excluído.");
          }}
        />
      </div>
    </div>
  );
}
