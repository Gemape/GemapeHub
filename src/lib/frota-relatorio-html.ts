// HTML do relatório da Frota (módulo Veículos), aberto no visualizador do sistema para imprimir ou
// salvar em PDF, no padrão visual dos relatórios (relatorio-padrao.ts). Todo texto informado passa por
// escaparHtml; a data sai em horário de Brasília.
import { escaparHtml } from "./gemape.ts";
import { rotuloDaSituacao, type SituacaoColuna } from "./frota-situacao.ts";
import { cabecalhoRelatorio, paginaRelatorio } from "./relatorio-padrao.ts";

export type LinhaFrota = {
  veiculo: string;
  responsavel: string;
  situacao: string;
  km: number;
  // Média de consumo em km/L, dos abastecimentos (null = precisa de dois abastecimentos).
  mediaKmL?: number | null;
  // Preventivas, ocorrências e check list: vencida (vermelho), vencimento próximo (amarelo) ou em dia (verde); null = não se aplica (frota-situacao.ts).
  preventivas: SituacaoColuna;
  ocorrencias: SituacaoColuna;
  checklist: SituacaoColuna;
};

const COR_PONTO = { vencida: "#dc2626", proximo: "#eab308", em_dia: "#16a34a" } as const;
const celulaSituacao = (s: SituacaoColuna): string =>
  s === null
    ? "<td>—</td>"
    : `<td><span style="display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 6px; background: ${COR_PONTO[s.situacao]};"></span><span${s.situacao === "vencida" ? ' style="color: #b91c1c; font-weight: bold;"' : ""}>${escaparHtml(rotuloDaSituacao(s))}</span></td>`;

export function montarFrotaHtml(dados: { empresa: string; geradoEm: string; busca: string; linhas: LinhaFrota[] }): string {
  const { empresa, geradoEm, busca, linhas } = dados;
  const conta = (s: string) => linhas.filter((l) => l.situacao === s).length;
  const corpo = linhas.length === 0
    ? `<tr><td colspan="8" class="vazio">Nenhum veículo para listar.</td></tr>`
    : linhas
        .map((l) => `<tr>
          <td>${escaparHtml(l.veiculo)}</td>
          <td>${escaparHtml(l.responsavel || "—")}</td>
          <td>${escaparHtml(l.situacao)}</td>
          <td class="num">${l.km.toLocaleString("pt-BR")}</td>
          <td class="num">${l.mediaKmL == null ? "—" : l.mediaKmL.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</td>
          ${celulaSituacao(l.preventivas)}
          ${celulaSituacao(l.ocorrencias)}
          ${celulaSituacao(l.checklist)}
        </tr>`)
        .join("");

  return paginaRelatorio({
    titulo: `Relatório da frota - ${empresa}`,
    geradoEm,
    larga: true,
    // Colunas com largura própria (tabela fixa): a descrição do veículo ganha mais espaço e as etiquetas de situação cabem em até duas linhas; os números ficam à direita, com folga.
    css: "table.frota { table-layout: fixed; } table.frota td, table.frota th { overflow-wrap: anywhere; } table.frota th.num, table.frota td.num { padding-right: 12px; white-space: nowrap; } table.frota td { vertical-align: middle; line-height: 1.35; }",
    cabecalho: cabecalhoRelatorio({ titulo: "Relatório da frota", subtitulos: busca ? [`Busca: ${busca}`] : [], empresa }),
    corpo: `
        <div class="resumo"><strong>Total:</strong> ${linhas.length} veículo(s): ${conta("Ativo")} ativo(s), ${conta("Em manutenção")} em manutenção, ${conta("Inativo")} inativo(s).</div>
        <table class="padrao frota">
          <colgroup><col style="width: 23%"><col style="width: 13%"><col style="width: 7%"><col style="width: 8%"><col style="width: 8%"><col style="width: 14%"><col style="width: 14%"><col style="width: 13%"></colgroup>
          <thead><tr>
            <th>Veículo</th>
            <th>Responsável</th>
            <th>Situação</th>
            <th class="num">Km atual</th>
            <th class="num">Média km/L</th>
            <th>Preventivas</th>
            <th>Ocorrências</th>
            <th>Check list</th>
          </tr></thead>
          <tbody>${corpo}</tbody>
        </table>`,
  });
}
