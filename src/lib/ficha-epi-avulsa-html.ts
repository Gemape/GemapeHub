// HTML da Ficha de Controle de Entrega de EPI (avulsa). Todo texto informado passa por
// escaparHtml, como nos demais termos.
import { comTamanho, escaparHtml, formatarData } from "./gemape.ts";
import { formatarCnpj } from "./formatacao-cadastral.ts";
import { BOTAO_IMPRIMIR, CSS_TERMO, cabecalhoRelatorio, paginaRelatorio } from "./relatorio-padrao.ts";

type Texto = string | null | undefined;

export interface DadosFichaEpiAvulsa {
  empresa: { razao_social: Texto; cnpj: Texto };
  empregado: { nome: Texto; cpf: Texto; matricula?: Texto; data_admissao?: Texto };
  linhas: {
    data: string;
    quantidade: number;
    nome?: Texto;
    ca?: Texto;
    tamanho?: Texto;
    tipo: string;
    // Saída com motivo de baixa (perda, dano...) não é entrega: a ficha mostra BAIXA e o motivo.
    baixaMotivo?: Texto;
    // Código da movimentação (ENT-0001, DEV-0001) e, na devolução, quem a registrou (Entrega EPI).
    codigo?: Texto;
    responsavel?: Texto;
  }[];
}

export function montarFichaEpiAvulsaHtml(dados: DadosFichaEpiAvulsa): string {
  const { empresa, empregado } = dados;
  const linhasHtml = dados.linhas
    .map((h) => {
      return `
      <tr>
        <td style="text-align: center;">${formatarData(h.data)}</td>
        <td style="text-align: center;">${h.quantidade}</td>
        <td>${escaparHtml(h.nome || "—")}${comTamanho(h.tamanho)}</td>
        <td style="text-align: center;">${escaparHtml(h.ca || "—")}</td>
        <td style="text-align: center;">${h.tipo === "Saida" ? (h.baixaMotivo ? `BAIXA (${escaparHtml(h.baixaMotivo)})` : "ENTREGA") : "DEVOLUÇÃO"}${h.tipo !== "Saida" && h.responsavel ? `<br/><span style="font-size: 8pt;">Resp.: ${escaparHtml(h.responsavel)}</span>` : ""}</td>
        <td style="text-align: center;">${escaparHtml(h.codigo || "—")}</td>
        <td style="height: 30px;"></td>
      </tr>
    `;
    })
    .join("");

  // Add empty rows to fill the page
  const emptyRows = Array.from({ length: Math.max(0, 15 - dados.linhas.length) })
    .map(
      () => `
    <tr>
      <td style="height: 30px;"></td>
      <td style="height: 30px;"></td>
      <td style="height: 30px;"></td>
      <td style="height: 30px;"></td>
      <td style="height: 30px;"></td>
      <td style="height: 30px;"></td>
      <td style="height: 30px;"></td>
    </tr>
  `,
    )
    .join("");

  return paginaRelatorio({
    titulo: `Ficha de EPI - ${empregado.nome ?? ""}`,
    cabecalho: cabecalhoRelatorio({ titulo: "Ficha de Controle de Entrega de EPI", subtitulos: ["Rev. 00"], empresa: empresa.razao_social }),
    css: CSS_TERMO,
    corpo: `<div class="termo">
<table>
          <tr>
            <td colspan="2"><strong>Empresa:</strong> ${escaparHtml(empresa.razao_social)}</td>
            <td><strong>CNPJ:</strong> ${escaparHtml(formatarCnpj(empresa.cnpj ?? ""))}</td>
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

        <p class="nota">
          Declaro que recebi da empresa os Equipamentos de Proteção Individual (EPI) adequados ao risco de minha atividade, em perfeitas condições de uso, e que fui treinado quanto ao seu uso correto. Comprometo-me a utilizá-los apenas para a finalidade a que se destinam e a devolvê-los quando solicitado ou no desligamento da empresa.
        </p>

        <table>
          <thead>
            <tr>
              <th style="width: 12%;">Data</th>
              <th style="width: 8%;">Qtd</th>
              <th>Descrição do EPI</th>
              <th style="width: 10%;">CA</th>
              <th style="width: 15%;">Tipo</th>
              <th style="width: 11%;">Código</th>
              <th style="width: 22%;">Assinatura</th>
            </tr>
          </thead>
          <tbody>
            ${linhasHtml}
            ${emptyRows}
          </tbody>
        </table>

        <div class="nota">
          <p><strong>Norma Regulamentadora 06 (NR-06):</strong> Cabe ao empregado utilizar o EPI apenas para a finalidade a que se destina, responsabilizar-se pela guarda e conservação, e comunicar ao empregador qualquer alteração que o torne impróprio para uso.</p>
        </div>
      </div>`,
    botao: BOTAO_IMPRIMIR("Imprimir Ficha"),
  });
}
