// HTML do relatório do check list de veículos (decisão 63), aberto no visualizador do sistema para
// imprimir ou salvar em PDF, no padrão visual dos relatórios (relatorio-padrao.ts). Todo texto informado
// passa por escaparHtml; foto só entra se for imagem.
import { escaparHtml } from "./gemape.ts";
import type { ChecklistVeiculo } from "./checklist-veiculo.ts";
import { resumoChecklist } from "./checklist-veiculo.ts";
import { cabecalhoRelatorio, campoRelatorio, paginaRelatorio } from "./relatorio-padrao.ts";

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
            .map((f) => `<img src="${escaparHtml(f)}" style="height: 70px; margin: 3px 3px 0 0; border: 1px solid #cbd5e1; border-radius: 4px;" alt="Foto do item">`)
            .join("");
          const pendencia = i.avaliacao !== "NOK"
            ? ""
            : `<br><em>${i.ocorrenciaCodigo ? `Ocorrência ${escaparHtml(i.ocorrenciaCodigo)}. ` : ""}${
                i.resolucao ? `Pendência resolvida em ${escaparHtml(dataHora(i.resolucao.resolvidaEm))}: ${escaparHtml(i.resolucao.descricao)}` : "Pendência aberta."
              }</em>`;
          return `<tr>
            <td>${escaparHtml(i.nome)}</td>
            <td class="centro" style="font-weight: bold; color: ${COR[i.avaliacao ?? ""] ?? "#1e293b"};">${escaparHtml(i.avaliacao ?? "—")}</td>
            <td>${escaparHtml(i.observacao || "—")}${pendencia}${fotos ? `<div>${fotos}</div>` : ""}</td>
          </tr>`;
        })
        .join("");
      return `<h3>${escaparHtml(g)}</h3>
        <table class="padrao">
          <thead><tr>
            <th style="width: 38%;">Item</th>
            <th class="centro" style="width: 11%;">Avaliação</th>
            <th>Observação</th>
          </tr></thead><tbody>${linhas}</tbody></table>`;
    })
    .join("");

  return paginaRelatorio({
    titulo: `Check list ${c.codigo} - ${c.veiculoRotulo}`,
    cabecalho: cabecalhoRelatorio({ titulo: `Check list de ${objeto}`, subtitulos: [c.codigo, c.veiculoRotulo], empresa }),
    corpo: `
        <div class="grade">
          ${campoRelatorio(Objeto, c.veiculoRotulo)}
          ${campoRelatorio(`Tipo de ${objeto}`, c.tipoVeiculo || "—")}
          ${campoRelatorio("Periodicidade", c.periodicidade || "Avulso (sem periodicidade)")}
          ${campoRelatorio("Data", dia(c.data))}
          ${campoRelatorio("Responsável pelo check list", c.responsavelNome || "—")}
          ${campoRelatorio("Situação", `${c.status}${c.concluidoEm ? ` em ${dataHora(c.concluidoEm)}` : ""}`)}
        </div>
        <div class="resumo"><strong>Resumo:</strong> ${r.total} itens, ${r.ok} OK, ${r.nok} NOK, ${r.na} N.A.; ${r.pendenciasAbertas} pendência(s) aberta(s).</div>
        ${blocos}`,
  });
}
