// Ficha resumida mostra só o que existe: "Não informado", "-", "—", "R$ 0,00" e vazio somem da tela.
// O número 0 continua (saldo zero é informação, e das importantes); só o dinheiro zerado é tratado como "sem valor".
// trim() e o \s da regra já tratam o espaço sem quebra que a formatação de moeda põe entre "R$" e o valor.
const SEM_VALOR = /^(?:-+|—+|n[ãa]o informad[oa]s?|sem informa[çc][ãa]o|r\$\s*0+(?:[.,]0+)?)$/i;

export function temValorInformativo(valor: unknown): boolean {
  if (valor === null || valor === undefined) return false;
  if (typeof valor === "number") return Number.isFinite(valor);
  const s = String(valor).trim();
  return s !== "" && !SEM_VALOR.test(s);
}
