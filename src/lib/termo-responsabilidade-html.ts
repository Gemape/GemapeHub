// HTML do Termo de Responsabilidade Individual de ferramentas. Todo texto informado passa
// por escaparHtml, como no Termo de Encerramento.
import { escaparHtml } from "./gemape.ts";
import { formatarCnpj } from "./formatacao-cadastral.ts";
import { BOTAO_IMPRIMIR, CSS_TERMO, cabecalhoRelatorio, paginaRelatorio } from "./relatorio-padrao.ts";
import { TEXTOS_PADRAO, montarTextoDoTermo } from "./termos-ferramentas-texto.ts";

export interface DadosTermoResponsabilidade {
  empresa: { razao_social: string; cnpj: string };
  empregado: { nome: string; cpf: string };
  caixaCodigo?: string | null | undefined;
  data: string;
  /** Texto cadastrado em Parâmetros Específicos; sem ele, vale o texto padrão. */
  texto?: string | undefined;
  linhas: {
    codigo?: string | null | undefined;
    nome?: string | null | undefined;
    marca?: string | null | undefined;
    quantidade: number;
    estado: string;
  }[];
}

export function montarTermoResponsabilidadeHtml(dados: DadosTermoResponsabilidade): string {
  const itensHtml = dados.linhas
    .map((it, index) => {
      return `
        <tr>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${index + 1}</td>
          <td style="border: 1px solid #000; padding: 8px;">${escaparHtml(it.codigo || "—")}</td>
          <td style="border: 1px solid #000; padding: 8px;">${escaparHtml(it.nome || "—")}</td>
          <td style="border: 1px solid #000; padding: 8px;">${escaparHtml(it.marca || "—")}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${it.quantidade}</td>
          <td style="border: 1px solid #000; padding: 8px;">${escaparHtml(it.estado)}</td>
        </tr>
      `;
    })
    .join("");

  // Meio-dia local evita que a data em UTC caia no dia anterior.
  const dataObj = new Date(`${dados.data}T12:00:00`);
  const dataFormatada = dataObj.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const texto = montarTextoDoTermo(dados.texto ?? TEXTOS_PADRAO.entrega, {
    empregado: dados.empregado.nome, cpf: dados.empregado.cpf, empresa: dados.empresa.razao_social, cnpj: formatarCnpj(dados.empresa.cnpj), caixa: dados.caixaCodigo, data: dataFormatada,
  });

  return paginaRelatorio({
    titulo: `Termo de Responsabilidade Individual - ${dados.empregado.nome}`,
    cabecalho: cabecalhoRelatorio({ titulo: "Termo de Responsabilidade Individual de Ferramentas", subtitulos: [`CNPJ: ${formatarCnpj(dados.empresa.cnpj)}`], empresa: dados.empresa.razao_social }),
    css: CSS_TERMO,
    corpo: `<div class="termo">
          <div class="content">
            ${texto.antes}
          </div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Código</th>
                <th>Descrição</th>
                <th>Marca</th>
                <th>Qtd</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${itensHtml}
            </tbody>
          </table>

          <div class="content">
            ${texto.depois}
          </div>

          <p style="text-align: right; margin-top: 30px;">Local e data: ____________________, ${dataFormatada}</p>

          <div class="signatures">
            <div class="sig-box">
              Assinatura do Empregado
            </div>
            <div class="sig-box">
              Assinatura do Responsável
            </div>
          </div>
        </div>`,
    botao: BOTAO_IMPRIMIR("Imprimir Termo"),
  });
}
