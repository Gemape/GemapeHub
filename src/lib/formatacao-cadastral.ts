// Siglas conhecidas: saem sempre em maiúscula. Palavra com algum número (código, medida) fica como foi digitada.
const SIGLAS = new Set([
  "EPI", "EPC", "CA", "SKU", "CNPJ", "CPF", "RG", "CEP", "NR", "NF", "NFE", "NBR", "ABNT", "UF", "PDF", "XML", "USB", "LED", "GPS",
  "RH", "TI", "CNH", "CRLV", "RENAVAM", "ABS", "GNV", "SUV", "IPVA", "BMW", "BYD", "GWM", "DAF", "MAN",
]);
const PARTICULAS = new Set(["da", "das", "de", "do", "dos", "e"]);

export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function validarCnpj(valor: string): boolean {
  return somenteDigitos(valor).length === 14;
}

export function validarTelefone(valor: string): boolean {
  return [10, 11].includes(somenteDigitos(valor).length);
}

export function validarCep(valor: string): boolean {
  return somenteDigitos(valor).length === 8;
}

export function formatarCnpj(valor: string): string {
  const digitos = somenteDigitos(valor);
  if (digitos.length !== 14) return valor;
  return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12)}`;
}

export function formatarTelefone(valor: string): string {
  const digitos = somenteDigitos(valor);
  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)})${digitos[2]}.${digitos.slice(3, 7)}.${digitos.slice(7)}`;
  }
  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)})${digitos.slice(2, 6)}.${digitos.slice(6)}`;
  }
  return valor;
}

export function formatarCep(valor: string): string {
  const digitos = somenteDigitos(valor);
  if (digitos.length !== 8) return valor;
  return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}-${digitos.slice(5)}`;
}

const PALAVRA = /[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*/gu;

// Espaços repetidos viram um só; as quebras de linha (observações com várias linhas) ficam.
const compactar = (valor: string | null | undefined) =>
  String(valor ?? "").replace(/[^\S\n]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

/**
 * Texto comum (descrições, empresas, produtos, endereços, categorias, fornecedores, observações), decisão 84:
 * só a primeira letra do texto em maiúscula e o resto em minúscula, inclusive depois de espaço, vírgula ou hífen.
 * Siglas conhecidas (EPI, CNPJ, CA…) saem em maiúscula; palavra com número (UNI-0001, 12V) fica como digitada.
 */
export function capitalizarTexto(valor: string | null | undefined): string {
  const texto = compactar(valor);
  if (texto.includes("_")) return texto;
  let primeira = true;
  return texto.replace(PALAVRA, (palavra) => {
    const inicio = primeira;
    primeira = false;
    if (/\d/.test(palavra)) return palavra;
    const maiuscula = palavra.toLocaleUpperCase("pt-BR");
    if (SIGLAS.has(maiuscula)) return maiuscula;
    const minuscula = palavra.toLocaleLowerCase("pt-BR");
    return inicio ? minuscula.charAt(0).toLocaleUpperCase("pt-BR") + minuscula.slice(1) : minuscula;
  });
}

/** Nome próprio de pessoa (empregados, contatos, responsáveis, quem assina): inicial maiúscula em cada palavra; da, de, do e e ficam em minúscula. */
export function capitalizarNomePessoa(valor: string | null | undefined): string {
  const texto = compactar(valor);
  if (texto.includes("_")) return texto;
  let primeiraPalavra = true;
  return texto.replace(PALAVRA, (palavra) => {
    const primeira = primeiraPalavra;
    primeiraPalavra = false;
    const minuscula = palavra.toLocaleLowerCase("pt-BR");
    if (!primeira && PARTICULAS.has(minuscula)) return minuscula;
    return minuscula.replace(/(^|-)(\p{L})/gu, (_, hifen: string, letra: string) => hifen + letra.toLocaleUpperCase("pt-BR"));
  });
}

/** Regra dos cadastros em geral: a do texto comum. Nome de pessoa usa capitalizarNomePessoa. */
export const capitalizarCadastro = capitalizarTexto;
