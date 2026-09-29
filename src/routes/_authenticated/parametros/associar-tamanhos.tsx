import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { DualList } from "@/components/DualList";
import { Label } from "@/components/ui/label";
import { Cabecalho } from "@/components/parametros/Cabecalho";
import {
  autorizados,
  autorizar,
  desautorizar,
  ROTULO_OPCAO,
  subcategoriasDa,
  type TipoOpcao,
} from "@/lib/parametros-base";
import { executar, useParametrosBase } from "@/lib/use-parametros-base";

export const Route = createFileRoute("/_authenticated/parametros/associar-tamanhos")({
  head: () => ({ meta: [{ title: "Associar tamanho e medida | Patrimônio GEMAPE" }] }),
  component: AssociarTamanhos,
});

const selectClasse = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

function AssociarTamanhos() {
  const dados = useParametrosBase();
  const [categoriaId, setCategoriaId] = useState(dados.categorias[0]?.id ?? "");
  const [subcategoriaId, setSubcategoriaId] = useState("");
  const subcategorias = subcategoriasDa(dados, categoriaId);
  const sub = subcategorias.find((s) => s.id === subcategoriaId);

  const bloco = (tipo: TipoOpcao) => {
    if (!sub) return null;
    const ids = new Set(autorizados(dados, sub.id, tipo).map((o) => o.id));
    const nomes = new Map(dados[tipo].map((o) => [o.id, o.nome]));
    return (
      <section className="panel space-y-3 p-4">
        <h2 className="text-sm font-semibold">{ROTULO_OPCAO[tipo].plural}</h2>
        <DualList
          key={`${sub.id}-${tipo}`}
          titulo={ROTULO_OPCAO[tipo].plural}
          colunas={["Existentes", "Autorizados"]}
          disponiveis={dados[tipo].filter((o) => !ids.has(o.id)).map((o) => o.id)}
          selecionadas={dados[tipo].filter((o) => ids.has(o.id)).map((o) => o.id)}
          rotulo={(id) => nomes.get(id) ?? id}
          onAdicionar={(lista) => executar(() => autorizar(sub.id, tipo, lista))}
          onRemover={(lista) => executar(() => desautorizar(sub.id, tipo, lista))}
        />
      </section>
    );
  };

  return (
    <div className="space-y-5">
      <Cabecalho
        titulo="Associar tamanho e medida"
        descricao="Escolha a categoria e a subcategoria. Marque na lista Existentes as opções desejadas e transfira para Autorizados. Para desautorizar, marque em Autorizados e transfira de volta."
      />
      <div className="panel grid gap-4 p-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="categoria">Categoria</Label>
          <select
            id="categoria"
            className={selectClasse}
            value={categoriaId}
            onChange={(e) => {
              setCategoriaId(e.target.value);
              setSubcategoriaId("");
            }}
          >
            {dados.categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="subcategoria">Subcategoria</Label>
          <select
            id="subcategoria"
            className={selectClasse}
            value={subcategoriaId}
            onChange={(e) => setSubcategoriaId(e.target.value)}
          >
            <option value="" disabled>
              {subcategorias.length ? "Selecione" : "Nenhuma subcategoria nesta categoria"}
            </option>
            {subcategorias.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </div>
      </div>
      {sub ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {bloco("tamanhos")}
          {bloco("unidades")}
        </div>
      ) : (
        <div className="panel p-6 text-sm text-muted-foreground">
          Selecione a subcategoria para ver as opções.
        </div>
      )}
    </div>
  );
}
