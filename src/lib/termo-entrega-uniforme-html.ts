// HTML do Termo de Entrega de Uniforme. Todo texto informado, inclusive empresa e empregado,
// passa por escaparHtml, como nos demais termos.
import { comTamanho, escaparHtml, formatarData } from "./gemape.ts";
import { formatarCnpj } from "./formatacao-cadastral.ts";

type Texto = string | null | undefined;

export interface DadosTermoEntregaUniforme {
  empresa: { razao_social: Texto; cnpj: Texto; nome_fantasia: Texto } | undefined;
  empregado: { nome: Texto; cpf: Texto } | undefined;
  data: string;
  linhas: {
    nome?: Texto;
    marca?: Texto;
    modelo?: Texto;
    tamanho?: Texto;
    quantidade: number;
    estado: string;
  }[];
}

export function montarTermoEntregaUniformeHtml(dados: DadosTermoEntregaUniforme): string {
  const { empresa, empregado } = dados;
  const linhasHtml = dados.linhas
    .map(
      (i) => `
                      <tr>
                        <td>${escaparHtml(i.nome)}${comTamanho(i.tamanho)}</td>
                        <td>${escaparHtml(i.marca)} ${escaparHtml(i.modelo)}</td>
                        <td>${i.quantidade}</td>
                        <td>${escaparHtml(i.estado)}</td>
                      </tr>
                    `,
    )
    .join("");

  return `
    <html>
      <head>
        <title>Termo de Entrega - ${escaparHtml(empregado?.nome)}</title>
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
          @print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Termo de Entrega de Uniforme</div>
          <div style="margin-top: 10px; font-weight: bold;">${escaparHtml(empresa?.razao_social)}</div>
          <div>CNPJ: ${escaparHtml(formatarCnpj(empresa?.cnpj ?? ""))}</div>
        </div>

        <div class="content">
          <p>Declaramos que nesta data, <strong>${formatarData(dados.data)}</strong>, entregamos ao colaborador(a)
          <strong>${escaparHtml(empregado?.nome)}</strong>, CPF nº <strong>${escaparHtml(empregado?.cpf)}</strong>, os seguintes itens de uniforme:</p>

          <table>
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Marca/Modelo</th>
                <th>Qtd</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${linhasHtml}
            </tbody>
          </table>

          <p style="margin-top: 30px;">O(A) empregado(a) declara ter recebido os itens acima descritos em perfeito estado de conservação,
          comprometendo-se a utilizá-los exclusivamente para fins de trabalho e a devolvê-los à empresa quando solicitado ou no ato de desligamento.</p>
        </div>

        <div class="signatures">
          <div class="sig-box">
            <strong>${escaparHtml(empregado?.nome)}</strong><br>Empregado(a)
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
