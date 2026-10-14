// Plano de manutenção por veículo (decisão 52). Fase 1: fica só no navegador, em modo
// demonstração; a tabela no banco real é pendência da Fase 2.
// Para cada grupo de ação habilitado: limite de km e de tempo (meses), o que vier primeiro.

type StorageLike = Pick<Storage, "getItem" | "setItem">;

const CHAVE = "gemape-demo-planos-manutencao";
export const EVENTO_PLANOS = "gemape-planos-manutencao";

export type ItemPlano = { acaoId: string; km: number; meses: number };
export type PlanoManutencao = { veiculoId: string; itens: ItemPlano[]; atualizadoEm: string };
export type EntradaItem = { acaoId: string; km: string | number; meses: string | number };

const storagePadrao = (): StorageLike | null =>
  typeof localStorage === "undefined" ? null : localStorage;

// `integro` é false quando havia dados que não puderam ser lidos: nada é gravado por cima deles.
function lerComEstado(storage: StorageLike | null): { planos: PlanoManutencao[]; integro: boolean } {
  if (!storage) return { planos: [], integro: true };
  const bruto = storage.getItem(CHAVE);
  if (bruto === null) return { planos: [], integro: true };
  try {
    const salvos = JSON.parse(bruto) as unknown;
    if (!Array.isArray(salvos)) return { planos: [], integro: false };
    const validos = salvos.filter((p): p is Partial<PlanoManutencao> => !!p && typeof p === "object" && "veiculoId" in p);
    const planos = validos
      .map((p) => ({
        veiculoId: String(p.veiculoId),
        atualizadoEm: String(p.atualizadoEm ?? ""),
        itens: (Array.isArray(p.itens) ? p.itens : []).filter((i) => !!i && typeof i === "object").map((i) => ({
          acaoId: String(i.acaoId), km: Number(i.km) || 0, meses: Number(i.meses) || 0,
        })),
      }));
    // Entrada que não deu para ler: a lista aparece sem ela, mas nenhuma gravação passa por cima.
    return { planos, integro: validos.length === salvos.length };
  } catch {
    return { planos: [], integro: false };
  }
}

export const lerPlanos = (storage: StorageLike | null = storagePadrao()): PlanoManutencao[] =>
  lerComEstado(storage).planos;

function alterar(storage: StorageLike | null, mudanca: (planos: PlanoManutencao[]) => PlanoManutencao[]) {
  if (!storage) throw new Error("Armazenamento do navegador indisponível.");
  const { planos, integro } = lerComEstado(storage);
  if (!integro) {
    throw new Error("Os planos salvos neste navegador não puderam ser lidos. Nada foi alterado, para não apagá-los.");
  }
  storage.setItem(CHAVE, JSON.stringify(mudanca(planos)));
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO_PLANOS));
}

// Inteiro maior que zero, com ponto só como separador de milhar ("5.000"); "1.5" não vale.
const inteiroPositivo = (valor: string | number): number | null => {
  if (typeof valor === "number" && !Number.isInteger(valor)) return null;
  const texto = String(valor ?? "").trim();
  if (!/^\d+$/.test(texto) && !/^\d{1,3}(\.\d{3})+$/.test(texto)) return null;
  const numero = Number(texto.replace(/\./g, ""));
  return numero > 0 && numero <= 9_999_999 ? numero : null;
};

function validarItens(itens: EntradaItem[], acoesValidas?: string[]): ItemPlano[] {
  if (acoesValidas && itens.some((i) => !acoesValidas.includes(i.acaoId))) {
    throw new Error("Um grupo de ação do plano não existe mais em Ações de manutenção. Remova-o e salve de novo.");
  }
  if (itens.length === 0) throw new Error("Habilite ao menos um grupo de ação.");
  const vistos = new Set<string>();
  return itens.map((i) => {
    if (vistos.has(i.acaoId)) throw new Error("Grupo de ação repetido no plano.");
    vistos.add(i.acaoId);
    const km = inteiroPositivo(i.km);
    if (km === null) throw new Error("Informe o limite de km (número inteiro maior que zero) de cada grupo.");
    const meses = inteiroPositivo(i.meses);
    if (meses === null) throw new Error("Informe o limite de meses (número inteiro maior que zero) de cada grupo.");
    return { acaoId: i.acaoId, km, meses };
  });
}

export function criarPlano(
  veiculoId: string,
  itens: EntradaItem[],
  storage = storagePadrao(),
  agora = new Date(),
  acoesValidas?: string[],
): PlanoManutencao {
  if (!veiculoId) throw new Error("Selecione o veículo.");
  const validos = validarItens(itens, acoesValidas);
  const plano: PlanoManutencao = { veiculoId, itens: validos, atualizadoEm: agora.toISOString() };
  alterar(storage, (planos) => {
    if (planos.some((p) => p.veiculoId === veiculoId)) throw new Error("Este veículo já tem plano. Use Editar.");
    return [...planos, plano];
  });
  return plano;
}

// Editar abre todos os campos (decisão 51): troca os grupos e também o veículo, desde que o
// veículo novo não tenha plano. Tudo ou nada.
export function editarPlano(
  veiculoIdAtual: string,
  novo: { veiculoId: string; itens: EntradaItem[] },
  storage = storagePadrao(),
  agora = new Date(),
  acoesValidas?: string[],
): PlanoManutencao {
  if (!novo.veiculoId) throw new Error("Selecione o veículo.");
  const validos = validarItens(novo.itens, acoesValidas);
  const plano: PlanoManutencao = { veiculoId: novo.veiculoId, itens: validos, atualizadoEm: agora.toISOString() };
  alterar(storage, (planos) => {
    if (!planos.some((p) => p.veiculoId === veiculoIdAtual)) throw new Error("Plano não encontrado.");
    if (novo.veiculoId !== veiculoIdAtual && planos.some((p) => p.veiculoId === novo.veiculoId)) {
      throw new Error("Este veículo já tem plano. Use Editar.");
    }
    return planos.map((p) => (p.veiculoId === veiculoIdAtual ? plano : p));
  });
  return plano;
}

export function removerPlano(veiculoId: string, storage = storagePadrao()): void {
  alterar(storage, (planos) => planos.filter((p) => p.veiculoId !== veiculoId));
}

// Itens do plano cujo grupo ainda existe em Parâmetros > Veículos > Ações de manutenção.
export function itensDoPlano(plano: PlanoManutencao, acoes: { id: string; nome: string }[]): (ItemPlano & { nome: string })[] {
  return plano.itens.flatMap((i) => {
    const acao = acoes.find((a) => a.id === i.acaoId);
    return acao ? [{ ...i, nome: acao.nome }] : [];
  });
}
