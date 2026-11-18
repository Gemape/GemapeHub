// HTML do Termo de reposição de ferramentas da caixa: gerado quando uma ferramenta é substituída por uma nova. O texto vem de Parâmetros Específicos
// (com {tabela} marcando a listagem da caixa, que inclui as ferramentas repostas). Todo texto informado passa por escaparHtml.
import { escaparHtml } from "./gemape.ts";
import { formatarCnpj } from "./formatacao-cadastral.ts";
import { BOTAO_IMPRIMIR, CSS_TERMO, cabecalhoRelatorio, paginaRelatorio } from "./relatorio-padrao.ts";
import { TEXTOS_PADRAO, montarTextoDoTermo } from "./termos-ferramentas-texto.ts";

export interface DadosTermoReposicao {
  empresa: { razao_social: string; cnpj: string };
  empregado: { nome: string | null | undefined; cpf: string | null | undefined };
  caixaCodigo: string | null | undefined;
  data: string;
  texto?: string | undefined;
  /** A composição da caixa depois da reposição; `reposta` marca o que entrou agora. */
  linhas: { codigo?: string | null | undefined; nome: string; quantidade: number; reposta: boolean }[];
}

export function montarTermoReposicaoHtml(dados: DadosTermoReposicao): string {
  const itensHtml = dados.linhas
    .map(
      (it, i) => `
        <tr>
          <td style="border: 1px solid #000; padding: 6px; text-align: center;">${i + 1}</td>
          <td style="border: 1px solid #000; padding: 6px;">${escaparHtml(it.codigo || "—")}</td>
          <td style="border: 1px solid #000; padding: 6px;">${escaparHtml(it.nome)}</td>
          <td style="border: 1px solid #000; padding: 6px; text-align: center;">${it.quantidade}</td>
          <td style="border: 1px solid #000; padding: 6px;">${it.reposta ? "<strong>Reposta</strong>" : "—"}</td>
        </tr>`,
    )
    .join("");
  // Meio-dia local evita que a data em UTC caia no dia anterior.
  const dataFormatada = new Date(`${dados.data}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const texto = montarTextoDoTermo(dados.texto ?? TEXTOS_PADRAO.reposicao, {
    empregado: dados.empregado.nome, cpf: dados.empregado.cpf, empresa: dados.empresa.razao_social, cnpj: formatarCnpj(dados.empresa.cnpj), caixa: dados.caixaCodigo, data: dataFormatada,
  });
  return paginaRelatorio({
    titulo: `Termo de Reposição - Caixa ${dados.caixaCodigo || ""}`,
    cabecalho: cabecalhoRelatorio({ titulo: "Termo de Reposição de Ferramentas", subtitulos: [`CNPJ: ${formatarCnpj(dados.empresa.cnpj)}`], empresa: dados.empresa.razao_social }),
    css: CSS_TERMO,
    corpo: `<div class="termo">
          <div class="content">
            ${texto.antes}
          </div>

          <table>
            <thead>
              <tr><th>Item</th><th>Código</th><th>Descrição</th><th>Qtd</th><th>Situação</th></tr>
            </thead>
            <tbody>
              ${itensHtml}
            </tbody>
          </table>

          <div class="content">
            ${texto.depois}
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
        </div>`,
    botao: BOTAO_IMPRIMIR("Imprimir Termo"),
  });
}
