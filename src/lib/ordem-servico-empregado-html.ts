// Ordem de Serviço de EPI emitida para um empregado (decisão 387): os nove tópicos cadastrados em Parâmetros > EPI > Cadastrar Ordem de Serviço, com os dados do empregado, a declaração
// de ciência e as assinaturas. Todo texto informado passa por escaparHtml. A ordem se acha pela função do empregado: a área em que ele está habilitado em Parâmetros > EPI.
import { escaparHtml, formatarData } from "./gemape.ts";
import { formatarCnpj } from "./formatacao-cadastral.ts";
import { CAMPOS_OS, type OrdemServicoEpi } from "./ordens-servico-epi.ts";
import { assinaturaRelatorio, BOTAO_IMPRIMIR, CSS_TERMO, cabecalhoRelatorio, paginaRelatorio } from "./relatorio-padrao.ts";

type Texto = string | null | undefined;
const chave = (t: string) => t.trim().replace(/\s*\/\s*/g, "/").replace(/\s+/g, " ").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[̀-ͯ]/g, "");

// As ordens da função do empregado (a mesma função pode ter ordens de setores diferentes); sem área ou sem ordem igual, lista vazia.
export const ordensDaFuncao = (ordens: readonly OrdemServicoEpi[], area: Texto): OrdemServicoEpi[] =>
  area ? ordens.filter((o) => chave(o.funcao) === chave(area)) : [];

// A área em que o empregado está habilitado: pelo id e, para quem entrou na lista sem vínculo (id nulo), pelo nome.
export const funcaoDeHabilitado = (habilitados: readonly { empregadoId: string | null; nome: string; area: string }[], empregado: { id: string; nome: string } | undefined): string =>
  !empregado ? "" : (habilitados.find((h) => h.empregadoId === empregado.id) ?? habilitados.find((h) => !h.empregadoId && chave(h.nome) === chave(empregado.nome)))?.area ?? "";

// A função que vale para a ordem: a do empregado (a área em que está habilitado) e, quando ele não está habilitado em nenhuma, a que a pessoa informa na hora (decisão 413).
export const funcaoDaOrdem = (areaHabilitada: Texto, informada: Texto): string => (areaHabilitada || informada || "").trim();

// Um item por linha, tirando o marcador (●, -, •, *) que a pessoa tenha digitado.
export const itensDaLista = (texto: string): string[] => texto.split("\n").map((l) => l.replace(/^\s*[●•\-*–]\s*/, "").trim()).filter(Boolean);

export interface DadosOrdemServico {
  ordem: OrdemServicoEpi;
  empresa: { razao_social: Texto; cnpj: Texto };
  empregado: { nome: Texto; cpf: Texto; matricula?: Texto; data_admissao?: Texto };
  emitidaEm?: string;
}

export function montarOrdemServicoHtml(d: DadosOrdemServico): string {
  const { ordem, empresa, empregado } = d;
  const topicos = CAMPOS_OS.filter((c) => c.chave !== "funcao" && c.chave !== "setor").map((c) => {
    const valor = ordem[c.chave];
    const corpo = c.tipo === "lista"
      ? `<ul>${itensDaLista(valor).map((i) => `<li>${escaparHtml(i)}</li>`).join("")}</ul>`
      : `<p>${escaparHtml(valor).replace(/\n/g, "<br />")}</p>`;
    return `<h3>${escaparHtml(c.rotulo)}</h3>${corpo}`;
  }).join("");
  return paginaRelatorio({
    titulo: `Ordem de Serviço - ${empregado.nome ?? ""}`,
    cabecalho: cabecalhoRelatorio({ titulo: "Ordem de Serviço de Segurança", subtitulos: [`${ordem.funcao} · ${ordem.setor}`], empresa: empresa.razao_social }),
    css: CSS_TERMO + " .termo ul { margin: 0 0 8px; padding-left: 18px; } .termo li { margin-bottom: 2px; }",
    corpo: `<div class="termo">
<table>
  <tr><td colspan="2"><strong>Empresa:</strong> ${escaparHtml(empresa.razao_social)}</td><td><strong>CNPJ:</strong> ${escaparHtml(formatarCnpj(empresa.cnpj ?? ""))}</td></tr>
  <tr><td style="width: 50%;"><strong>Empregado:</strong> ${escaparHtml(empregado.nome)}</td><td><strong>CPF:</strong> ${escaparHtml(empregado.cpf)}</td><td><strong>Matrícula:</strong> ${escaparHtml(empregado.matricula || "—")}</td></tr>
  <tr><td><strong>Função:</strong> ${escaparHtml(ordem.funcao)}</td><td><strong>Setor:</strong> ${escaparHtml(ordem.setor)}</td><td><strong>Admissão:</strong> ${empregado.data_admissao ? formatarData(empregado.data_admissao) : "—"}</td></tr>
</table>
${topicos}
<p class="nota">Declaro ter recebido esta Ordem de Serviço, ter sido orientado(a) sobre os riscos da minha função e me comprometo a cumprir os procedimentos, a usar os equipamentos de proteção individual indicados e a não praticar as condutas proibidas.</p>
<div class="assinaturas">${assinaturaRelatorio("Empregado", String(empregado.nome ?? ""))}${assinaturaRelatorio("Responsável pela empresa")}</div>
</div>`,
    botao: BOTAO_IMPRIMIR("Imprimir Ordem de Serviço"),
  });
}
