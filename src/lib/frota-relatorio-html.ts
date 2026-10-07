// HTML do relatório da Frota (módulo Veículos), aberto no visualizador do sistema para imprimir ou
// salvar em PDF. Todo texto informado passa por escaparHtml; a data sai em horário de Brasília.
import { escaparHtml } from "./gemape.ts";

const TZ = "America/Sao_Paulo";

export type LinhaFrota = {
  veiculo: string;
  responsavel: string;
  situacao: string;
  km: number;
  vencidas: number;
};

export function montarFrotaHtml(dados: { empresa: string; geradoEm: string; busca: string; linhas: LinhaFrota[] }): string {
  const { empresa, geradoEm, busca, linhas } = dados;
  const quando = new Date(geradoEm).toLocaleString("pt-BR", {
    timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).replace(", ", " ");
  const conta = (s: string) => linhas.filter((l) => l.situacao === s).length;
  const celula = "border: 1px solid #000; padding: 5px;";
  const corpo = linhas.length === 0
    ? `<tr><td colspan="5" style="${celula} text-align: center;">Nenhum veículo para listar.</td></tr>`
    : linhas
        .map((l) => `<tr>
          <td style="${celula}">${escaparHtml(l.veiculo)}</td>
          <td style="${celula}">${escaparHtml(l.responsavel || "—")}</td>
          <td style="${celula}">${escaparHtml(l.situacao)}</td>
          <td style="${celula} text-align: right;">${l.km.toLocaleString("pt-BR")}</td>
          <td style="${celula}${l.vencidas > 0 ? " color: #b91c1c; font-weight: bold;" : ""}">${l.vencidas > 0 ? `${l.vencidas} vencida(s)` : "Sem vencidas"}</td>
        </tr>`)
        .join("");

  return `
    <html>
      <head>
        <title>Relatório da frota - ${escaparHtml(empresa)}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.3; padding: 25px; font-size: 10pt; }
          .header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .title { font-size: 14pt; font-weight: bold; text-transform: uppercase; }
          tr { page-break-inside: avoid; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Relatório da frota</div>
          <strong>${escaparHtml(empresa)}</strong>
        </div>
        <p>
          <strong>Emitido em:</strong> ${escaparHtml(quando)}${busca ? `<br><strong>Busca:</strong> ${escaparHtml(busca)}` : ""}<br>
          <strong>Total:</strong> ${linhas.length} veículo(s): ${conta("Ativo")} ativo(s), ${conta("Em manutenção")} em manutenção, ${conta("Inativo")} inativo(s).
        </p>
        <table style="width: 100%; border-collapse: collapse;">
          <thead><tr style="background: #eee;">
            <th style="${celula}">Veículo</th>
            <th style="${celula}">Responsável</th>
            <th style="${celula}">Situação</th>
            <th style="${celula}">Km atual</th>
            <th style="${celula}">Preventivas</th>
          </tr></thead>
          <tbody>${corpo}</tbody>
        </table>
        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer;">Imprimir ou salvar em PDF</button>
        </div>
      </body>
    </html>`;
}
