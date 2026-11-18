// Textos dos termos de ferramentas, cadastrados em Parâmetros > Ferramentas > Parâmetros Específicos.
// Cada termo tem um texto só. Linha em branco separa parágrafos, {tabela} marca onde entra a tabela de itens (sem a marca, a tabela vem depois do texto)
// e {empregado}, {cpf}, {empresa}, {cnpj}, {caixa} e {data} viram os dados do termo, em negrito. **Assim** deixa o trecho em negrito.
// Fase 1: fica só no navegador, em modo demonstração; na Fase 2 vira configuração por empresa (`empresa_id`).
import { escaparHtml } from "./gemape.ts";

type StorageLike = Pick<Storage, "getItem" | "setItem">;
const CHAVE = "gemape-demo-ferramentas-termos-textos";
export const TEXTO_TERMO_MAXIMO = 4000;

export const TERMOS_FERRAMENTA = ["entrega", "reposicao", "encerramento", "vistoria"] as const;
export type TermoFerramenta = (typeof TERMOS_FERRAMENTA)[number];

export const ROTULO_TERMO: Record<TermoFerramenta, string> = {
  entrega: "Termo de entrega",
  reposicao: "Termo de reposição",
  encerramento: "Termo de encerramento",
  vistoria: "Termo de vistoria periódica",
};

export const AJUDA_TERMO: Record<TermoFerramenta, string> = {
  entrega: "Gerado na entrega da caixa ao empregado.",
  reposicao: "Gerado quando uma ferramenta da caixa é substituída por uma nova.",
  encerramento: "Gerado quando o empregado devolve a caixa.",
  vistoria: "Gerado na vistoria periódica da caixa.",
};

export const MARCAS_DO_TEXTO = ["{empregado}", "{cpf}", "{empresa}", "{cnpj}", "{caixa}", "{data}", "{tabela}"] as const;

// Os textos da planilha "Controle de ferramentas" (aba dos termos): quem não cadastrou nada sai com eles.
const COMPROMISSOS = `Comprometo-me a:
• Utilizar as ferramentas com cuidado e apenas para atividades da empresa.
• Manter a caixa de ferramentas em bom estado, zelando pela conferência diária e pela completude contínua.
• Não emprestar ou permitir o uso por terceiros sem autorização.
• Comunicar imediatamente à chefia qualquer dano, desgaste, perda ou desaparecimento.

Estou ciente que:
• Ferramentas com dano ou desgaste pelo uso deverão ser apresentadas à chefia para verificação, apuração e possível reposição.
• A caixa de ferramentas poderá ser conferida periodicamente sem necessidade de aviso prévio e deverá ser devolvida completa e em bom estado quando solicitada ou no desligamento.
• Danos por mau uso, negligência ou perda poderão gerar responsabilização, conforme regras internas e legislação aplicável.`;

const CUSTOS = `Autorizo a apuração de custos de itens faltantes, danificados ou inutilizados quanto ao respectivo valor de reposição, reparo ou substituição, com base no preço de mercado, nota fiscal, orçamento interno ou outro critério idôneo adotado pela empresa.`;

