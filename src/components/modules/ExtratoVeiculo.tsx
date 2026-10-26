import { useEffect } from "react";

import { rotuloDoVeiculo } from "@/components/modules/rotulo-veiculo";
import { hojeLocal } from "@/lib/empregados";
import { montarExtratoHtml, type Celula, type Cor } from "@/lib/extrato-html";
import { historicoAbastecimentos, kmAtualDoVeiculo, mediaKmPorLitro, pontosDeAtencao, sugestoesPreventivas, type StatusSugestao } from "@/lib/extrato-veiculo";
import { formatarData } from "@/lib/gemape";
import { useEmpresas, useMovimentacoes, useOcorrencias, type Veiculo } from "@/lib/hooks-gemape";
import { gruposDaManutencao, resumoManutencao } from "@/lib/registros-veiculo";
import { useAbastecimentos, useManutencoesVeiculo, useOcorrenciasVeiculo, usePlanosVeiculo } from "@/lib/use-registros-veiculo";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { useEmpresa } from "@/lib/empresa-context";
import { MODO_DEMO } from "@/lib/modo-demo";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";

// No relatório a situação sai com o ponto colorido, como nos indicadores da tela.
const SITUACAO: Record<StatusSugestao, { rotulo: string; cor: Cor }> = {
  vencida: { rotulo: "Vencida", cor: "vermelho" },
  atencao: { rotulo: "Atenção", cor: "amarelo" },
  em_dia: { rotulo: "Em dia", cor: "verde" },
  sem_registro: { rotulo: "Sem registro", cor: "cinza" },
};
const COR_OCORRENCIA: Record<string, Cor> = { Aberta: "vermelho", "Em tratativa": "amarelo", Encerrada: "verde" };

const numero = (n: number) => n.toLocaleString("pt-BR");

