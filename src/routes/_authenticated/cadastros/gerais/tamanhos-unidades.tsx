import { createFileRoute } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Cabecalho } from "@/components/parametros/Cabecalho";
import { ListaEditavel } from "@/components/parametros/ListaEditavel";
import {
  adicionarOpcao,
  moverOpcao,
  removerOpcao,
  renomearOpcao,
  ROTULO_OPCAO,
  usoDaOpcao,
  type TipoOpcao,
} from "@/lib/parametros-base";
import { executar, useParametrosBase } from "@/lib/use-parametros-base";

export const Route = createFileRoute("/_authenticated/cadastros/gerais/tamanhos-unidades")({
  head: () => ({ meta: [{ title: "Tamanhos e unidades | Patrimônio GEMAPE" }] }),
  component: TamanhosUnidades,
});

function TamanhosUnidades() {
  const dados = useParametrosBase();

  const lista = (tipo: TipoOpcao, novo: string, sequencial: boolean) => (
    <ListaEditavel
      titulo={ROTULO_OPCAO[tipo].plural}
      novo={novo}
      itens={dados[tipo]}
      onAdicionar={(nome) => executar(() => adicionarOpcao(tipo, nome), "Incluído.")}
      onRenomear={(id, nome) => executar(() => renomearOpcao(tipo, id, nome))}
      {...(sequencial
        ? { onMover: (id: string, passo: -1 | 1) => executar(() => moverOpcao(tipo, id, passo)) }
        : {})}
      detalhe={(o) => {
        const uso = usoDaOpcao(dados, tipo, o.id);
        return uso > 0 ? (
          <Badge variant="secondary" title="Subcategorias que autorizam">
            {uso} subcat.
          </Badge>
        ) : null;
      }}
      onRemover={(o) => {
        const uso = usoDaOpcao(dados, tipo, o.id);
        const aviso =
          uso > 0 ? ` Ele está autorizado em ${uso} subcategoria(s) e sai de todas.` : "";
        if (confirm(`Excluir ${o.nome}?${aviso}`))
          executar(() => removerOpcao(tipo, o.id), "Excluído.");
      }}
    />
  );

  return (
    <div className="space-y-5">
      <Cabecalho
        titulo="Tamanhos e unidades de medida"
        descricao="Cadastro base de todas as possibilidades de tamanho e numeração, na ordem em que devem aparecer, e das unidades de medida."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        {lista("tamanhos", "Novo tamanho ou numeração (ex.: 45, XG)", true)}
        {lista("unidades", "Nova unidade (ex.: Rolo)", false)}
      </div>
    </div>
  );
}
