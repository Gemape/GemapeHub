// Relatório da manutenção de veículo (Veículos > Manutenção), aberto no visualizador do sistema para imprimir ou
// salvar em PDF. Os serviços saem separados por grupo de ações, cada um num cartão. Todo texto informado passa por
// escaparHtml; a data sai em horário de Brasília.
import { escaparHtml } from "./gemape.ts";
import { gruposDaManutencao, type ManutencaoVeiculo } from "./registros-veiculo.ts";

const TZ = "America/Sao_Paulo";
const moeda = (n: number | undefined) => (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }).replace(/ /g, " ");
const dia = (data: string) => `${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(0, 4)}`;

export function montarManutencaoHtml(
  m: ManutencaoVeiculo,
  contexto: { empresa: string; veiculo: string; nomeGrupo: (acaoId: string) => string | undefined },
): string {
  const grupos = gruposDaManutencao(m);
  const emitido = new Date().toLocaleString("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(", ", " ");
  const corretiva = m.tipo === "Corretiva";
  const local = m.local ? (m.local === "terceiro" ? `Terceiro${m.localNome ? `: ${m.localNome}` : ""}` : "Na própria empresa") : "—";
  const campo = (rotulo: string, valor: string) =>
    `<div class="campo"><span class="rotulo">${escaparHtml(rotulo)}</span><span class="valor">${escaparHtml(valor)}</span></div>`;

  const cartoes = grupos
    .map((g) => {
      const nome = contexto.nomeGrupo(g.acaoId) ?? (g.nome || "Grupo removido de Parâmetros");
      const acoes = g.itens.length === 0
        ? `<li class="vazio">Serviço do grupo sem ações detalhadas.</li>`
        : g.itens
            .map((i) => `<li><span class="marca">✔</span><div><strong>${escaparHtml(i.nome)}</strong>${i.observacao ? `<div class="obs">${escaparHtml(i.observacao)}</div>` : ""}</div></li>`)
            .join("");
      return `<section class="cartao"><h3>${escaparHtml(nome)}</h3><ul>${acoes}</ul></section>`;
    })
    .join("");
  const resumoGrupos = `${grupos.length} ${grupos.length === 1 ? "grupo" : "grupos"} de serviço`;

  return `
    <html>
      <head>
        <title>Manutenção ${escaparHtml(contexto.veiculo)} - ${escaparHtml(dia(m.data))}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; padding: 28px; font-size: 10pt; line-height: 1.4; }
          .topo { border-bottom: 3px solid #0A007C; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; }
          .titulo { font-size: 17pt; font-weight: bold; color: #0A007C; letter-spacing: .02em; text-transform: uppercase; }
          .empresa { font-size: 10pt; color: #475569; margin-top: 2px; }
          .selo { padding: 4px 12px; border-radius: 999px; font-weight: bold; font-size: 9pt; color: #fff; background: ${corretiva ? "#b45309" : "#0A007C"}; }
          .grade { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
          .campo { background: #f1f5f9; border-radius: 8px; padding: 8px 12px; }
          .rotulo { display: block; font-size: 7.5pt; letter-spacing: .08em; text-transform: uppercase; color: #64748b; }
          .valor { display: block; font-weight: bold; margin-top: 1px; }
          .problema { background: #fffbeb; border-left: 4px solid #b45309; border-radius: 6px; padding: 8px 12px; margin-bottom: 14px; }
          h2 { font-size: 11pt; margin: 18px 0 8px; color: #0A007C; }
          h2 small { font-weight: normal; color: #64748b; font-size: 9pt; margin-left: 6px; }
          .cartao { border: 1px solid #cbd5e1; border-radius: 10px; margin-bottom: 10px; overflow: hidden; page-break-inside: avoid; }
          .cartao h3 { margin: 0; padding: 8px 14px; background: #0A007C; color: #fff; font-size: 10.5pt; }
          .cartao ul { list-style: none; margin: 0; padding: 6px 14px 8px; }
          .cartao li { display: flex; gap: 10px; padding: 5px 0; border-bottom: 1px dashed #e2e8f0; }
          .cartao li:last-child { border-bottom: 0; }
          .marca { color: #15803d; font-weight: bold; }
          .obs { color: #475569; font-size: 9pt; margin-top: 1px; }
          .vazio { color: #64748b; font-style: italic; }
          .custos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 4px; }
          .custos .campo.total { background: #0A007C; }
          .custos .campo.total .rotulo, .custos .campo.total .valor { color: #fff; }
          .rodape { margin-top: 22px; padding-top: 8px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 8pt; text-align: right; }
          @media print { .no-print { display: none; } body { padding: 0; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="topo">
          <div>
            <div class="titulo">Relatório de manutenção</div>
            <div class="empresa">${escaparHtml(contexto.empresa)}</div>
          </div>
          <span class="selo">${escaparHtml(m.tipo)}</span>
        </div>
        <div class="grade">
          ${campo("Veículo", contexto.veiculo)}
          ${campo("Data", dia(m.data))}
          ${campo("Km do veículo", m.km.toLocaleString("pt-BR"))}
          ${campo("Local", local)}
        </div>
        ${corretiva && m.descricao ? `<div class="problema"><strong>Problema relatado:</strong> ${escaparHtml(m.descricao)}</div>` : ""}
        <h2>Serviços realizados <small>${escaparHtml(resumoGrupos)}</small></h2>
        ${cartoes || `<p class="vazio">Nenhum serviço detalhado.</p>`}
        ${m.custoTotal === undefined ? "" : `
        <h2>Custos</h2>
        <div class="custos">
          ${campo("Peças", moeda(m.custoPecas))}
          ${campo("Mão de obra", moeda(m.custoMaoDeObra))}
          <div class="campo total"><span class="rotulo">Total</span><span class="valor">${escaparHtml(moeda(m.custoTotal))}</span></div>
        </div>`}
        <div class="rodape">Emitido em ${escaparHtml(emitido)}</div>
        <div class="no-print" style="margin-top: 24px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer;">Imprimir ou salvar em PDF</button>
        </div>
      </body>
    </html>`;
}
