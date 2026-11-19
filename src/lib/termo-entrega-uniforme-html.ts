// HTML do Termo de Entrega de Uniforme. Todo texto informado, inclusive empresa e empregado,
// passa por escaparHtml, como nos demais termos.
import { comTamanho, escaparHtml, formatarData } from "./gemape.ts";
import { formatarCnpj } from "./formatacao-cadastral.ts";
import { BOTAO_IMPRIMIR, CSS_TERMO, cabecalhoRelatorio, paginaRelatorio } from "./relatorio-padrao.ts";
import { montarTextoDoTermo } from "./termos-ferramentas-texto.ts";
import { lerTextosTermosUniforme } from "./uniforme-termos-texto.ts";

type Texto = string | null | undefined;

export interface DadosTermoEntregaUniforme {
  empresa: { razao_social: Texto; cnpj: Texto; nome_fantasia: Texto } | undefined;
  empregado: { nome: Texto; cpf: Texto } | undefined;
  // Quem entrega o uniforme (Termo de Entrega do módulo Uniformes): o nome completo sai no termo e sob a assinatura do responsável. Sem ele, o termo sai como antes.
  responsavel?: { nome: Texto };
  data: string;
  linhas: {
    nome?: Texto;
    marca?: Texto;
    modelo?: Texto;
    tamanho?: Texto;
    quantidade: number;
    estado: string;
  }[];
  // Texto cadastrado em Parâmetros > Uniformes > Parâmetros Específicos; sem ele valem o guardado no navegador ou o padrão.
  texto?: string | undefined;
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

  const texto = montarTextoDoTermo(dados.texto ?? lerTextosTermosUniforme().entrega, {
    empregado: empregado?.nome, cpf: empregado?.cpf, empresa: empresa?.razao_social, cnpj: formatarCnpj(empresa?.cnpj ?? ""), data: formatarData(dados.data),
  });

  return paginaRelatorio({
    titulo: `Termo de Entrega - ${empregado?.nome ?? ""}`,
    cabecalho: cabecalhoRelatorio({ titulo: "Termo de Entrega de Uniforme", subtitulos: [`CNPJ: ${formatarCnpj(empresa?.cnpj ?? "")}`], empresa: empresa?.razao_social }),
    css: CSS_TERMO,
    corpo: `<div class="termo">
        <div class="content">
          ${texto.antes}
          ${dados.responsavel?.nome ? `<p><strong>Entregue por:</strong> ${escaparHtml(dados.responsavel.nome)}</p>` : ""}

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

          ${texto.depois}
        </div>

        <div class="signatures">
          <div class="sig-box">
            <strong>${escaparHtml(empregado?.nome)}</strong><br>Empregado(a)
          </div>
          <div class="sig-box">
            ${dados.responsavel?.nome ? `<strong>${escaparHtml(dados.responsavel.nome)}</strong><br>Responsável pela entrega<br>` : "<strong>Responsável</strong><br>"}${escaparHtml(empresa?.nome_fantasia)}
          </div>
        </div>
        </div>`,
    botao: BOTAO_IMPRIMIR("Imprimir Termo") + "<script>window.print();</script>",
  });
}
