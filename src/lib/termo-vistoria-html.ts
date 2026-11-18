// HTML do Relatório de Vistoria Periódica de ferramentas. Todo texto informado, inclusive a
// observação digitada, passa por escaparHtml, como nos termos de Encerramento e de Responsabilidade.
import { escaparHtml } from "./gemape.ts";
import { formatarCnpj } from "./formatacao-cadastral.ts";
import { BOTAO_IMPRIMIR, CSS_TERMO, cabecalhoRelatorio, paginaRelatorio } from "./relatorio-padrao.ts";
import { TEXTOS_PADRAO, montarTextoDoTermo } from "./termos-ferramentas-texto.ts";

export interface DadosTermoVistoria {
  empresa: { razao_social: string; cnpj: string };
  caixa: { codigo?: string | null | undefined; nome?: string | null | undefined } | undefined;
  responsavel: string | null | undefined;
  data: string;
  /** Texto cadastrado em Parâmetros Específicos; sem ele, vale o texto padrão. */
  texto?: string | undefined;
  linhas: {
    codigo?: string | null | undefined;
    nome?: string | null | undefined;
    conformidade: string;
    estado: string;
    observacao: string;
  }[];
}

export function montarTermoVistoriaHtml(dados: DadosTermoVistoria): string {
  const { caixa } = dados;
  const itensHtml = dados.linhas
    .map(
      (it, index) => `
        <tr>
          <td style="border: 1px solid #000; padding: 6px; text-align: center;">${index + 1}</td>
          <td style="border: 1px solid #000; padding: 6px;">${escaparHtml(it.codigo || "—")}</td>
          <td style="border: 1px solid #000; padding: 6px;">${escaparHtml(it.nome || "—")}</td>
          <td style="border: 1px solid #000; padding: 6px; text-align: center;">${escaparHtml(it.conformidade)}</td>
          <td style="border: 1px solid #000; padding: 6px;">${escaparHtml(it.estado)}</td>
          <td style="border: 1px solid #000; padding: 6px;">${escaparHtml(it.observacao || "—")}</td>
        </tr>
      `,
    )
    .join("");

  // Meio-dia local evita que a data em UTC caia no dia anterior.
  const dataObj = new Date(`${dados.data}T12:00:00`);
  const dataFormatada = dataObj.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const texto = montarTextoDoTermo(dados.texto ?? TEXTOS_PADRAO.vistoria, {
    empregado: dados.responsavel, empresa: dados.empresa.razao_social, cnpj: formatarCnpj(dados.empresa.cnpj), caixa: caixa?.codigo, data: dataFormatada,
  });

  return paginaRelatorio({
    titulo: `Termo de Vistoria Periódica - Caixa ${caixa?.codigo || ""}`,
    cabecalho: cabecalhoRelatorio({ titulo: "Relatório de Vistoria Periódica de Ferramentas", subtitulos: [`CNPJ: ${formatarCnpj(dados.empresa.cnpj)}`], empresa: dados.empresa.razao_social }),
    css: CSS_TERMO,
    corpo: `<div class="termo">
          <div class="info">
            <p><strong>DATA DA VISTORIA:</strong> ${dataFormatada}<br>
            <strong>CAIXA Nº:</strong> ${escaparHtml(caixa?.codigo || "N/A")}<br>
            <strong>RESPONSÁVEL PELA CAIXA (EMPREGADO):</strong> ${escaparHtml(dados.responsavel || "NÃO ATRIBUÍDO")}</p>
          </div>

          <div class="content">
            ${texto.antes}
          </div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Código</th>
                <th>Descrição</th>
                <th>Status</th>
                <th>Estado</th>
                <th>Observações/Ações</th>
              </tr>
            </thead>
            <tbody>
              ${itensHtml}
            </tbody>
          </table>

          <div class="content">
            ${texto.depois}
          </div>

          <div class="signatures">
            <div class="sig-box">
              Assinatura do Responsável pela Vistoria
            </div>
            <div class="sig-box">
              Assinatura do Empregado (Ciente)
            </div>
          </div>
        </div>`,
    botao: BOTAO_IMPRIMIR("Imprimir Relatório"),
  });
}
