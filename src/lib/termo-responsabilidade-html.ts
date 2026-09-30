// HTML do Termo de Responsabilidade Individual de ferramentas. Todo texto informado passa
// por escaparHtml, como no Termo de Encerramento.
import { escaparHtml } from "./gemape.ts";

export interface DadosTermoResponsabilidade {
  empresa: { razao_social: string; cnpj: string };
  empregado: { nome: string; cpf: string };
  caixaCodigo?: string | null | undefined;
  data: string;
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

  return `
      <html>
        <head>
          <title>Termo de Responsabilidade Individual - ${escaparHtml(dados.empregado.nome)}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.4; padding: 30px; font-size: 11pt; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .title { font-size: 16pt; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; }
            .content { margin-bottom: 20px; text-align: justify; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 60px; }
            .sig-box { width: 45%; border-top: 1px solid #000; text-align: center; padding-top: 5px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">TERMO DE RESPONSABILIDADE INDIVIDUAL DE FERRAMENTAS</div>
            <strong>${escaparHtml(dados.empresa.razao_social)}</strong><br>
            CNPJ: ${escaparHtml(dados.empresa.cnpj)}
          </div>

          <div class="content">
            <p>Pelo presente instrumento, eu <strong>${escaparHtml(dados.empregado.nome)}</strong>, CPF <strong>${escaparHtml(dados.empregado.cpf)}</strong>, declaro que recebi da empresa supra citada, em perfeito estado de conservação e funcionamento, as ferramentas e equipamentos abaixo relacionados, componentes da <strong>CAIXA Nº ${escaparHtml(dados.caixaCodigo || "AVULSA")}</strong>, para uso exclusivo no desempenho de minhas atividades profissionais.</p>

            <p>Comprometo-me a zelar pela guarda, conservação e limpeza das mesmas, assumindo total responsabilidade pelo seu uso correto. Estou ciente de que, em caso de perda, extravio ou danos causados por mau uso ou negligência, poderei ser responsabilizado pelos custos de reparo ou reposição, conforme preceitua o Art. 462, § 1º da CLT.</p>
          </div>

          <table class="table">
            <thead>
              <tr style="background-color: #eee;">
                <th style="border: 1px solid #000; padding: 8px;">Item</th>
                <th style="border: 1px solid #000; padding: 8px;">Código</th>
                <th style="border: 1px solid #000; padding: 8px;">Descrição</th>
                <th style="border: 1px solid #000; padding: 8px;">Marca</th>
                <th style="border: 1px solid #000; padding: 8px;">Qtd</th>
                <th style="border: 1px solid #000; padding: 8px;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${itensHtml}
            </tbody>
          </table>

          <div class="content">
            <p>Comprometo-me, ainda, a devolver todos os itens acima relacionados no ato de meu desligamento da empresa ou sempre que me for solicitado, sob as mesmas condições em que foram recebidos.</p>
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

          <div class="no-print" style="margin-top: 50px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer;">Imprimir Termo</button>
          </div>
        </body>
      </html>
    `;
}
