// HTML do Termo de Entrega de EPI. Todo texto informado passa por escaparHtml, como nos
// termos de Encerramento, Responsabilidade, Baixa e Vistoria.
import { hojeLocal } from "./empregados.ts";
import { comTamanho, escaparHtml, formatarData } from "./gemape.ts";
import { formatarCnpj } from "./formatacao-cadastral.ts";
import { BOTAO_IMPRIMIR, CSS_TERMO, cabecalhoRelatorio, paginaRelatorio } from "./relatorio-padrao.ts";

type Texto = string | null | undefined;

export interface DadosTermoEntregaEpi {
  empresa: { razao_social: Texto; cnpj: Texto; nome_fantasia: Texto };
  empregado: { nome: Texto; cpf: Texto; matricula?: Texto };
  data: string;
  linhas: { nome?: Texto; ca?: Texto; tamanho?: Texto; quantidade: number; estado: string }[];
}

export function montarTermoEntregaEpiHtml(dados: DadosTermoEntregaEpi): string {
  const { empresa, empregado } = dados;
  const itensHtml = dados.linhas
    .map(
      (it, index) => `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${index + 1}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${escaparHtml(it.nome || "—")}${comTamanho(it.tamanho)}</td>
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

  return paginaRelatorio({
    titulo: "Termo de Entrega de EPI",
    cabecalho: cabecalhoRelatorio({ titulo: "Termo de Responsabilidade e Entrega de EPI", subtitulos: [`CNPJ: ${formatarCnpj(empresa.cnpj ?? "")}`], empresa: empresa.razao_social }),
    css: CSS_TERMO,
    corpo: `<div class="termo">
          <div class="content">
            <p>Declaro ter recebido da empresa <strong>${escaparHtml(empresa.razao_social)}</strong>, os Equipamentos de Proteção Individual (EPI) abaixo relacionados, novos e/ou em perfeitas condições de uso, obrigando-me a utilizá-los corretamente, zelar pela sua guarda e conservação, bem como devolvê-los quando solicitado ou no ato de minha rescisão contratual.</p>

            <p><strong>Empregado:</strong> ${escaparHtml(empregado.nome)}<br>
            <strong>CPF:</strong> ${escaparHtml(empregado.cpf)}<br>
            <strong>Matrícula:</strong> ${escaparHtml(empregado.matricula || "—")}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Nº</th>
                <th>Descrição</th>
                <th>CA</th>
                <th>Qtd</th>
                <th>Estado</th>
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
        </div>`,
    botao: BOTAO_IMPRIMIR("Imprimir Termo"),
  });
}

/** Observação gravada em cada saída do termo, com a data local (não a de UTC). */
export function observacaoEntregaEpi(agora = new Date()): string {
  return `Entrega de EPI - Termo Gerado em ${formatarData(hojeLocal(agora))}`;
}
