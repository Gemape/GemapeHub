// HTML do Termo de Baixa Definitiva de Uniforme. Todo texto informado passa por
// escaparHtml, como nos termos de Encerramento e de Responsabilidade.
import { comTamanho, escaparHtml, formatarData, formatarMoeda } from "./gemape.ts";

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

  return `
        <html>
          <head>
            <title>Termo de Baixa - Uniforme</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
              .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #000; padding-bottom: 20px; }
              .title { font-size: 20px; font-weight: bold; text-transform: uppercase; }
              .content { margin-bottom: 40px; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { border: 1px solid #000; padding: 10px; text-align: left; }
              .footer { margin-top: 60px; }
              .signatures { display: flex; justify-content: space-between; margin-top: 80px; }
              .sig-box { width: 45%; border-top: 1px solid #000; text-align: center; padding-top: 10px; }
              .total-box { text-align: right; font-weight: bold; font-size: 18px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">Termo de Baixa Definitiva de Uniforme</div>
              <div style="margin-top: 10px; font-weight: bold;">${escaparHtml(empresa?.razao_social)}</div>
              <div>CNPJ: ${escaparHtml(empresa?.cnpj)}</div>
            </div>

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

              <div style="margin-top: 30px; border: 1px solid #ddd; padding: 15px; background: #f9f9f9;">
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

            <script>window.print();</script>
          </body>
        </html>
      `;
}
