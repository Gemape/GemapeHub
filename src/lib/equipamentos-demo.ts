// Cadastro de equipamentos (Parâmetros > Equipamentos), guardado só no navegador em modo demonstração.
// Fase 1: a tabela `equipamentos` entra na Fase 2 (docs/pendencias-fase2.md).
import { normalizarEquipamento, type EntradaEquipamento, type EquipamentoDados } from "./equipamentos.ts";

export type Equipamento = EquipamentoDados & { id: string; criadoEm: string };
type StorageLike = Pick<Storage, "getItem" | "setItem">;
const CHAVE = "gemape-demo-equipamentos";

// Dado salvo ilegível nunca é sobrescrito: a lista aparece vazia, mas gravar por cima apagaria o que sobrou.
function conferirIntegridade(storage: StorageLike): void {
  const bruto = storage.getItem(CHAVE);
  if (bruto === null) return;
  let ok = false;
  try {
    const lido: unknown = JSON.parse(bruto);
    ok = Array.isArray(lido) && lido.every((e) => !!e && typeof e === "object");
  } catch {
    ok = false;
  }
  if (!ok) throw new Error("Os equipamentos salvos neste navegador estão ilegíveis; nada foi alterado.");
}

export function listarEquipamentos(storage: StorageLike = localStorage): Equipamento[] {
  try {
    const lidos: unknown = JSON.parse(storage.getItem(CHAVE) ?? "[]");
    return Array.isArray(lidos) ? (lidos as Equipamento[]).filter((e) => !!e && typeof e === "object") : [];
  } catch {
    return [];
  }
}

// Valida tudo antes de gravar e grava a lista numa única escrita: ou o equipamento entra por inteiro, ou nada muda.
export function salvarEquipamento(valores: EntradaEquipamento, storage: StorageLike = localStorage, agora = new Date()): Equipamento {
  conferirIntegridade(storage);
  const lista = listarEquipamentos(storage);
  const id = valores.id ?? crypto.randomUUID();
  const indice = lista.findIndex((e) => e.id === id);
  if (valores.id && indice < 0) throw new Error("Este equipamento foi excluído; feche a janela e cadastre de novo, se for o caso.");
  const dados = normalizarEquipamento(valores, { hoje: agora });
  if (lista.some((e) => e.id !== id && e.patrimonio.toLocaleUpperCase("pt-BR") === dados.patrimonio)) {
    throw new Error(`Já existe um equipamento com o código de patrimônio ${dados.patrimonio}.`);
  }
  const equipamento: Equipamento = { ...dados, id, criadoEm: lista[indice]?.criadoEm ?? agora.toISOString() };
  const nova = indice >= 0 ? lista.map((e, i) => (i === indice ? equipamento : e)) : [...lista, equipamento];
  storage.setItem(CHAVE, JSON.stringify(nova));
  return equipamento;
}

export function removerEquipamento(id: string, storage: StorageLike = localStorage): void {
  conferirIntegridade(storage);
  storage.setItem(CHAVE, JSON.stringify(listarEquipamentos(storage).filter((e) => e.id !== id)));
}
