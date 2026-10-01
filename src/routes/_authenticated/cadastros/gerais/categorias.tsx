import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { demoSupabase } from "@/integrations/supabase/demo-client";
import { opcaoFerramentaEmUso } from "@/lib/cadastro-ferramentas";
import { marcaEmUso } from "@/lib/marcas-gerais";
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
  type ListaFerramenta,
} from "@/lib/parametros-base";
import { executar, useParametrosBase } from "@/lib/use-parametros-base";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cadastros/gerais/categorias")({
  head: () => ({ meta: [{ title: "Categorias e subcategorias | Patrimônio GEMAPE" }] }),
  component: Categorias,
});

function Categorias() {
  const dados = useParametrosBase();
  const [escolhida, setEscolhida] = useState("");
  const categoria = dados.categorias.find((c) => c.id === escolhida) ?? dados.categorias[0];
  const subcategorias = categoria ? subcategoriasDa(dados, categoria.id) : [];

  async function vinculoImpedeAlteracao(tipo: ListaFerramenta, nome: string): Promise<boolean> {
    const { data, error } = await demoSupabase.from("ferramentas").select("categoria_ferramenta,grupo_ferramenta,marca");
    if (error) {
      toast.error("Não foi possível conferir os modelos de ferramentas.");
      return true;
    }
    if (opcaoFerramentaEmUso((data ?? []) as { categoria_ferramenta?: string | null; grupo_ferramenta?: string | null; marca?: string | null }[], tipo, nome)) {
      toast.error(`A opção "${nome}" está em uso por uma ferramenta.`);
      return true;
    }
    return false;
  }

  // Marca de uniforme ou de veículo usada por um cadastro não pode ser renomeada nem
  // excluída, para o cadastro não ficar com uma marca fora de Gerais.
  async function marcaImpedeAlteracao(
    tipo: "marcasUniforme" | "marcasVeiculo",
    nome: string,
  ): Promise<boolean> {
    const consulta =
      tipo === "marcasUniforme"
        ? demoSupabase.from("uniformes").select("marca")
        : // Veículo tem a coluna marca no banco real; a marca de uniforme só existe no demo.
          supabase.from("veiculos").select("marca");
    const { data, error } = await consulta;
    if (error) {
      toast.error("Não foi possível conferir os cadastros que usam a marca.");
      return true;
    }
    if (marcaEmUso((data ?? []) as { marca?: string | null }[], nome)) {
      const onde = tipo === "marcasUniforme" ? "um uniforme" : "um veículo";
      toast.error(`A marca "${nome}" está em uso por ${onde}.`);
      return true;
    }
    return false;
  }

  function listaMarcas(
    tipo: "marcasUniforme" | "marcasVeiculo",
    titulo: string,
    novo: string,
    rotulo: string,
  ) {
    return (
      <ListaEditavel
        titulo={titulo}
        novo={novo}
        itens={dados[tipo]}
        onAdicionar={(nome) =>
          executar(() => adicionarListaFerramenta(tipo, nome), "Marca incluída.")
        }
        onRenomear={async (id, nome) => {
          const atual = dados[tipo].find((item) => item.id === id);
          if (
            !atual ||
            (atual.nome !== nome.trim() && (await marcaImpedeAlteracao(tipo, atual.nome)))
          )
            return false;
          return executar(() => renomearListaFerramenta(tipo, id, nome));
        }}
        onRemover={async (item) => {
          if (
            confirm(`Excluir a marca de ${rotulo} ${item.nome}?`) &&
            !(await marcaImpedeAlteracao(tipo, item.nome))
          )
            executar(() => removerListaFerramenta(tipo, item.id), "Marca excluída.");
        }}
      />
    );
  }

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
          titulo="Marcas de ferramentas"
          novo="Nova marca de ferramenta"
          itens={dados.marcasFerramenta}
          onAdicionar={(nome) => executar(() => adicionarListaFerramenta("marcasFerramenta", nome), "Marca incluída.")}
          onRenomear={async (id, nome) => {
            const atual = dados.marcasFerramenta.find((item) => item.id === id);
            if (!atual || (atual.nome !== nome.trim() && await vinculoImpedeAlteracao("marcasFerramenta", atual.nome))) return false;
            return executar(() => renomearListaFerramenta("marcasFerramenta", id, nome));
          }}
          onRemover={async (item) => {
            if (confirm(`Excluir a marca de ferramenta ${item.nome}?`) && !await vinculoImpedeAlteracao("marcasFerramenta", item.nome))
              executar(() => removerListaFerramenta("marcasFerramenta", item.id), "Marca excluída.");
          }}
        />
        {listaMarcas("marcasUniforme", "Marcas de uniformes", "Nova marca de uniforme", "uniforme")}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {listaMarcas("marcasVeiculo", "Marcas de veículos", "Nova marca de veículo", "veículo")}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <ListaEditavel
          titulo="Categorias de ferramentas"
          novo="Nova categoria de ferramenta"
          itens={dados.categoriasFerramenta}
          onAdicionar={(nome) => executar(() => adicionarListaFerramenta("categoriasFerramenta", nome), "Categoria incluída.")}
          onRenomear={async (id, nome) => {
            const atual = dados.categoriasFerramenta.find((item) => item.id === id);
            if (!atual || (atual.nome !== nome.trim() && await vinculoImpedeAlteracao("categoriasFerramenta", atual.nome))) return false;
            return executar(() => renomearListaFerramenta("categoriasFerramenta", id, nome));
          }}
          onRemover={async (item) => {
            if (confirm(`Excluir a categoria de ferramenta ${item.nome}?`) && !await vinculoImpedeAlteracao("categoriasFerramenta", item.nome))
              executar(() => removerListaFerramenta("categoriasFerramenta", item.id), "Categoria excluída.");
          }}
        />
        <ListaEditavel
          titulo="Grupos de ferramentas"
          novo="Novo grupo de ferramenta"
          itens={dados.gruposFerramenta}
          onAdicionar={(nome) => executar(() => adicionarListaFerramenta("gruposFerramenta", nome), "Grupo incluído.")}
          onRenomear={async (id, nome) => {
            const atual = dados.gruposFerramenta.find((item) => item.id === id);
            if (!atual || (atual.nome !== nome.trim() && await vinculoImpedeAlteracao("gruposFerramenta", atual.nome))) return false;
            return executar(() => renomearListaFerramenta("gruposFerramenta", id, nome));
          }}
          onRemover={async (item) => {
            if (confirm(`Excluir o grupo de ferramenta ${item.nome}?`) && !await vinculoImpedeAlteracao("gruposFerramenta", item.nome))
              executar(() => removerListaFerramenta("gruposFerramenta", item.id), "Grupo excluído.");
          }}
        />
      </div>
    </div>
  );
}
