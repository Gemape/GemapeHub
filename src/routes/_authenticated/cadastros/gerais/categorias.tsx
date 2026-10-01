import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { demoSupabase } from "@/integrations/supabase/demo-client";
import { Cabecalho } from "@/components/parametros/Cabecalho";
import { ListaEditavel } from "@/components/parametros/ListaEditavel";
import { listarFornecedores } from "@/lib/fornecedores-demo";
import {
  adicionarCategoria,
  adicionarListaFerramenta,
  adicionarSubcategoria,
  alterarAtivo,
  estaAtivo,
  removerCategoria,
  removerListaFerramenta,
  removerSubcategoria,
  renomearCategoria,
  renomearListaFerramenta,
  renomearSubcategoria,
  subcategoriasDa,
  type ListaFerramenta,
  type Opcao,
} from "@/lib/parametros-base";
import { SUBCATEGORIA_DAS_TABELAS } from "@/lib/subcategoria-referencia";
import {
  descreverUso,
  usoDaCategoria,
  usoDaSubcategoria,
  usoPorNome,
  type UsoParametro,
} from "@/lib/uso-parametros";
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

  // Campo de cada lista de ferramenta no modelo de ferramenta.
  const CAMPO_FERRAMENTA: Record<
    "categoriasFerramenta" | "gruposFerramenta" | "marcasFerramenta",
    string
  > = {
    categoriasFerramenta: "categoria_ferramenta",
    gruposFerramenta: "grupo_ferramenta",
    marcasFerramenta: "marca",
  };

  type Acao = "renomear" | "excluir" | "excluirSemDesativar";
  const SAIDA: Record<Acao, string> = {
    renomear: "renomeado",
    excluir: "excluído. Você pode desativar em vez de excluir",
    excluirSemDesativar: "excluído",
  };

  // Recusa a alteração quando o parâmetro está em uso e mostra onde (decisão 22, regra 5).
  function avisarUso(nome: string, usos: UsoParametro[], acao: Acao): boolean {
    if (usos.length === 0) return false;
    toast.error(
      `"${nome}" está em uso e não pode ser ${SAIDA[acao]}. Usado em: ${descreverUso(usos)}.`,
    );
    return true;
  }

  async function vinculoImpedeAlteracao(
    tipo: Exclude<ListaFerramenta, "marcasUniforme" | "marcasVeiculo">,
    nome: string,
    acao: Acao = "renomear",
  ): Promise<boolean> {
    // Marca de ferramenta tem coluna no banco real; categoria e grupo só existem no demo.
    const consulta =
      tipo === "marcasFerramenta"
        ? supabase.from("ferramentas").select("codigo_sku,nome,marca")
        : demoSupabase
            .from("ferramentas")
            .select("codigo_sku,nome,categoria_ferramenta,grupo_ferramenta");
    const { data, error } = await consulta;
    if (error) {
      toast.error("Não foi possível conferir os modelos de ferramentas.");
      return true;
    }
    const registros = (data ?? []) as Record<string, unknown>[];
    return avisarUso(nome, usoPorNome(registros, CAMPO_FERRAMENTA[tipo], nome, "Ferramenta"), acao);
  }

  // Marca de uniforme ou de veículo usada por um cadastro não pode ser renomeada nem
  // excluída, para o cadastro não ficar com uma marca fora de Gerais.
  async function marcaImpedeAlteracao(
    tipo: "marcasUniforme" | "marcasVeiculo",
    nome: string,
    acao: Acao = "renomear",
  ): Promise<boolean> {
    const consulta =
      tipo === "marcasUniforme"
        ? demoSupabase.from("uniformes").select("codigo_sku,marca")
        : // Veículo tem a coluna marca no banco real; a marca de uniforme só existe no demo.
          supabase.from("veiculos").select("placa,marca");
    const { data, error } = await consulta;
    if (error) {
      toast.error("Não foi possível conferir os cadastros que usam a marca.");
      return true;
    }
    const modulo = tipo === "marcasUniforme" ? "Uniforme" : "Veículo";
    const registros = (data ?? []) as Record<string, unknown>[];
    return avisarUso(nome, usoPorNome(registros, "marca", nome, modulo), acao);
  }

  // Subcategoria em uso por um produto ou veículo não sai: confere o módulo da categoria dela.
  async function subcategoriaEmUso(item: Opcao): Promise<boolean> {
    const sub = dados.subcategorias.find((s) => s.id === item.id);
    if (!sub) return false;
    const tabelas = (
      Object.keys(SUBCATEGORIA_DAS_TABELAS) as (keyof typeof SUBCATEGORIA_DAS_TABELAS)[]
    ).filter((tabela) => SUBCATEGORIA_DAS_TABELAS[tabela].categoriaId === sub.categoriaId);
    const cadastros: Partial<
      Record<keyof typeof SUBCATEGORIA_DAS_TABELAS, Record<string, unknown>[]>
    > = {};
    for (const tabela of tabelas) {
      const { data, error } = await supabase.from(tabela).select("*");
      if (error) {
        toast.error("Não foi possível conferir os cadastros que usam a subcategoria.");
        return true;
      }
      cadastros[tabela] = (data ?? []) as Record<string, unknown>[];
    }
    return avisarUso(sub.nome, usoDaSubcategoria(sub, dados, cadastros), acaoExcluir(sub));
  }

  // Quem já está desativado não recebe a sugestão de desativar.
  const acaoExcluir = (item: Opcao): Acao =>
    estaAtivo(dados, item.id) ? "excluir" : "excluirSemDesativar";

  // Evita duas confirmações quando o botão de excluir recebe dois cliques rápidos.
  const ocupado = useRef(false);
  async function semRepetir(acao: () => Promise<void>) {
    if (ocupado.current) return;
    ocupado.current = true;
    try {
      await acao();
    } finally {
      ocupado.current = false;
    }
  }

  const alternarAtivo = (item: Opcao, ativar: boolean) =>
    executar(
      () => alterarAtivo(item.id, ativar),
      ativar
        ? `"${item.nome}" reativado.`
        : `"${item.nome}" desativado. Ele sai das listas de seleção.`,
    );

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
        inativos={dados.inativos}
        onAlternarAtivo={alternarAtivo}
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
        onRemover={(item) =>
          semRepetir(async () => {
            if (
              !(await marcaImpedeAlteracao(tipo, item.nome, acaoExcluir(item))) &&
              confirm(`Excluir a marca de ${rotulo} ${item.nome}?`)
            )
              executar(() => removerListaFerramenta(tipo, item.id), "Marca excluída.");
          })
        }
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
            if (
              avisarUso(c.nome, usoDaCategoria(c.id, listarFornecedores()), "excluirSemDesativar")
            )
              return;
            if (confirm(`Excluir a categoria ${c.nome}?`))
              executar(() => removerCategoria(c.id), "Categoria excluída.");
          }}
        />
        {categoria ? (
          <ListaEditavel
            titulo={`Subcategorias de ${categoria.nome}`}
            novo="Nova subcategoria"
            itens={subcategorias}
            inativos={dados.inativos}
            onAlternarAtivo={alternarAtivo}
            vazio="Nenhuma subcategoria nesta categoria."
            onAdicionar={(nome) =>
              executar(() => adicionarSubcategoria(categoria.id, nome), "Subcategoria incluída.")
            }
            onRenomear={(id, nome) => executar(() => renomearSubcategoria(id, nome))}
            onRemover={(s) =>
              semRepetir(async () => {
                if (await subcategoriaEmUso(s)) return;
                if (
                  confirm(
                    `Excluir a subcategoria ${s.nome}? Os tamanhos e unidades autorizados para ela também saem.`,
                  )
                ) {
                  executar(() => removerSubcategoria(s.id), "Subcategoria excluída.");
                }
              })
            }
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
          inativos={dados.inativos}
          onAlternarAtivo={alternarAtivo}
          onAdicionar={(nome) =>
            executar(() => adicionarListaFerramenta("marcasFerramenta", nome), "Marca incluída.")
          }
          onRenomear={async (id, nome) => {
            const atual = dados.marcasFerramenta.find((item) => item.id === id);
            if (
              !atual ||
              (atual.nome !== nome.trim() &&
                (await vinculoImpedeAlteracao("marcasFerramenta", atual.nome)))
            )
              return false;
            return executar(() => renomearListaFerramenta("marcasFerramenta", id, nome));
          }}
          onRemover={(item) =>
            semRepetir(async () => {
              if (
                !(await vinculoImpedeAlteracao("marcasFerramenta", item.nome, acaoExcluir(item))) &&
                confirm(`Excluir a marca de ferramenta ${item.nome}?`)
              )
                executar(
                  () => removerListaFerramenta("marcasFerramenta", item.id),
                  "Marca excluída.",
                );
            })
          }
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
          inativos={dados.inativos}
          onAlternarAtivo={alternarAtivo}
          onAdicionar={(nome) =>
            executar(
              () => adicionarListaFerramenta("categoriasFerramenta", nome),
              "Categoria incluída.",
            )
          }
          onRenomear={async (id, nome) => {
            const atual = dados.categoriasFerramenta.find((item) => item.id === id);
            if (
              !atual ||
              (atual.nome !== nome.trim() &&
                (await vinculoImpedeAlteracao("categoriasFerramenta", atual.nome)))
            )
              return false;
            return executar(() => renomearListaFerramenta("categoriasFerramenta", id, nome));
          }}
          onRemover={(item) =>
            semRepetir(async () => {
              if (
                !(await vinculoImpedeAlteracao(
                  "categoriasFerramenta",
                  item.nome,
                  acaoExcluir(item),
                )) &&
                confirm(`Excluir a categoria de ferramenta ${item.nome}?`)
              )
                executar(
                  () => removerListaFerramenta("categoriasFerramenta", item.id),
                  "Categoria excluída.",
                );
            })
          }
        />
        <ListaEditavel
          titulo="Grupos de ferramentas"
          novo="Novo grupo de ferramenta"
          itens={dados.gruposFerramenta}
          inativos={dados.inativos}
          onAlternarAtivo={alternarAtivo}
          onAdicionar={(nome) =>
            executar(() => adicionarListaFerramenta("gruposFerramenta", nome), "Grupo incluído.")
          }
          onRenomear={async (id, nome) => {
            const atual = dados.gruposFerramenta.find((item) => item.id === id);
            if (
              !atual ||
              (atual.nome !== nome.trim() &&
                (await vinculoImpedeAlteracao("gruposFerramenta", atual.nome)))
            )
              return false;
            return executar(() => renomearListaFerramenta("gruposFerramenta", id, nome));
          }}
          onRemover={(item) =>
            semRepetir(async () => {
              if (
                !(await vinculoImpedeAlteracao("gruposFerramenta", item.nome, acaoExcluir(item))) &&
                confirm(`Excluir o grupo de ferramenta ${item.nome}?`)
              )
                executar(
                  () => removerListaFerramenta("gruposFerramenta", item.id),
                  "Grupo excluído.",
                );
            })
          }
        />
      </div>
    </div>
  );
}
