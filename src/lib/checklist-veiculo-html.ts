// HTML do relatório do check list de veículos (decisão 63), aberto no visualizador do sistema para
// imprimir ou salvar em PDF. Todo texto informado passa por escaparHtml; foto só entra se for imagem.
import { escaparHtml } from "./gemape.ts";
import type { ChecklistVeiculo } from "./checklist-veiculo.ts";
import { resumoChecklist } from "./checklist-veiculo.ts";

const TZ = "America/Sao_Paulo";
const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const dia = (data: string) => `${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(0, 4)}`;

const COR: Record<string, string> = { OK: "#15803d", NOK: "#b91c1c", "N.A.": "#475569" };

// `objeto` troca o rótulo do item (veículo ou equipamento): o relatório é o mesmo nos dois módulos.
export function montarChecklistHtml(c: Pick<ChecklistVeiculo, "codigo" | "veiculoRotulo" | "tipoVeiculo" | "periodicidade" | "data" | "responsavelNome" | "status" | "concluidoEm" | "itens">, empresa: string, objeto = "veículo"): string {
  const Objeto = objeto.charAt(0).toUpperCase() + objeto.slice(1);
  const r = resumoChecklist(c);
  const grupos = [...new Set(c.itens.map((i) => i.grupo))];
  const blocos = grupos
    .map((g) => {
      const linhas = c.itens
        .filter((i) => i.grupo === g)
        .map((i) => {
          const fotos = i.fotos
            .filter((f) => f.startsWith("data:image/"))
            .map((f) => `<img src="${escaparHtml(f)}" style="height: 70px; margin: 3px 3px 0 0; border: 1px solid #999;" alt="Foto do item">`)
            .join("");
          const pendencia = i.avaliacao !== "NOK"
            ? ""
            : `<br><em>${i.ocorrenciaCodigo ? `Ocorrência ${escaparHtml(i.ocorrenciaCodigo)}. ` : ""}${
                i.resolucao ? `Pendência resolvida em ${escaparHtml(dataHora(i.resolucao.resolvidaEm))}: ${escaparHtml(i.resolucao.descricao)}` : "Pendência aberta."
              }</em>`;
          return `<tr>
            <td style="border: 1px solid #000; padding: 5px;">${escaparHtml(i.nome)}</td>
            <td style="border: 1px solid #000; padding: 5px; text-align: center; font-weight: bold; color: ${COR[i.avaliacao ?? ""] ?? "#000"};">${escaparHtml(i.avaliacao ?? "—")}</td>
            <td style="border: 1px solid #000; padding: 5px;">${escaparHtml(i.observacao || "—")}${pendencia}${fotos ? `<div>${fotos}</div>` : ""}</td>
          </tr>`;
        })
        .join("");
      return `<h3 style="margin: 14px 0 4px; font-size: 11pt;">${escaparHtml(g)}</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead><tr style="background: #eee;">
            <th style="border: 1px solid #000; padding: 5px; width: 38%;">Item</th>
            <th style="border: 1px solid #000; padding: 5px; width: 9%;">Avaliação</th>
            <th style="border: 1px solid #000; padding: 5px;">Observação</th>
          </tr></thead><tbody>${linhas}</tbody></table>`;
    })
    .join("");

  return `
    <html>
      <head>
        <title>Check list ${escaparHtml(c.codigo)} - ${escaparHtml(c.veiculoRotulo)}</title>
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
          <div class="title">Check list de ${escaparHtml(objeto)} ${escaparHtml(c.codigo)}</div>
          <strong>${escaparHtml(empresa)}</strong>
        </div>
        <p>
          <strong>${escaparHtml(Objeto)}:</strong> ${escaparHtml(c.veiculoRotulo)}<br>
          <strong>Tipo de ${escaparHtml(objeto)}:</strong> ${escaparHtml(c.tipoVeiculo || "—")}<br>
          <strong>Periodicidade:</strong> ${escaparHtml(c.periodicidade || "Avulso (sem periodicidade)")}<br>
          <strong>Data:</strong> ${escaparHtml(dia(c.data))}<br>
          <strong>Responsável pelo check list:</strong> ${escaparHtml(c.responsavelNome || "—")}<br>
          <strong>Situação:</strong> ${escaparHtml(c.status)}${c.concluidoEm ? ` em ${escaparHtml(dataHora(c.concluidoEm))}` : ""}
        </p>
        <p>
          <strong>Resumo:</strong> ${r.total} itens, ${r.ok} OK, ${r.nok} NOK, ${r.na} N.A.;
          ${r.pendenciasAbertas} pendência(s) aberta(s).
        </p>
        ${blocos}
        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer;">Imprimir ou salvar em PDF</button>
        </div>
      </body>
    </html>`;
}
