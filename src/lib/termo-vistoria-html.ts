// HTML do Relatório de Vistoria Periódica de ferramentas. Todo texto informado, inclusive a
// observação digitada, passa por escaparHtml, como nos termos de Encerramento e de Responsabilidade.
import { escaparHtml } from "./gemape.ts";
import { formatarCnpj } from "./formatacao-cadastral.ts";

export interface DadosTermoVistoria {
  empresa: { razao_social: string; cnpj: string };
  caixa: { codigo?: string | null | undefined; nome?: string | null | undefined } | undefined;
  responsavel: string | null | undefined;
  data: string;
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

  return `
      <html>
        <head>
          <title>Termo de Vistoria Periódica - Caixa ${escaparHtml(caixa?.codigo || "")}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.3; padding: 25px; font-size: 10pt; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .title { font-size: 14pt; font-weight: bold; text-transform: uppercase; }
            .content { margin-bottom: 15px; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 50px; }
            .sig-box { width: 45%; border-top: 1px solid #000; text-align: center; padding-top: 5px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">RELATÓRIO DE VISTORIA PERIÓDICA DE FERRAMENTAS</div>
            <strong>${escaparHtml(dados.empresa.razao_social)}</strong><br>
            CNPJ: ${escaparHtml(formatarCnpj(dados.empresa.cnpj))}
          </div>

          <div class="info">
            <p><strong>DATA DA VISTORIA:</strong> ${dataFormatada}<br>
            <strong>CAIXA Nº:</strong> ${escaparHtml(caixa?.codigo || "N/A")}<br>
            <strong>RESPONSÁVEL PELA CAIXA (EMPREGADO):</strong> ${escaparHtml(dados.responsavel || "NÃO ATRIBUÍDO")}</p>
          </div>

          <div class="content">
            <p>A presente vistoria tem por objetivo verificar as condições de uso, conservação e limpeza das ferramentas e equipamentos que compõem a caixa acima identificada, visando a segurança do trabalho e a durabilidade do patrimônio da empresa.</p>
          </div>

          <table class="table">
            <thead>
              <tr style="background-color: #eee;">
                <th style="border: 1px solid #000; padding: 6px;">Item</th>
                <th style="border: 1px solid #000; padding: 6px;">Código</th>
                <th style="border: 1px solid #000; padding: 6px;">Descrição</th>
                <th style="border: 1px solid #000; padding: 6px;">Status</th>
                <th style="border: 1px solid #000; padding: 6px;">Estado</th>
                <th style="border: 1px solid #000; padding: 6px;">Observações/Ações</th>
              </tr>
            </thead>
            <tbody>
              ${itensHtml}
            </tbody>
          </table>

          <div class="content">
            <p><strong>PARECER FINAL:</strong> As ferramentas vistoriadas encontram-se em condições adequadas de uso, salvo as observações anotadas acima. O empregado foi orientado sobre a importância da manutenção preventiva e correta guarda dos itens.</p>
          </div>

          <div class="signatures">
            <div class="sig-box">
              Assinatura do Responsável pela Vistoria
            </div>
            <div class="sig-box">
              Assinatura do Empregado (Ciente)
            </div>
          </div>

          <div class="no-print" style="margin-top: 40px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer;">Imprimir Relatório</button>
          </div>
        </body>
      </html>
  `;
}