export const TEXTOS_PADRAO: Record<TermoFerramenta, string> = {
  entrega: `Eu, {empregado}, CPF {cpf}, declaro que recebi da empresa {empresa}, inscrita sob o CNPJ nº {cnpj}, uma caixa de ferramentas (**CAIXA Nº {caixa}**) para uso exclusivo no trabalho.

${COMPROMISSOS}

Segue abaixo a listagem das ferramentas que compõem a caixa recebida.

{tabela}

Por estar de acordo, assino ao final o presente termo.`,
  reposicao: `Eu, {empregado}, CPF {cpf}, declaro que recebi da empresa {empresa}, inscrita sob o CNPJ nº {cnpj}, a reposição de ferramentas para a caixa sob minha responsabilidade (**CAIXA Nº {caixa}**). As ferramentas repostas estão destacadas na listagem abaixo.

Continuo comprometendo-me a:
${COMPROMISSOS.replace(/^Comprometo-me a:\n/, "")}

Segue abaixo a listagem das ferramentas da caixa, incluindo as reposições realizadas, configurando a partir daqui a nova composição.

{tabela}

Por estar de acordo, assino ao final o presente termo.`,
  encerramento: `Na presente data, eu, {empregado}, CPF {cpf}, devolvo à empresa {empresa}, inscrita sob o CNPJ nº {cnpj}, a caixa de ferramentas que me foi entregue conforme termo de responsabilidade firmado na admissão.

Estou ciente de que a caixa foi conferida no momento da devolução e que esse termo registra fielmente o estado em que os bens foram devolvidos.

${CUSTOS}

Conforme análise de responsabilidade, estou ciente que o valor poderá ser descontado no acerto de desligamento, sempre em razão de dano por mau uso, negligência, extravio ou perda dos itens sob minha responsabilidade.

Segue abaixo a listagem das ferramentas que compõem a caixa devolvida.

{tabela}

Por estar de acordo, assino ao final o presente termo.`,
  vistoria: `Na presente data foi vistoriada a caixa de ferramentas sob minha responsabilidade e esse termo registra fielmente o estado em que foi encontrada.

Estou ciente que:
• As ferramentas ausentes deverão ser localizadas pelo portador em até 15 dias, quando nova verificação será realizada.
• São consideradas perdidas as ferramentas que não tenham sido localizadas em uma segunda vistoria quando inicialmente foram consideradas ausentes.

As ferramentas desgastadas ou quebradas por uso serão repostas pela empresa sem nenhum ônus ao portador.

${CUSTOS}

Conforme análise de responsabilidade, estou ciente que o valor poderá ser descontado, sempre em razão de dano por mau uso, negligência, extravio ou perda.

{tabela}

Por ter acompanhado a vistoria e estar de acordo com os termos, assino:`,
};

export const textoDoTermoValido = (texto: string): boolean => texto.trim().length > 0 && texto.length <= TEXTO_TERMO_MAXIMO;

// Texto ausente, vazio ou longo demais volta ao padrão; armazenamento bloqueado também.
export function lerTextosTermos(storage?: StorageLike): Record<TermoFerramenta, string> {
  const textos = { ...TEXTOS_PADRAO };
  try {
    const bruto = (storage ?? localStorage).getItem(CHAVE);
    const obj: unknown = bruto === null ? null : JSON.parse(bruto);
    const o = obj && typeof obj === "object" ? (obj as Record<string, unknown>) : {};
    for (const termo of TERMOS_FERRAMENTA) {
      const valor = o[termo];
      if (typeof valor === "string" && textoDoTermoValido(valor)) textos[termo] = valor;
    }
  } catch {
    /* sem armazenamento: valem os padrões */
  }
  return textos;
}

export function salvarTextosTermos(textos: Record<TermoFerramenta, string>, storage?: StorageLike): void {
  for (const termo of TERMOS_FERRAMENTA) {
    if (!textoDoTermoValido(textos[termo])) throw new Error(`${ROTULO_TERMO[termo]}: escreva o texto, com até ${TEXTO_TERMO_MAXIMO} caracteres.`);
  }
  try {
    (storage ?? localStorage).setItem(CHAVE, JSON.stringify(textos));
  } catch {
    throw new Error("Não foi possível guardar os textos neste navegador.");
  }
}

export type DadosDoTexto = { empregado?: string | null | undefined; cpf?: string | null | undefined; empresa?: string | null | undefined; cnpj?: string | null | undefined; caixa?: string | null | undefined; data?: string | null | undefined };

// Um trecho do texto em parágrafos: tudo passa por escaparHtml antes de as marcas virarem dados, então o que se digita nunca vira HTML.
function paragrafos(trecho: string, dados: Record<string, string>): string {
  return trecho
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const html = escaparHtml(p)
        .replace(/\{(empregado|cpf|empresa|cnpj|caixa|data)\}/g, (_, nome: string) => `<strong>${escaparHtml(dados[nome] ?? "")}</strong>`)
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br>");
      return `<p>${html}</p>`;
    })
    .join("\n");
}

/** O texto do termo em HTML, repartido em antes e depois da tabela de itens ({tabela}); sem a marca, tudo vem antes e a tabela depois. */
export function montarTextoDoTermo(texto: string, dados: DadosDoTexto): { antes: string; depois: string } {
  const valores: Record<string, string> = {
    empregado: dados.empregado || "—",
    cpf: dados.cpf || "—",
    empresa: dados.empresa || "—",
    cnpj: dados.cnpj || "—",
    caixa: dados.caixa || "AVULSA",
    data: dados.data || "",
  };
  const [antes = "", ...resto] = texto.split("{tabela}");
  return {
    antes: paragrafos(antes, valores),
    depois: paragrafos(resto.join(""), valores),
  };
}
