// Relatório da manutenção de veículo (Veículos > Manutenção), aberto no visualizador do sistema para imprimir ou
// salvar em PDF. Os serviços saem separados por grupo de ações, cada um num cartão. Todo texto informado passa por
// escaparHtml; a data sai em horário de Brasília.
import { escaparHtml } from "./gemape.ts";
import { cabecalhoRelatorio, campoRelatorio, paginaRelatorio } from "./relatorio-padrao.ts";
import { gruposDaManutencao, locaisDaManutencao, rotuloDoLocal, type ManutencaoVeiculo } from "./registros-veiculo.ts";

const moeda = (n: number | undefined) => (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }).replace(/ /g, " ");
const dia = (data: string) => `${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(0, 4)}`;

export function montarManutencaoHtml(
  m: ManutencaoVeiculo,
  // `logoUrl` é o endereço completo da logomarca (o relatório abre num visualizador, sem endereço base); sem ele, sai sem imagem.
  contexto: { empresa: string; veiculo: string; nomeGrupo: (acaoId: string) => string | undefined; logoUrl?: string },
): string {
  const grupos = gruposDaManutencao(m);
  const corretiva = m.tipo === "Corretiva";
  const locais = locaisDaManutencao(m);
  const local = locais.length === 0 ? "—" : locais.map(rotuloDoLocal).join(" · ");
  const campo = campoRelatorio;

  const cartoes = grupos
    .map((g) => {
      const nome = contexto.nomeGrupo(g.acaoId) ?? (g.nome || "Grupo removido de Parâmetros");
      const acoes = g.itens.length === 0
        ? `<li class="vazio">Serviço do grupo sem ações detalhadas.</li>`
        : g.itens
            .map((i) => `<li><span class="marca">✔</span><div><strong>${escaparHtml(i.nome)}</strong>${i.observacao ? `<div class="obs">${escaparHtml(i.observacao)}</div>` : ""}</div></li>`)
            .join("");
      const naoFeitos = (g.naoRealizados ?? [])
        .map((n) => `<li><span class="marca nao">✖</span><div><strong>${escaparHtml(n.nome)}</strong> <span class="obs">(não realizado)</span><div class="obs">${escaparHtml(n.observacao)}</div></div></li>`)
        .join("");
      return `<section class="cartao"><h3>${escaparHtml(nome)}</h3><ul>${acoes}${naoFeitos}</ul></section>`;
    })
    .join("");
  const resumoGrupos = `${grupos.length} ${grupos.length === 1 ? "grupo" : "grupos"} de serviço`;

  return paginaRelatorio({
    titulo: `Manutenção ${contexto.veiculo} - ${dia(m.data)}`,
    cabecalho: cabecalhoRelatorio({ titulo: "Relatório de manutenção", subtitulos: [contexto.veiculo, `${m.tipo} em ${dia(m.data)}`], empresa: contexto.empresa, logoUrl: contexto.logoUrl }),
    css: `
          .problema { background: #fffbeb; border-left: 4px solid #b45309; border-radius: 6px; padding: 8px 12px; margin-bottom: 14px; }
          h2 small { font-weight: normal; color: #64748b; font-size: 9pt; margin-left: 6px; }
          .cartao { border: 1px solid #cbd5e1; border-radius: 10px; margin-bottom: 10px; overflow: hidden; page-break-inside: avoid; }
          .cartao h3 { margin: 0; padding: 8px 14px; background: #0A007C; color: #fff; font-size: 10.5pt; }
          .cartao ul { list-style: none; margin: 0; padding: 6px 14px 8px; }
          .cartao li { display: flex; gap: 10px; padding: 5px 0; border-bottom: 1px dashed #e2e8f0; }
          .cartao li:last-child { border-bottom: 0; }
          .marca { color: #15803d; font-weight: bold; }
          .marca.nao { color: #b45309; }
          .local-nome { font-size: 10.5pt; font-weight: bold; margin: 10px 0 4px; }
          .local-info { color: #475569; font-size: 9pt; margin: 0 0 4px; }
          .obs { color: #475569; font-size: 9pt; margin-top: 1px; }
          .custos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 4px; }
          .custos .campo.total { background: #0A007C; }
          .custos .campo.total .rotulo, .custos .campo.total .conteudo { color: #fff; }`,
    corpo: `
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
        <h2>Custos por local <small>${escaparHtml(`${locais.length} ${locais.length === 1 ? "local" : "locais"}`)}</small></h2>
        ${locais.map((l) => `
        <div class="local-nome">${escaparHtml(rotuloDoLocal(l))}</div>
        ${l.descricao ? `<p class="local-info"><strong>Serviço:</strong> ${escaparHtml(l.descricao)}</p>` : ""}
        ${l.condicaoPagamento ? `<p class="local-info"><strong>Pagamento combinado:</strong> ${escaparHtml(l.condicaoPagamento)}</p>` : ""}
        <div class="custos">
          ${campo("Peças", moeda(l.custoPecas))}
          ${campo("Mão de obra", moeda(l.custoMaoDeObra))}
          ${campo("Total do local", moeda(l.custoTotal))}
        </div>`).join("")}
        <h2>Total da manutenção</h2>
        <div class="custos">
          ${campo("Peças", moeda(m.custoPecas))}
          ${campo("Mão de obra", moeda(m.custoMaoDeObra))}
          <div class="campo total"><span class="rotulo">Total</span><span class="conteudo">${escaparHtml(moeda(m.custoTotal))}</span></div>
        </div>`}
`,
  });
}
