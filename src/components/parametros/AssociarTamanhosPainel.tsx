import { useRef, useState } from "react";
import { toast } from "sonner";

import { DualList } from "@/components/DualList";
import { Label } from "@/components/ui/label";
import { Cabecalho } from "@/components/parametros/Cabecalho";
import { lerCadastrosDeUso } from "@/lib/ler-cadastros-uso";
import {
  autorizados,
  autorizar,
  desautorizar,
  estaAtivo,
  lerParametros,
  ROTULO_OPCAO,
  subcategoriasDa,
  type TipoOpcao,
} from "@/lib/parametros-base";
import {
  avisoAutorizacaoTamanhos,
  dependenciasDaDesautorizacao,
  descreverUso,
} from "@/lib/uso-parametros";
import { executar, useParametrosBase } from "@/lib/use-parametros-base";

const selectClasse = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

export function AssociarTamanhosPainel() {
  const dados = useParametrosBase();
  const [categoriaId, setCategoriaId] = useState(dados.categorias[0]?.id ?? "");
  const [subcategoriaId, setSubcategoriaId] = useState("");
  const subcategorias = subcategoriasDa(dados, categoriaId);
  const sub = subcategorias.find((s) => s.id === subcategoriaId);
  // Uma confirmação por vez: o clique feito durante a conferência anterior espera a vez em
  // fila (a lista já tirou a seleção), e cada uma lê Gerais na hora, sem dados velhos.
  const fila = useRef<Promise<unknown>>(Promise.resolve());

  function conferir(acao: () => Promise<boolean>) {
    fila.current = fila.current.then(acao).catch(() => {
      toast.error("Não foi possível concluir a alteração.");
    });
  }

  // Autorizar o primeiro tamanho avisa que o saldo dos produtos fica em "Sem tamanho".
  const autorizarComAviso = (subId: string, tipo: TipoOpcao, ids: string[]) =>
    conferir(async () => {
      if (tipo === "tamanhos") {
        const cadastros = await lerCadastrosDeUso(["epis", "uniformes"]);
        if (!cadastros) {
          toast.error("Não foi possível conferir os produtos desta subcategoria.");
          return false;
        }
        const aviso = avisoAutorizacaoTamanhos(
          lerParametros(),
          subId,
          [...(cadastros.epis ?? []), ...(cadastros.uniformes ?? [])],
          ids,
        );
        if (aviso && !confirm(`${aviso}\n\nAutorizar mesmo assim?`)) return false;
      }
      return executar(() => autorizar(subId, tipo, ids));
    });

  // Desautorizar tamanho ou unidade em uso avisa quais produtos dependem dele.
  const desautorizarComAviso = (subId: string, tipo: TipoOpcao, ids: string[]) =>
    conferir(async () => {
      const cadastros = await lerCadastrosDeUso(["epis", "uniformes", "movimentacoes"]);
      if (!cadastros) {
        toast.error("Não foi possível conferir os produtos desta subcategoria.");
        return false;
      }
      const usos = dependenciasDaDesautorizacao(lerParametros(), subId, tipo, ids, cadastros);
      if (usos.length > 0) {
        const efeito =
          tipo === "tamanhos"
            ? "O saldo que já existe continua e só pode sair; novas entradas nesse tamanho ficam bloqueadas."
            : "Os produtos continuam com a unidade escolhida até serem editados.";
        if (
          !confirm(
            `Dependem desta associação: ${descreverUso(usos)}.\n${efeito}\n\nDesautorizar mesmo assim?`,
          )
        )
          return false;
      }
      return executar(() => desautorizar(subId, tipo, ids));
    });

  const bloco = (tipo: TipoOpcao) => {
    if (!sub) return null;
    const ids = new Set(autorizados(dados, sub.id, tipo).map((o) => o.id));
    // Desativado em Gerais continua na associação, marcado.
    const nomes = new Map(
      dados[tipo].map((o) => [o.id, estaAtivo(dados, o.id) ? o.nome : `${o.nome} (desativado)`]),
    );
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
          onAdicionar={(lista) => void autorizarComAviso(sub.id, tipo, lista)}
          onRemover={(lista) => void desautorizarComAviso(sub.id, tipo, lista)}
        />
      </section>
    );
  };

  return (
    <div className="space-y-5">
      <Cabecalho
        titulo="Associar tamanho e medida ao produto"
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
