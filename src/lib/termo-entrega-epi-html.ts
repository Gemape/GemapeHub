// HTML do Termo de Entrega de EPI. Todo texto informado passa por escaparHtml, como nos
// termos de Encerramento, Responsabilidade, Baixa e Vistoria.
import { escaparHtml } from "./gemape.ts";

type Texto = string | null | undefined;

export interface DadosTermoEntregaEpi {
  empresa: { razao_social: Texto; cnpj: Texto; nome_fantasia: Texto };
  empregado: { nome: Texto; cpf: Texto; matricula?: Texto };
  data: string;
  linhas: { nome?: Texto; ca?: Texto; quantidade: number; estado: string }[];
}

export function montarTermoEntregaEpiHtml(dados: DadosTermoEntregaEpi): string {
  const { empresa, empregado } = dados;
  const itensHtml = dados.linhas
    .map(
      (it, index) => `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${index + 1}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${escaparHtml(it.nome || "—")}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${escaparHtml(it.ca || "—")}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${it.quantidade}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${escaparHtml(it.estado)}</td>
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

  return `
      <html>
        <head>
          <title>Termo de Entrega de EPI</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; padding: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .title { font-size: 20px; font-weight: bold; text-decoration: underline; margin-bottom: 20px; }
            .content { margin-bottom: 30px; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .footer { margin-top: 50px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 80px; }
            .sig-box { width: 45%; border-top: 1px solid #000; text-align: center; padding-top: 5px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${escaparHtml(empresa.razao_social)}</h2>
            <p>CNPJ: ${escaparHtml(empresa.cnpj)}</p>
            <div class="title">TERMO DE RESPONSABILIDADE E ENTREGA DE EPI</div>
          </div>
          <div class="content">
            <p>Declaro ter recebido da empresa <strong>${escaparHtml(empresa.razao_social)}</strong>, os Equipamentos de Proteção Individual (EPI) abaixo relacionados, novos e/ou em perfeitas condições de uso, obrigando-me a utilizá-los corretamente, zelar pela sua guarda e conservação, bem como devolvê-los quando solicitado ou no ato de minha rescisão contratual.</p>

            <p><strong>Empregado:</strong> ${escaparHtml(empregado.nome)}<br>
            <strong>CPF:</strong> ${escaparHtml(empregado.cpf)}<br>
            <strong>Matrícula:</strong> ${escaparHtml(empregado.matricula || "—")}</p>
          </div>

          <table class="table">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th style="border: 1px solid #ddd; padding: 8px;">Nº</th>
                <th style="border: 1px solid #ddd; padding: 8px;">Descrição</th>
                <th style="border: 1px solid #ddd; padding: 8px;">CA</th>
                <th style="border: 1px solid #ddd; padding: 8px;">Qtd</th>
                <th style="border: 1px solid #ddd; padding: 8px;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${itensHtml}
            </tbody>
          </table>

          <div class="content">
            <p>Estou ciente de que o uso do EPI é obrigatório e que a sua não utilização poderá acarretar sanções disciplinares conforme a legislação vigente.</p>
          </div>

          <p style="text-align: right;">${escaparHtml(empresa.nome_fantasia)}, ${dataFormatada}</p>

          <div class="signatures">
            <div class="sig-box">
              Assinatura do Empregado
            </div>
            <div class="sig-box">
              Assinatura do Responsável
            </div>
          </div>

          <div class="no-print" style="margin-top: 50px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer;">Imprimir Termo</button>
          </div>
        </body>
      </html>
  `;
}
