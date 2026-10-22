// Documentos fictícios dos dados de teste: formato válido (com dígito verificador, para passar nas conferências do sistema), mas de números
// inventados a partir de bases repetidas ou sequenciais, que não pertencem a ninguém.
const digitos = (n: number[]): string => n.join("");

// Dois dígitos verificadores de um CPF a partir dos nove primeiros.
export function gerarCpf(base9: string): string {
  const d = base9.replace(/\D/g, "").slice(0, 9).split("").map(Number);
  for (const tamanho of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += (d[i] ?? 0) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    d.push(resto === 10 ? 0 : resto);
  }
  const s = digitos(d);
  return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`;
}

// Dois dígitos verificadores de um CNPJ a partir dos doze primeiros (oito da raiz e quatro da filial).
export function gerarCnpj(base12: string): string {
  const d = base12.replace(/\D/g, "").slice(0, 12).split("").map(Number);
  for (const pesos of [[5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]]) {
    const soma = pesos.reduce((t, p, i) => t + p * (d[i] ?? 0), 0);
    const resto = soma % 11;
    d.push(resto < 2 ? 0 : 11 - resto);
  }
  const s = digitos(d);
  return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}`;
}
