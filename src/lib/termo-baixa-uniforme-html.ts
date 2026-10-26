// HTML do Termo de Baixa Definitiva de Uniforme. Todo texto informado passa por
// escaparHtml, como nos termos de Encerramento e de Responsabilidade.
import { comTamanho, escaparHtml, formatarData, formatarMoeda } from "./gemape.ts";
import { formatarCnpj } from "./formatacao-cadastral.ts";
import { BOTAO_IMPRIMIR, CSS_TERMO, cabecalhoRelatorio, paginaRelatorio } from "./relatorio-padrao.ts";

export interface DadosTermoBaixaUniforme {
  empresa: { razao_social: string; cnpj: string; nome_fantasia: string } | undefined;
  empregado: { nome: string } | undefined;
  data: string;
  motivo: string;
  onus: string;
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

  return paginaRelatorio({
    titulo: "Termo de Baixa - Uniforme",
    cabecalho: cabecalhoRelatorio({ titulo: "Termo de Baixa Definitiva de Uniforme", subtitulos: [`CNPJ: ${formatarCnpj(empresa?.cnpj ?? "")}`], empresa: empresa?.razao_social }),
    css: CSS_TERMO,
    corpo: `<div class="termo">
            <div class="content">
              <p>Registramos nesta data, <strong>${formatarData(dados.data)}</strong>, a baixa definitiva
              dos seguintes itens de uniforme vinculados ao colaborador(a)
              <strong>${escaparHtml(empregado?.nome || "N/A")}</strong>:</p>

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

              <p style="margin-top: 30px;">O(A) empregado(a) está ciente da baixa dos itens acima e das responsabilidades financeiras caso o ônus seja do colaborador.</p>
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
