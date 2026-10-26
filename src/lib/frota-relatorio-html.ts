// HTML do relatório da Frota (módulo Veículos), aberto no visualizador do sistema para imprimir ou
// salvar em PDF, no padrão visual dos relatórios (relatorio-padrao.ts). Todo texto informado passa por
// escaparHtml; a data sai em horário de Brasília.
import { escaparHtml } from "./gemape.ts";
import { cabecalhoRelatorio, paginaRelatorio } from "./relatorio-padrao.ts";

export type LinhaFrota = {
  veiculo: string;
  responsavel: string;
  situacao: string;
  km: number;
  vencidas: number;
};

export function montarFrotaHtml(dados: { empresa: string; geradoEm: string; busca: string; linhas: LinhaFrota[] }): string {
  const { empresa, geradoEm, busca, linhas } = dados;
  const conta = (s: string) => linhas.filter((l) => l.situacao === s).length;
  const corpo = linhas.length === 0
    ? `<tr><td colspan="5" class="vazio">Nenhum veículo para listar.</td></tr>`
    : linhas
        .map((l) => `<tr>
          <td>${escaparHtml(l.veiculo)}</td>
          <td>${escaparHtml(l.responsavel || "—")}</td>
          <td>${escaparHtml(l.situacao)}</td>
          <td class="num">${l.km.toLocaleString("pt-BR")}</td>
          <td${l.vencidas > 0 ? ' style="color: #b91c1c; font-weight: bold;"' : ""}>${l.vencidas > 0 ? `${l.vencidas} vencida(s)` : "Sem vencidas"}</td>
        </tr>`)
        .join("");

  return paginaRelatorio({
    titulo: `Relatório da frota - ${empresa}`,
    geradoEm,
    cabecalho: cabecalhoRelatorio({ titulo: "Relatório da frota", subtitulos: busca ? [`Busca: ${busca}`] : [], empresa }),
    corpo: `
        <div class="resumo"><strong>Total:</strong> ${linhas.length} veículo(s): ${conta("Ativo")} ativo(s), ${conta("Em manutenção")} em manutenção, ${conta("Inativo")} inativo(s).</div>
        <table class="padrao">
          <thead><tr>
            <th>Veículo</th>
            <th>Responsável</th>
            <th>Situação</th>
            <th class="num">Km atual</th>
            <th>Preventivas</th>
          </tr></thead>
          <tbody>${corpo}</tbody>
        </table>`,
  });
}
