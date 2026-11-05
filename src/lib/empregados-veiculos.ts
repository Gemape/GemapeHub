// Empregados envolvidos nas rotinas de veículos em geral (decisão 308), escolhidos numa caixa dupla em Parâmetros > Veículos > Parâmetros Específicos, cada um com a
// sua área. A lista é só de Veículos (a de Viagens é outra). Lista vazia = sem restrição: as rotinas oferecem todos os empregados ativos.
// Fase 1: fica só no navegador, em modo demonstração; na Fase 2 vira cadastro no banco.
import type { Habilitado } from "./questionario-despesas.ts";
import { AREAS_VIAGEM } from "./questionario-despesas.ts";

type StorageLike = Pick<Storage, "getItem" | "setItem">;
const CHAVE = "gemape-demo-veiculos-empregados";

const habilitadoValido = (h: unknown): h is Habilitado => {
  const o = h as Record<string, unknown> | null;
  return !!o && typeof o["nome"] === "string" && (o["empregadoId"] === null || typeof o["empregadoId"] === "string") && (AREAS_VIAGEM as readonly string[]).includes(String(o["area"]));
};

// Dado ausente ou ilegível volta a lista vazia (sem restrição), nunca a um erro na tela.
export function lerEmpregadosDeVeiculos(storage?: StorageLike): Habilitado[] {
  try {
    const bruto = (storage ?? localStorage).getItem(CHAVE);
    const lido: unknown = bruto === null ? [] : JSON.parse(bruto);
    return Array.isArray(lido) ? lido.filter(habilitadoValido) : [];
  } catch {
    return [];
  }
}

export function salvarEmpregadosDeVeiculos(lista: Habilitado[], storage?: StorageLike): void {
  if (!lista.every(habilitadoValido)) throw new Error("Há um empregado com dados inválidos na lista.");
  try {
    (storage ?? localStorage).setItem(CHAVE, JSON.stringify(lista));
  } catch {
    throw new Error("Não foi possível guardar a lista neste navegador.");
  }
}

// As rotinas de veículos só oferecem quem está na lista; sem lista, ou sem ninguém da lista entre os empregados oferecidos, todos (como em empregados-habilitados.ts). Compara pelo id do empregado e, para quem entrou sem vínculo, pelo nome.
export function soEmpregadosDeVeiculos<T extends { id: string; nome: string }>(empregados: T[], storage?: StorageLike): T[] {
  const lista = lerEmpregadosDeVeiculos(storage);
  if (lista.length === 0) return empregados;
  const ids = new Set(lista.flatMap((h) => (h.empregadoId ? [h.empregadoId] : [])));
  // O nome só vale para quem entrou sem vínculo: com id, um homônimo de outra empresa não passa.
  const nomes = new Set(lista.filter((h) => !h.empregadoId).map((h) => h.nome.trim().toLocaleLowerCase("pt-BR")));
  const habilitados = empregados.filter((e) => ids.has(e.id) || nomes.has(e.nome.trim().toLocaleLowerCase("pt-BR")));
  return habilitados.length > 0 ? habilitados : empregados;
}
