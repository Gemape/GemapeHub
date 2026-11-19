// Textos dos termos de responsabilidade dos uniformes (entrega e baixa), cadastrados em Parâmetros > Uniformes > Parâmetros Específicos.
// Mesma lógica dos termos de ferramentas: linha em branco separa parágrafos, {tabela} marca onde entra a lista de itens, {empregado}, {cpf}, {empresa}, {cnpj} e {data}
// viram os dados do termo e **assim** deixa em negrito. Fase 1: só no navegador, em modo demonstração; na Fase 2 vira configuração por empresa.
import { TEXTO_TERMO_MAXIMO, textoDoTermoValido } from "./termos-ferramentas-texto.ts";

type StorageLike = Pick<Storage, "getItem" | "setItem">;
const CHAVE = "gemape-demo-uniforme-termos-textos";

export const TERMOS_UNIFORME = ["entrega", "baixa"] as const;
export type TermoUniforme = (typeof TERMOS_UNIFORME)[number];
export const ROTULO_TERMO_UNIFORME: Record<TermoUniforme, string> = { entrega: "Termo de entrega de uniforme", baixa: "Termo de baixa definitiva de uniforme" };
export const AJUDA_TERMO_UNIFORME: Record<TermoUniforme, string> = {
  entrega: "Gerado na entrega de uniformes ao empregado. A lista de itens entra onde estiver {tabela}; sem a marca, entra depois do texto. Quem entregou sai logo depois do primeiro trecho.",
  baixa: "Gerado na baixa definitiva de uniformes. A lista de itens entra onde estiver {tabela}; o motivo e o ônus saem logo depois dela.",
};
export const MARCAS_TERMO_UNIFORME = ["{empregado}", "{cpf}", "{empresa}", "{cnpj}", "{data}", "{tabela}"] as const;
export { TEXTO_TERMO_MAXIMO };

export const TEXTOS_UNIFORME_PADRAO: Record<TermoUniforme, string> = {
  entrega: `Declaramos que nesta data, {data}, entregamos ao colaborador(a) {empregado}, CPF nº {cpf}, os seguintes itens de uniforme:

{tabela}

O(A) empregado(a) declara ter recebido os itens acima descritos em perfeito estado de conservação, comprometendo-se a utilizá-los exclusivamente para fins de trabalho e a devolvê-los à empresa quando solicitado ou no ato de desligamento.`,
  baixa: `Registramos nesta data, {data}, a baixa definitiva dos seguintes itens de uniforme vinculados ao colaborador(a) {empregado}:

{tabela}

O(A) empregado(a) está ciente da baixa dos itens acima e das responsabilidades financeiras caso o ônus seja do colaborador.`,
};

// Texto ausente, vazio ou longo demais volta ao padrão; armazenamento bloqueado também.
export function lerTextosTermosUniforme(storage?: StorageLike): Record<TermoUniforme, string> {
  const textos = { ...TEXTOS_UNIFORME_PADRAO };
  try {
    const bruto = (storage ?? localStorage).getItem(CHAVE);
    const obj: unknown = bruto === null ? null : JSON.parse(bruto);
    const o = obj && typeof obj === "object" ? (obj as Record<string, unknown>) : {};
    for (const termo of TERMOS_UNIFORME) {
      const valor = o[termo];
      if (typeof valor === "string" && textoDoTermoValido(valor)) textos[termo] = valor;
    }
  } catch {
    /* sem armazenamento: valem os padrões */
  }
  return textos;
}

export function salvarTextosTermosUniforme(textos: Record<TermoUniforme, string>, storage?: StorageLike): void {
  for (const termo of TERMOS_UNIFORME) {
    if (!textoDoTermoValido(textos[termo])) throw new Error(`${ROTULO_TERMO_UNIFORME[termo]}: escreva o texto, com até ${TEXTO_TERMO_MAXIMO} caracteres e no máximo uma marca {tabela}.`);
  }
  try {
    (storage ?? localStorage).setItem(CHAVE, JSON.stringify(textos));
  } catch {
    throw new Error("Não foi possível guardar os textos neste navegador.");
  }
}
