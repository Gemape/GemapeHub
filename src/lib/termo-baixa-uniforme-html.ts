// HTML do Termo de Baixa Definitiva de Uniforme. Todo texto informado passa por
// escaparHtml, como nos termos de Encerramento e de Responsabilidade.
import { comTamanho, escaparHtml, formatarData, formatarMoeda } from "./gemape.ts";
import { formatarCnpj } from "./formatacao-cadastral.ts";
import { BOTAO_IMPRIMIR, CSS_TERMO, cabecalhoRelatorio, paginaRelatorio } from "./relatorio-padrao.ts";
import { montarTextoDoTermo } from "./termos-ferramentas-texto.ts";
import { lerTextosTermosUniforme } from "./uniforme-termos-texto.ts";

export interface DadosTermoBaixaUniforme {
  empresa: { razao_social: string; cnpj: string; nome_fantasia: string } | undefined;
  empregado: { nome: string } | undefined;
  data: string;
  motivo: string;
  onus: string;
  // Texto cadastrado em Parâmetros > Uniformes > Parâmetros Específicos; sem ele valem o guardado no navegador ou o padrão.
  texto?: string | undefined;
  linhas: {
    nome?: string | null | undefined;
    tamanho?: string | null | undefined;
    quantidade: number;
    estado: string;
  }[];
}

export function montarTermoBaixaUniformeHtml(dados: DadosTermoBaixaUniforme): string {
  const { empresa, empregado } = dados;
  // O termo de baixa não traz preço: os valores ficam zerados.
  const linhasHtml = dados.linhas
    .map(
      (i) => `
                      <tr>
                        <td>${escaparHtml(i.nome)}${comTamanho(i.tamanho)}</td>
                        <td>${i.quantidade}</td>
                        <td>${escaparHtml(i.estado)}</td>
                        <td>${escaparHtml(dados.motivo)}</td>
                        <td>${formatarMoeda(0)}</td>
                        <td>${formatarMoeda(0)}</td>
                      </tr>
                    `,
    )
    .join("");

  const texto = montarTextoDoTermo(dados.texto ?? lerTextosTermosUniforme().baixa, {
    empregado: empregado?.nome || "N/A", empresa: empresa?.razao_social, cnpj: formatarCnpj(empresa?.cnpj ?? ""), data: formatarData(dados.data),
  });

  return paginaRelatorio({
    titulo: "Termo de Baixa - Uniforme",
    cabecalho: cabecalhoRelatorio({ titulo: "Termo de Baixa Definitiva de Uniforme", subtitulos: [`CNPJ: ${formatarCnpj(empresa?.cnpj ?? "")}`], empresa: empresa?.razao_social }),
    css: CSS_TERMO,
    corpo: `<div class="termo">
            <div class="content">
              ${texto.antes}

              <table>
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Qtd</th>
                    <th>Estado</th>
                    <th>Motivo</th>
                    <th>Valor Unit.</th>
                    <th>Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${linhasHtml}
                </tbody>
              </table>

              <div class="total-box">VALOR TOTAL DA BAIXA: ${formatarMoeda(0)}</div>

              <div style="margin-top: 30px; background: #f9f9f9;">
                <strong>Motivo:</strong> ${escaparHtml(dados.motivo)}<br>
                <strong>Ônus:</strong> ${escaparHtml(dados.onus)}
              </div>

              ${texto.depois}
            </div>

            <div class="signatures">
              <div class="sig-box">
                <strong>${escaparHtml(empregado?.nome || "___________________")}</strong><br>Empregado(a)
              </div>
              <div class="sig-box">
                <strong>Responsável</strong><br>${escaparHtml(empresa?.nome_fantasia)}
              </div>
            </div>
        </div>`,
    botao: BOTAO_IMPRIMIR("Imprimir Termo") + "<script>window.print();</script>",
  });
}
