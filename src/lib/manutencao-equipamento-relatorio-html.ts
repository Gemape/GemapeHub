// Relatório da ordem de serviço de manutenção de equipamento (Equipamentos > Manutenção), aberto no visualizador do sistema para imprimir ou salvar em PDF.
// Segue o relatório de manutenção de veículos: dados da ordem, as ações realizadas em cartões e os custos. Todo texto informado passa por escaparHtml.
import { escaparHtml } from "./gemape.ts";
import { cabecalhoRelatorio, campoRelatorio, paginaRelatorio } from "./relatorio-padrao.ts";
import { custoDaManutencaoEq, statusDaOsEq, type ManutencaoEquipamentoRegistro } from "./registros-equipamento.ts";

const moeda = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }).replace(/\u00a0/g, " ");
const dia = (data: string) => `${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(0, 4)}`;

export function montarManutencaoEquipamentoHtml(
  m: ManutencaoEquipamentoRegistro,
  // `logoUrl` é o endereço completo da logomarca (o relatório abre num visualizador, sem endereço base); sem ele, sai sem imagem.
  contexto: { empresa: string; equipamento: string; logoUrl?: string },
): string {
  const status = statusDaOsEq(m);
  const concluida = status === "Concluída";
  const campo = campoRelatorio;
  const cartoes = m.acoes
    .map((a) => {
      const itens = a.subitens.length === 0
        ? `<li class="vazio">Serviço do grupo sem ações detalhadas.</li>`
        : a.subitens.map((s) => `<li><span class="marca">✔</span><div><strong>${escaparHtml(s)}</strong></div></li>`).join("");
      return `<section class="cartao"><h3>${escaparHtml(a.nome)}</h3><ul>${itens}</ul></section>`;
    })
    .join("");
  const total = custoDaManutencaoEq(m);

  return paginaRelatorio({
    titulo: `Manutenção ${contexto.equipamento} - ${dia(m.abertaEm ?? m.data)}`,
    cabecalho: cabecalhoRelatorio({ titulo: "Relatório de manutenção", subtitulos: [contexto.equipamento, `${m.tipo} · ${status}`], empresa: contexto.empresa, logoUrl: contexto.logoUrl }),
    css: `
          .problema { background: #fffbeb; border-left: 4px solid #b45309; border-radius: 6px; padding: 8px 12px; margin-bottom: 14px; }
          h2 small { font-weight: normal; color: #64748b; font-size: 9pt; margin-left: 6px; }
          .cartao { border: 1px solid #cbd5e1; border-radius: 10px; margin-bottom: 10px; overflow: hidden; page-break-inside: avoid; }
          .cartao h3 { margin: 0; padding: 8px 14px; background: #0A007C; color: #fff; font-size: 10.5pt; }
          .cartao ul { list-style: none; margin: 0; padding: 6px 14px 8px; }
          .cartao li { display: flex; gap: 10px; padding: 5px 0; border-bottom: 1px dashed #e2e8f0; }
          .cartao li:last-child { border-bottom: 0; }
          .marca { color: #15803d; font-weight: bold; }
          .custos { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 4px; }
          .custos .campo.total { background: #0A007C; }
          .custos .campo.total .rotulo, .custos .campo.total .conteudo { color: #fff; }`,
    corpo: `
        <div class="grade">
          ${campo("Equipamento", contexto.equipamento)}
          ${campo("Situação", status)}
          ${campo("Abertura", dia(m.abertaEm ?? m.data))}
          ${campo(concluida ? "Conclusão" : "Previsão de conclusão", concluida ? dia(m.data) : m.dataPrevista ? dia(m.dataPrevista) : "—")}
          ${campo("Técnico responsável", m.responsavel || "—")}
          ${campo("Horímetro", concluida ? `${m.horimetro.toLocaleString("pt-BR")} h` : "—")}
          ${campo("Local", m.localNome || "Empresa")}
          ${campo("Tempo parado", m.horasParada ? `${m.horasParada.toLocaleString("pt-BR")} h` : "—")}
        </div>
        ${m.observacao ? `<div class="problema"><strong>Observação:</strong> ${escaparHtml(m.observacao)}</div>` : ""}
        <h2>Serviços realizados <small>${escaparHtml(`${m.acoes.length} ${m.acoes.length === 1 ? "grupo" : "grupos"} de serviço`)}</small></h2>
        ${cartoes || `<p class="vazio">Nenhum serviço detalhado${concluida ? "" : " (a ordem ainda não foi concluída)"}.</p>`}
        <h2>Custos</h2>
        <div class="custos">
          ${campo("Peças", moeda(m.custoPecas))}
          ${campo("Mão de obra", moeda(m.custoMaoDeObra))}
          <div class="campo total"><span class="rotulo">Total</span><span class="conteudo">${escaparHtml(moeda(total))}</span></div>
        </div>`,
  });
}
