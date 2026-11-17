import { CadastrarPadraoSelecionado } from "@/components/parametros/CadastrarPadraoSelecionado";
import { confirmarExclusao } from "@/components/ConfirmarAcao";
import { useRef } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Cabecalho } from "@/components/parametros/Cabecalho";
import { ListaEditavel } from "@/components/parametros/ListaEditavel";
import { lerCadastrosDeUso } from "@/lib/ler-cadastros-uso";
import {
  adicionarOpcao,
  alterarAtivo,
  cadastrarTamanhosPadrao,
  pendentesTamanhosPadrao,
  estaAtivo,
  moverOpcao,
  removerOpcao,
  renomearOpcao,
  ROTULO_OPCAO,
  usoDaOpcao,
  type Opcao,
  type TipoOpcao,
} from "@/lib/parametros-base";
import {
  descreverUso,
  usoDaUnidade,
  usoDoTamanho,
  type CadastrosComTamanho,
} from "@/lib/uso-parametros";
import { executar, useParametrosBase } from "@/lib/use-parametros-base";

const TABELAS: (keyof CadastrosComTamanho)[] = [
  "epis",
  "uniformes",
  "movimentacoes",
  "compras_epis",
  "compras_uniformes",
];

export function TamanhosMedidasPainel({ aninhado = false }: { aninhado?: boolean }) {
  const dados = useParametrosBase();
  // Evita duas confirmações quando o botão de excluir recebe dois cliques rápidos.
  const ocupado = useRef(false);

  // Tamanho ou unidade em uso não é excluído: a tela mostra onde e sugere desativar.
  async function excluir(tipo: TipoOpcao, item: Opcao) {
    if (ocupado.current) return;
    ocupado.current = true;
    try {
      const cadastros = await lerCadastrosDeUso(TABELAS);
      if (!cadastros) {
        toast.error("Não foi possível conferir os cadastros que usam este parâmetro.");
        return;
      }
      const usos =
        tipo === "tamanhos" ? usoDoTamanho(item, dados, cadastros) : usoDaUnidade(item, cadastros);
      if (usos.length > 0) {
        const sugestao = estaAtivo(dados, item.id) ? " Você pode desativar em vez de excluir." : "";
        toast.error(
          `"${item.nome}" está em uso e não pode ser excluído. Usado em: ${descreverUso(usos)}.${sugestao}`,
        );
        return;
      }
      const autorizacoes = usoDaOpcao(dados, tipo, item.id);
      const aviso =
        autorizacoes > 0
          ? ` Ele está autorizado em ${autorizacoes} subcategoria(s) e sai de todas.`
          : "";
      if (await confirmarExclusao(item.nome, aviso.trim() || undefined))
        executar(() => removerOpcao(tipo, item.id), "Excluído.");
    } finally {
      ocupado.current = false;
    }
  }

  const lista = (tipo: TipoOpcao, novo: string, sequencial: boolean) => (
    <ListaEditavel
      titulo={ROTULO_OPCAO[tipo].plural}
      novo={novo}
      itens={dados[tipo]}
      inativos={dados.inativos}
      onAlternarAtivo={(item, ativar) =>
        executar(
          () => alterarAtivo(item.id, ativar),
          ativar
            ? `"${item.nome}" reativado.`
            : `"${item.nome}" desativado. Ele sai das listas de seleção; o que já usa continua com ele.`,
        )
      }
      onAdicionar={(nome) => executar(() => adicionarOpcao(tipo, nome), "Incluído.")}
      // Renomear muda o nome em todos os cadastros, que guardam a referência.
      onRenomear={(id, nome) => executar(() => renomearOpcao(tipo, id, nome), "Renomeado.")}
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
      onRemover={(o) => excluir(tipo, o)}
    />
  );

  return (
    <div className="space-y-5">
      <Cabecalho
        nivel={aninhado ? "secao" : "pagina"}
        titulo="Cadastro de tamanhos e medidas"
        descricao="Cadastro base de todas as possibilidades de tamanho e numeração, na ordem em que devem aparecer, e das unidades de medida. Desativar tira a opção das listas de seleção; o que já usa continua com ela."
      >
        <CadastrarPadraoSelecionado
          rotulo="Cadastrar tamanhos padrão"
          singular="tamanho ou numeração"
          plural="tamanhos e numerações"
          pendentes={pendentesTamanhosPadrao}
          cadastrar={(nomes) => cadastrarTamanhosPadrao(undefined, nomes)}
        />
      </Cabecalho>
      <div className="grid gap-5 lg:grid-cols-2">
        {lista("tamanhos", "Novo tamanho ou numeração (ex.: 45, XG)", true)}
        {lista("unidades", "Nova unidade (ex.: Rolo)", false)}
      </div>
    </div>
  );
}
