const SIGLAS = new Set(["GEMAPE", "EPI", "CA", "SKU"]);

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

export function capitalizarCadastro(valor: string): string {
  return valor.trim().replace(/[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*/gu, (palavra) => {
    const maiuscula = palavra.toLocaleUpperCase("pt-BR");
    if (SIGLAS.has(maiuscula) || /\d/.test(palavra)) return maiuscula;
    const minuscula = palavra.toLocaleLowerCase("pt-BR");
    return minuscula[0].toLocaleUpperCase("pt-BR") + minuscula.slice(1);
  });
}
