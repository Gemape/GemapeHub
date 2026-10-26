// HTML do Termo de Entrega de Uniforme. Todo texto informado, inclusive empresa e empregado,
// passa por escaparHtml, como nos demais termos.
import { comTamanho, escaparHtml, formatarData } from "./gemape.ts";
import { formatarCnpj } from "./formatacao-cadastral.ts";
import { BOTAO_IMPRIMIR, CSS_TERMO, cabecalhoRelatorio, paginaRelatorio } from "./relatorio-padrao.ts";

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

  return paginaRelatorio({
    titulo: `Termo de Entrega - ${empregado?.nome ?? ""}`,
    cabecalho: cabecalhoRelatorio({ titulo: "Termo de Entrega de Uniforme", subtitulos: [`CNPJ: ${formatarCnpj(empresa?.cnpj ?? "")}`], empresa: empresa?.razao_social }),
    css: CSS_TERMO,
    corpo: `<div class="termo">
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
        </div>`,
    botao: BOTAO_IMPRIMIR("Imprimir Termo") + "<script>window.print();</script>",
  });
}