// Extrato do veículo (decisão 57): ao clicar em Ver extrato, o relatório abre direto no visualizador, ocupando a tela toda, com abastecimentos e média km/L,
// ocorrências, manutenções realizadas (preventivas e corretivas) e as preventivas sugeridas pelo plano, com as vencidas sinalizadas. Imprimir e baixar o PDF
// ficam no próprio visualizador. Só leitura.
export function ExtratoVeiculo({ veiculo, onFechar }: { veiculo: Veiculo | null; onFechar: () => void }) {
  const { empresaId } = useEmpresa();
  const parametros = useParametrosBase();
  const abastecimentos = useAbastecimentos();
  const manutencoes = useManutencoesVeiculo();
  const planos = usePlanosVeiculo();
  const { data: movimentacoes = [] } = useMovimentacoes("veiculo", empresaId);
  const { data: ocorrencias = [] } = useOcorrencias("", "veiculo");
  const ocorrenciasNovas = useOcorrenciasVeiculo();
  const { data: empresas = [] } = useEmpresas();

  function abrirRelatorio(v: Veiculo) {
    const dele = <T extends { veiculoId: string }>(l: T[]) => l.filter((x) => x.veiculoId === v.id);
    const abast = historicoAbastecimentos(dele(abastecimentos));
    const manut = dele(manutencoes);
    const media = mediaKmPorLitro(abast);
    const kmAtual = kmAtualDoVeiculo(v.quilometragem_atual, abast, manut);
    const sugestoes = sugestoesPreventivas({
      plano: planos.find((p) => p.veiculoId === v.id) ?? null,
      acoes: parametros.acoesManutencaoVeiculo,
      manutencoes: manut,
      kmAtual,
      hoje: hojeLocal(),
    });
    const vencidas = sugestoes.filter((s) => s.status === "vencida").length;

    // Manutenções do extrato: as registradas na tela Manutenção e as marcadas em Movimentações (registros antigos; a aba saiu do módulo na decisão 77).
    const nomeAcao = (id: string) => parametros.acoesManutencaoVeiculo.find((a) => a.id === id)?.nome;
    const linhasManutencao = [
      ...manut.map((m) => ({ data: m.data, km: m.km as number | null, tipo: m.tipo as string, servico: resumoManutencao(m, nomeAcao) })),
      ...movimentacoes
        .filter((m) => m.veiculo_id === v.id && (m as { acao_manutencao?: string }).acao_manutencao)
        .map((m) => {
          const x = m as { acao_manutencao?: string; subitens_manutencao?: string[] };
          const subs = x.subitens_manutencao?.length ? `: ${x.subitens_manutencao.join(", ")}` : "";
          return { data: m.data_movimentacao.slice(0, 10), km: null, tipo: "Movimentação", servico: `${x.acao_manutencao}${subs}` };
        }),
    ].sort((a, b) => b.data.localeCompare(a.data));
    // Registros antigos (um grupo só, sem `grupos`) também contam como manutenção que fez o item.
    const atencao = pontosDeAtencao(manut.map((m) => ({ id: m.id, data: m.data, km: m.km, grupos: gruposDaManutencao(m) })), nomeAcao);
    // Em demonstração valem as ocorrências da tela nova (decisão 60); fora dela, as da tabela antiga.
    const ocorrenciasDoVeiculo = (MODO_DEMO
      ? ocorrenciasNovas.filter((o) => o.veiculoId === v.id).map((o) => ({ data: o.ocorridoEm.slice(0, 10), descricao: `${o.codigo} · ${o.tipoNome}: ${o.descricao}`, situacao: o.status as string }))
      : ocorrencias.filter((o) => o.veiculo_id === v.id).map((o) => ({ data: o.data, descricao: o.descricao_ocorrencia, situacao: (o.responsavel_registro ?? "—") as string }))
    ).sort((a, b) => b.data.localeCompare(a.data));

    const rotulo = rotuloDoVeiculo(parametros, v);
    const html = montarExtratoHtml({
      titulo: "Extrato do veículo",
      assunto: rotulo,
      empresa: empresas.find((e) => e.id === v.empresa_id)?.nome_fantasia ?? "",
      resumo: [
        ["Km atual", numero(kmAtual)],
        ["Média de consumo", media === null ? "— (precisa de dois abastecimentos)" : `${media.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km/L`],
        vencidas > 0 ? ["Preventivas vencidas", String(vencidas), "vermelho"] : ["Preventivas vencidas", "0"],
      ],
      tabelas: [
        {
          titulo: "Manutenções preventivas sugeridas", vazio: "Este veículo não tem plano de manutenções (Parâmetros > Veículos > Manutenção).",
          colunas: [{ titulo: "Ação" }, { titulo: "Periodicidade" }, { titulo: "Última vez" }, { titulo: "Próxima revisão" }, { titulo: "Situação" }],
          linhas: sugestoes.map((x): Celula[] => [
            x.nome,
            `${numero(x.intervaloKm)} km ou ${x.intervaloMeses} meses`,
            x.ultima ? `${numero(x.ultima.km)} km (${formatarData(x.ultima.data)})` : "—",
            x.proximoKm !== null && x.proximaData ? `${numero(x.proximoKm)} km ou ${formatarData(x.proximaData)}` : "—",
            { texto: `${SITUACAO[x.status].rotulo}${x.status !== "em_dia" && x.status !== "sem_registro" ? ` · ${x.motivo}` : ""}`, cor: SITUACAO[x.status].cor },
          ]),
        },
        {
          titulo: "Manutenções realizadas", vazio: "Nenhuma manutenção registrada.",
          colunas: [{ titulo: "Data" }, { titulo: "Tipo" }, { titulo: "Serviço" }, { titulo: "Km", direita: true }],
          linhas: linhasManutencao.map((m) => [formatarData(m.data), m.tipo, m.servico, m.km === null ? "—" : numero(m.km)]),
        },
        {
          titulo: "Itens não realizados em atenção", vazio: "Nenhum item ficou sem fazer com observação.",
          nota: "O item sai desta lista quando uma manutenção posterior o realiza.",
          colunas: [{ titulo: "Manutenção" }, { titulo: "Grupo" }, { titulo: "Item" }, { titulo: "Observação" }, { titulo: "Km", direita: true }],
          linhas: atencao.map((a) => [formatarData(a.data), a.grupo, a.item, a.observacao, numero(a.km)]),
        },
        {
          titulo: "Histórico de abastecimentos", vazio: "Nenhum abastecimento registrado.",
          colunas: [{ titulo: "Data e hora" }, { titulo: "Km", direita: true }, { titulo: "Km rodados", direita: true }, { titulo: "Litros", direita: true }, { titulo: "Valor", direita: true }, { titulo: "Km/L", direita: true }],
          linhas: abast.map((a) => [
            `${formatarData(a.data)}${a.hora ? ` ${a.hora}` : ""}`, numero(a.km), a.kmRodados === null ? "—" : numero(a.kmRodados), a.litros.toLocaleString("pt-BR"),
            a.valor ? a.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—", a.kmPorLitro === null ? "—" : a.kmPorLitro.toLocaleString("pt-BR", { maximumFractionDigits: 1 }),
          ]),
        },
        {
          titulo: "Ocorrências", vazio: "Nenhuma ocorrência registrada.",
          colunas: [{ titulo: "Data" }, { titulo: "Descrição" }, { titulo: MODO_DEMO ? "Status" : "Responsável" }],
          linhas: ocorrenciasDoVeiculo.map((o): Celula[] => [formatarData(o.data), o.descricao, COR_OCORRENCIA[o.situacao] ? { texto: o.situacao, cor: COR_OCORRENCIA[o.situacao]! } : o.situacao]),
        },
      ],
    });
    abrirDocumento({ titulo: "Extrato do veículo", html, arquivo: nomeArquivoDocumento("Extrato do veiculo", rotulo), telaCheia: true });
  }

  // O clique em Ver extrato só escolhe o veículo: o relatório abre na hora, em tela cheia, e a escolha é desfeita para o próximo clique.
  useEffect(() => {
    if (!veiculo) return;
    abrirRelatorio(veiculo);
    onFechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [veiculo]);

  return null;
}
