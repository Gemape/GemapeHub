// HTML da Ficha de Controle de Entrega de EPI (avulsa). Todo texto informado passa por
// escaparHtml, como nos demais termos.
import { escaparHtml, formatarData } from "./gemape.ts";

type Texto = string | null | undefined;

export interface DadosFichaEpiAvulsa {
  empresa: { razao_social: Texto; cnpj: Texto };
  empregado: { nome: Texto; cpf: Texto; matricula?: Texto; data_admissao?: Texto };
  linhas: { data: string; quantidade: number; nome?: Texto; ca?: Texto; tipo: string }[];
}

export function montarFichaEpiAvulsaHtml(dados: DadosFichaEpiAvulsa): string {
  const { empresa, empregado } = dados;
  const linhasHtml = dados.linhas
    .map((h) => {
      return `
      <tr>
        <td style="border: 1px solid #000; padding: 5px; text-align: center;">${formatarData(h.data)}</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: center;">${h.quantidade}</td>
        <td style="border: 1px solid #000; padding: 5px;">${escaparHtml(h.nome || "—")}</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: center;">${escaparHtml(h.ca || "—")}</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: center;">${h.tipo === "Saida" ? "ENTREGA" : "DEVOLUÇÃO"}</td>
        <td style="border: 1px solid #000; padding: 5px; height: 30px;"></td>
      </tr>
    `;
    })
    .join("");

  // Add empty rows to fill the page
  const emptyRows = Array.from({ length: Math.max(0, 15 - dados.linhas.length) })
    .map(
      () => `
    <tr>
      <td style="border: 1px solid #000; padding: 5px; height: 30px;"></td>
      <td style="border: 1px solid #000; padding: 5px; height: 30px;"></td>
      <td style="border: 1px solid #000; padding: 5px; height: 30px;"></td>
      <td style="border: 1px solid #000; padding: 5px; height: 30px;"></td>
      <td style="border: 1px solid #000; padding: 5px; height: 30px;"></td>
      <td style="border: 1px solid #000; padding: 5px; height: 30px;"></td>
    </tr>
  `,
    )
    .join("");

  return `
    <html>
      <head>
        <title>Ficha de EPI - ${escaparHtml(empregado.nome)}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.2; padding: 20px; }
          .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .header-table td { border: 1px solid #000; padding: 10px; }
          .title { text-align: center; font-weight: bold; font-size: 14pt; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .info-table td { border: 1px solid #000; padding: 5px; }
          .main-table { width: 100%; border-collapse: collapse; }
          .main-table th { border: 1px solid #000; padding: 5px; background-color: #eee; }
          .main-table td { border: 1px solid #000; padding: 5px; }
          .footer { margin-top: 20px; font-size: 8pt; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td style="width: 20%; text-align: center;"><strong>LOGO</strong></td>
            <td class="title">FICHA DE CONTROLE DE ENTREGA DE EPI</td>
            <td style="width: 20%; text-align: center;">Rev. 00</td>
          </tr>
        </table>

        <table class="info-table">
          <tr>
            <td colspan="2"><strong>Empresa:</strong> ${escaparHtml(empresa.razao_social)}</td>
            <td><strong>CNPJ:</strong> ${escaparHtml(empresa.cnpj)}</td>
          </tr>
          <tr>
            <td style="width: 60%;"><strong>Nome do Funcionário:</strong> ${escaparHtml(empregado.nome)}</td>
            <td><strong>CPF:</strong> ${escaparHtml(empregado.cpf)}</td>
            <td><strong>Matrícula:</strong> ${escaparHtml(empregado.matricula || "—")}</td>
          </tr>
          <tr>
            <td><strong>Admissão:</strong> ${empregado.data_admissao ? formatarData(empregado.data_admissao) : "—"}</td>
            <td colspan="2"><strong>Setor:</strong> Operacional</td>
          </tr>
        </table>

        <p style="font-size: 8pt; text-align: justify; margin-bottom: 15px;">
          Declaro que recebi da empresa os Equipamentos de Proteção Individual (EPI) adequados ao risco de minha atividade, em perfeitas condições de uso, e que fui treinado quanto ao seu uso correto. Comprometo-me a utilizá-los apenas para a finalidade a que se destinam e a devolvê-los quando solicitado ou no desligamento da empresa.
        </p>

        <table class="main-table">
          <thead>
            <tr>
              <th style="width: 12%;">Data</th>
              <th style="width: 8%;">Qtd</th>
              <th>Descrição do EPI</th>
              <th style="width: 10%;">CA</th>
              <th style="width: 15%;">Tipo</th>
              <th style="width: 25%;">Assinatura</th>
            </tr>
          </thead>
          <tbody>
            ${linhasHtml}
            ${emptyRows}
          </tbody>
        </table>

        <div class="footer">
          <p><strong>Norma Regulamentadora 06 (NR-06):</strong> Cabe ao empregado utilizar o EPI apenas para a finalidade a que se destina, responsabilizar-se pela guarda e conservação, e comunicar ao empregador qualquer alteração que o torne impróprio para uso.</p>
        </div>

        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer;">Imprimir Ficha</button>
        </div>
      </body>
    </html>
  `;
}
