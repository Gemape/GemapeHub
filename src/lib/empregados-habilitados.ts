// Empregados habilitados (cada um com a sua área de atuação) e a lista de áreas, guardados no navegador em modo demonstração. Cada domínio (EPI, Uniformes) tem as suas duas
// listas, com chaves próprias: habilitar alguém no EPI não habilita nos Uniformes. Lista de habilitados vazia, ou sem ninguém dela entre os empregados oferecidos (a empresa escolhida) = sem restrição: as rotinas oferecem todos os empregados ativos.
// Fase 1: fica só no navegador; na Fase 2 vira cadastro no banco.

export type StorageLike = Pick<Storage, "getItem" | "setItem">;
export type Habilitado = { empregadoId: string | null; nome: string; area: string };

export const MAX_AREAS = 30;

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

const formaValida = (h: unknown): h is Habilitado => {
  const o = h as Record<string, unknown> | null;
  return !!o && typeof o["nome"] === "string" && o["nome"].trim() !== "" && (o["empregadoId"] === null || typeof o["empregadoId"] === "string") && typeof o["area"] === "string" && o["area"].trim() !== "";
};

export function criarListaDeHabilitados(config: { chaveAreas: string; chaveEmpregados: string; areasPadrao: readonly string[] }) {
  const { chaveAreas, chaveEmpregados, areasPadrao } = config;

  function lerAreas(storage?: StorageLike): string[] {
    try {
      const bruto = (storage ?? localStorage).getItem(chaveAreas);
      const lido: unknown = bruto === null ? null : JSON.parse(bruto);
      const lista = Array.isArray(lido) ? semRepetir(lido.filter((a): a is string => typeof a === "string")) : [];
      // Sem nenhuma área os habilitados não teriam onde se encaixar: lista guardada vazia volta à padrão.
      return lista.length > 0 ? lista : [...areasPadrao];
    } catch {
      return [...areasPadrao];
    }
  }

  // Dado ausente ou ilegível volta a lista vazia (sem restrição), nunca a um erro na tela.
  function lerEmpregados(storage?: StorageLike): Habilitado[] {
    try {
      const bruto = (storage ?? localStorage).getItem(chaveEmpregados);
      const lido: unknown = bruto === null ? [] : JSON.parse(bruto);
      return Array.isArray(lido) ? lido.filter(formaValida) : [];
    } catch {
      return [];
    }
  }

  function salvarAreas(areas: string[], storage?: StorageLike): string[] {
    const lista = semRepetir(areas);
    if (lista.length === 0) throw new Error("Cadastre pelo menos uma área.");
    if (lista.length > MAX_AREAS) throw new Error(`No máximo ${MAX_AREAS} áreas.`);
    const novas = new Set(lista.map(chave));
    const emUso = [...new Set(lerEmpregados(storage).map((h) => h.area))].filter((a) => !novas.has(chave(a)));
    if (emUso.length > 0) throw new Error(`Há empregados habilitados na área ${emUso.join(", ")}. Mude a área deles antes de tirá-la.`);
    try {
      (storage ?? localStorage).setItem(chaveAreas, JSON.stringify(lista));
    } catch {
      throw new Error("Não foi possível guardar as áreas neste navegador.");
    }
    return lista;
  }

  function salvarEmpregados(lista: Habilitado[], storage?: StorageLike): void {
    if (!lista.every(formaValida)) throw new Error("Há um empregado com dados inválidos na lista.");
    const areas = new Set(lerAreas(storage).map(chave));
    const fora = lista.find((h) => !areas.has(chave(h.area)));
    if (fora) throw new Error(`A área de ${fora.nome} não existe mais na lista de áreas.`);
    try {
      (storage ?? localStorage).setItem(chaveEmpregados, JSON.stringify(lista));
    } catch {
      throw new Error("Não foi possível guardar a lista neste navegador.");
    }
  }

  // As rotinas só oferecem quem está na lista; sem lista, ou sem ninguém da lista entre os empregados oferecidos, todos. Compara pelo id do empregado e, para quem entrou sem vínculo, pelo nome.
  function entreHabilitados<T extends { id: string; nome: string }>(lista: Habilitado[], empregados: T[]): T[] {
    const ids = new Set(lista.flatMap((h) => (h.empregadoId ? [h.empregadoId] : [])));
    // O nome só vale para quem entrou sem vínculo: com id, um homônimo de outra empresa não passa.
    const nomes = new Set(lista.filter((h) => !h.empregadoId).map((h) => chave(h.nome)));
    return empregados.filter((e) => ids.has(e.id) || nomes.has(chave(e.nome)));
  }

  function soHabilitados<T extends { id: string; nome: string }>(empregados: T[], storage?: StorageLike): T[] {
    const lista = lerEmpregados(storage);
    if (lista.length === 0) return empregados;
    const habilitados = entreHabilitados(lista, empregados);
    // A lista de habilitados é por pessoa: se ninguém dos empregados oferecidos (a empresa escolhida) está nela, não há restrição para eles e as rotinas oferecem todos, em vez de uma
    // caixa de seleção vazia que trava a tela.
    return habilitados.length > 0 ? habilitados : empregados;
  }

  // Há habilitados cadastrados, mas nenhum dos empregados oferecidos (os ativos da empresa escolhida) está entre eles: a lista ficou desatualizada e as rotinas oferecem todos.
  function listaDesatualizada(empregados: { id: string; nome: string }[], storage?: StorageLike): boolean {
    const lista = lerEmpregados(storage);
    return empregados.length > 0 && lista.length > 0 && entreHabilitados(lista, empregados).length === 0;
  }

  return { lerAreas, salvarAreas, lerEmpregados, salvarEmpregados, soHabilitados, listaDesatualizada };
}
