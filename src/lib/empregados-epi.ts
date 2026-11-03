// Empregados habilitados para entregar e receber EPI, escolhidos numa caixa dupla em Parâmetros > EPI > Parâmetros Específicos, cada um com a sua área na oficina.
// A lista é só de EPI (as de Veículos e de Viagens são outras). Lista vazia = sem restrição: as rotinas oferecem todos os empregados ativos.
// As áreas da oficina também são cadastradas ali e podem ganhar novas opções.
// Fase 1: fica só no navegador, em modo demonstração; na Fase 2 vira cadastro no banco.

type StorageLike = Pick<Storage, "getItem" | "setItem">;
const CHAVE_AREAS = "gemape-demo-epi-areas";
const CHAVE_EMPREGADOS = "gemape-demo-epi-empregados";

export type HabilitadoEpi = { empregadoId: string | null; nome: string; area: string };

export const AREAS_EPI_PADRAO: readonly string[] = [
  "Mecânico/montador",
  "Ajudante/lavador",
  "Pintor",
  "Serralheiro/soldador",
  "Auxiliar de serviços gerais",
];
export const MAX_AREAS_EPI = 30;

const limpar = (t: string) => t.trim().replace(/\s+/g, " ").slice(0, 60);
const chave = (t: string) => t.trim().toLocaleLowerCase("pt-BR");

function semRepetir(lista: string[]): string[] {
  const vistas = new Set<string>();
  return lista.map(limpar).filter((a) => {
    if (!a || vistas.has(chave(a))) return false;
    vistas.add(chave(a));
    return true;
  });
}

// ---------- Áreas da oficina ----------

export function lerAreasEpi(storage?: StorageLike): string[] {
  try {
    const bruto = (storage ?? localStorage).getItem(CHAVE_AREAS);
    const lido: unknown = bruto === null ? null : JSON.parse(bruto);
    const lista = Array.isArray(lido) ? semRepetir(lido.filter((a): a is string => typeof a === "string")) : [];
    // Sem nenhuma área os habilitados não teriam onde se encaixar: lista guardada vazia volta à padrão.
    return lista.length > 0 ? lista : [...AREAS_EPI_PADRAO];
  } catch {
    return [...AREAS_EPI_PADRAO];
  }
}

export function salvarAreasEpi(areas: string[], storage?: StorageLike): string[] {
  const lista = semRepetir(areas);
  if (lista.length === 0) throw new Error("Cadastre pelo menos uma área.");
  if (lista.length > MAX_AREAS_EPI) throw new Error(`No máximo ${MAX_AREAS_EPI} áreas.`);
  const novas = new Set(lista.map(chave));
  const emUso = [...new Set(lerEmpregadosDeEpi(storage).map((h) => h.area))].filter((a) => !novas.has(chave(a)));
  if (emUso.length > 0) throw new Error(`Há empregados habilitados na área ${emUso.join(", ")}. Mude a área deles antes de tirá-la.`);
  try {
    (storage ?? localStorage).setItem(CHAVE_AREAS, JSON.stringify(lista));
  } catch {
    throw new Error("Não foi possível guardar as áreas neste navegador.");
  }
  return lista;
}

// ---------- Empregados habilitados ----------

const formaValida = (h: unknown): h is HabilitadoEpi => {
  const o = h as Record<string, unknown> | null;
  return !!o && typeof o["nome"] === "string" && o["nome"].trim() !== "" && (o["empregadoId"] === null || typeof o["empregadoId"] === "string") && typeof o["area"] === "string" && o["area"].trim() !== "";
};

// Dado ausente ou ilegível volta a lista vazia (sem restrição), nunca a um erro na tela.
export function lerEmpregadosDeEpi(storage?: StorageLike): HabilitadoEpi[] {
  try {
    const bruto = (storage ?? localStorage).getItem(CHAVE_EMPREGADOS);
    const lido: unknown = bruto === null ? [] : JSON.parse(bruto);
    return Array.isArray(lido) ? lido.filter(formaValida) : [];
  } catch {
    return [];
  }
}

export function salvarEmpregadosDeEpi(lista: HabilitadoEpi[], storage?: StorageLike): void {
  if (!lista.every(formaValida)) throw new Error("Há um empregado com dados inválidos na lista.");
  const areas = new Set(lerAreasEpi(storage).map(chave));
  const fora = lista.find((h) => !areas.has(chave(h.area)));
  if (fora) throw new Error(`A área de ${fora.nome} não existe mais na lista de áreas.`);
  try {
    (storage ?? localStorage).setItem(CHAVE_EMPREGADOS, JSON.stringify(lista));
  } catch {
    throw new Error("Não foi possível guardar a lista neste navegador.");
  }
}

// As rotinas de EPI só oferecem quem está na lista; sem lista, todos. Compara pelo id do empregado e, para quem entrou sem vínculo, pelo nome.
export function soEmpregadosDeEpi<T extends { id: string; nome: string }>(empregados: T[], storage?: StorageLike): T[] {
  const lista = lerEmpregadosDeEpi(storage);
  if (lista.length === 0) return empregados;
  const ids = new Set(lista.flatMap((h) => (h.empregadoId ? [h.empregadoId] : [])));
  // O nome só vale para quem entrou sem vínculo: com id, um homônimo de outra empresa não passa.
  const nomes = new Set(lista.filter((h) => !h.empregadoId).map((h) => chave(h.nome)));
  return empregados.filter((e) => ids.has(e.id) || nomes.has(chave(e.nome)));
}
