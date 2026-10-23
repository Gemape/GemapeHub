// Regras do cadastro de veículo (especificação rev1, Etapa D).
// Decisão 66 (substituída): empilhadeira deixou de ser veículo e fica no módulo Equipamentos; todo veículo tem placa.
export const subcategoriaTemPlaca = (_nomeSubcategoria: string | null | undefined): boolean => true;

// Placa no padrão antigo (ABC-1234) ou Mercosul (ABC1D23). Guarda sem hífen, em maiúsculas.
export function normalizarPlaca(placa: string): string {
  return placa.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export const placaValida = (placa: string) =>
  /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(normalizarPlaca(placa));

// Mostra a placa antiga com hífen (ABC-1234) e a Mercosul como está (ABC1D23).
export function formatarPlaca(placa: string | null | undefined): string {
  const p = normalizarPlaca(placa ?? "");
  return /^[A-Z]{3}\d{4}$/.test(p) ? `${p.slice(0, 3)}-${p.slice(3)}` : p;
}

// Ano de fabricação: de 1950 até o ano que vem (modelos lançados antes da virada).
export function anoValido(ano: number, hoje = new Date()): boolean {
  return Number.isInteger(ano) && ano >= 1950 && ano <= hoje.getFullYear() + 1;
}

// Placa repetida em outro veículo (de qualquer empresa).
export function placaRepetida(
  placa: string,
  veiculos: { id: string; placa: string | null }[],
  ignorarId?: string,
): boolean {
  const alvo = normalizarPlaca(placa);
  return veiculos.some((v) => v.id !== ignorarId && normalizarPlaca(v.placa ?? "") === alvo);
}
