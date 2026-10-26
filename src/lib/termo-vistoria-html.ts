// HTML do Relatório de Vistoria Periódica de ferramentas. Todo texto informado, inclusive a
// observação digitada, passa por escaparHtml, como nos termos de Encerramento e de Responsabilidade.
import { escaparHtml } from "./gemape.ts";
import { formatarCnpj } from "./formatacao-cadastral.ts";
import { BOTAO_IMPRIMIR, CSS_TERMO, cabecalhoRelatorio, paginaRelatorio } from "./relatorio-padrao.ts";

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
            <p>A presente vistoria tem por objetivo verificar as condições de uso, conservação e limpeza das ferramentas e equipamentos que compõem a caixa acima identificada, visando a segurança do trabalho e a durabilidade do patrimônio da empresa.</p>
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
        </div>`,
    botao: BOTAO_IMPRIMIR("Imprimir Relatório"),
  });
}
