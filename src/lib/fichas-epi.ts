// Ficha de EPI (especificação rev1, Etapa B). Fase 1: fica só no navegador, em modo
// demonstração. A tabela no banco real é pendência da Fase 2.

type StorageLike = Pick<Storage, "getItem" | "setItem">;

const CHAVE = "gemape-demo-fichas-epi";
export const EVENTO_FICHAS = "gemape-fichas-epi";

// Campos de cadastro manual, na ordem da especificação.
export const CAMPOS_FICHA = [
  { chave: "setores", rotulo: "Setores aplicáveis" },
  { chave: "finalidade", rotulo: "Finalidade e riscos protegidos" },
  { chave: "instrucoes", rotulo: "Instruções de uso e forma de vestir" },
  { chave: "verificacao", rotulo: "Verificação de eficácia (antes do uso)" },
  { chave: "higienizacao", rotulo: "Higienização e conservação" },
  { chave: "descarte", rotulo: "Descarte" },
  { chave: "responsabilidades", rotulo: "Responsabilidades do empregado (NR6)" },
] as const;

export type CampoFicha = (typeof CAMPOS_FICHA)[number]["chave"];
export type ConteudoFicha = Record<CampoFicha, string>;
export type FichaEpi = ConteudoFicha & { epiId: string; atualizadaEm: string };

const storagePadrao = (): StorageLike | null =>
  typeof localStorage === "undefined" ? null : localStorage;

export const fichaVazia = (): ConteudoFicha =>
  Object.fromEntries(CAMPOS_FICHA.map((c) => [c.chave, ""])) as ConteudoFicha;

// `integro` é false quando havia dados que não puderam ser lidos: a tela mostra a lista
// vazia, mas nenhuma alteração é gravada por cima deles.
function lerComEstado(storage: StorageLike | null): { fichas: FichaEpi[]; integro: boolean } {
  if (!storage) return { fichas: [], integro: true };
  const bruto = storage.getItem(CHAVE);
  if (bruto === null) return { fichas: [], integro: true };
  try {
    const salvas = JSON.parse(bruto) as unknown;
    if (!Array.isArray(salvas)) return { fichas: [], integro: false };
    const fichas = salvas
      .filter((f): f is Partial<FichaEpi> => !!f && typeof f === "object" && "epiId" in f)
      .map((f) => ({
        ...fichaVazia(),
        ...Object.fromEntries(CAMPOS_FICHA.map((c) => [c.chave, String(f[c.chave] ?? "")])),
        epiId: String(f.epiId),
        atualizadaEm: String(f.atualizadaEm ?? ""),
      }));
    return { fichas, integro: true };
  } catch {
    return { fichas: [], integro: false };
  }
}

export const lerFichas = (storage: StorageLike | null = storagePadrao()): FichaEpi[] =>
  lerComEstado(storage).fichas;

function alterar(storage: StorageLike | null, mudanca: (fichas: FichaEpi[]) => FichaEpi[]) {
  if (!storage) throw new Error("Armazenamento do navegador indisponível.");
  const { fichas, integro } = lerComEstado(storage);
  if (!integro) {
    throw new Error(
      "As fichas salvas neste navegador não puderam ser lidas. Nada foi alterado, para não apagá-las.",
    );
  }
  storage.setItem(CHAVE, JSON.stringify(mudanca(fichas)));
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO_FICHAS));
}

// Uma ficha por EPI. Todos os campos são obrigatórios.
export function salvarFicha(
  epiId: string,
  conteudo: ConteudoFicha,
  storage = storagePadrao(),
  agora = new Date(),
): FichaEpi {
  if (!epiId) throw new Error("Selecione o EPI.");
  const limpo = { ...fichaVazia() };
  for (const campo of CAMPOS_FICHA) {
    limpo[campo.chave] = String(conteudo[campo.chave] ?? "").trim();
    if (!limpo[campo.chave]) throw new Error(`Preencha "${campo.rotulo}".`);
  }
  const ficha: FichaEpi = { ...limpo, epiId, atualizadaEm: agora.toISOString() };
  alterar(storage, (fichas) => [...fichas.filter((f) => f.epiId !== epiId), ficha]);
  return ficha;
}

export function removerFicha(epiId: string, storage = storagePadrao()): void {
  alterar(storage, (fichas) => fichas.filter((f) => f.epiId !== epiId));
}

// Editar a ficha trocando o EPI (decisão 51): a ficha passa para o EPI novo, que não pode ter
// ficha, e deixa de existir no antigo. Numa só gravação: se algo falha, nada muda.
export function moverFicha(
  epiIdAntigo: string,
  epiIdNovo: string,
  conteudo: ConteudoFicha,
  storage = storagePadrao(),
  agora = new Date(),
): FichaEpi {
  if (!epiIdNovo) throw new Error("Selecione o EPI.");
  if (epiIdNovo === epiIdAntigo) return salvarFicha(epiIdNovo, conteudo, storage, agora);
  const limpo = { ...fichaVazia() };
  for (const campo of CAMPOS_FICHA) {
    limpo[campo.chave] = String(conteudo[campo.chave] ?? "").trim();
    if (!limpo[campo.chave]) throw new Error(`Preencha "${campo.rotulo}".`);
  }
  const ficha: FichaEpi = { ...limpo, epiId: epiIdNovo, atualizadaEm: agora.toISOString() };
  alterar(storage, (fichas) => {
    if (fichas.some((f) => f.epiId === epiIdNovo)) throw new Error("Este EPI já tem ficha.");
    return [...fichas.filter((f) => f.epiId !== epiIdAntigo), ficha];
  });
  return ficha;
}
