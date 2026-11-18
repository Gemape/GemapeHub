// O que o desligamento de um empregado deixa para resolver:
// 1) o supervisor dele recebe um alerta para substituí-lo onde ele era responsável por alguma tarefa (guardado aqui até alguém marcar como resolvido);
// 2) se ele é portador de uma caixa de ferramentas, a caixa precisa ser desvinculada na hora (e a vistoria de encerramento feita): essa pendência não se guarda, é calculada
//    do histórico de portadores e some sozinha quando o vínculo é encerrado.
// Fase 1: os alertas ficam só no navegador, em modo demonstração, como o supervisor do empregado; na Fase 2 viram tabela no banco.
import { demissaoVencida } from "./empregados.ts";
import type { PortadorCaixa } from "./portadores-caixa.ts";

type StorageLike = Pick<Storage, "getItem" | "setItem">;
export const CHAVE_ALERTAS_DESLIGAMENTO = "gemape-demo-alertas-desligamento";
export const EVENTO_ALERTAS_DESLIGAMENTO = "gemape-alertas-desligamento";

export type AlertaDesligamento = {
  id: string;
  empregadoId: string;
  empregadoNome: string;
  /** Quem deve substituí-lo; vazio quando o empregado não tinha supervisor cadastrado. */
  supervisorId: string | null;
  supervisorNome: string | null;
  dataDesligamento: string;
  criadoEm: string;
  resolvidoEm: string | null;
};

const padrao = (): StorageLike | null => (typeof localStorage === "undefined" ? null : localStorage);
const avisar = () => { if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO_ALERTAS_DESLIGAMENTO)); };

export function lerAlertasDeDesligamento(storage: StorageLike | null = padrao()): AlertaDesligamento[] {
  try {
    const bruto = storage?.getItem(CHAVE_ALERTAS_DESLIGAMENTO);
    const lido: unknown = bruto ? JSON.parse(bruto) : [];
    return Array.isArray(lido) ? (lido as AlertaDesligamento[]).filter((a) => a && typeof a.id === "string" && typeof a.empregadoId === "string") : [];
  } catch { return []; }
}

const gravar = (lista: AlertaDesligamento[], storage: StorageLike) => { storage.setItem(CHAVE_ALERTAS_DESLIGAMENTO, JSON.stringify(lista)); avisar(); };

export type EntradaAlerta = { empregadoId: string; empregadoNome: string; supervisorId?: string | null | undefined; supervisorNome?: string | null | undefined; dataDesligamento: string };

/** Abre o alerta ao supervisor. Desligar de novo o mesmo empregado (depois de desfazer) não duplica o alerta ainda aberto. */
export function abrirAlertaDeDesligamento(e: EntradaAlerta, agora: string, storage: StorageLike | null = padrao()): AlertaDesligamento | null {
  if (!storage) return null;
  const lista = lerAlertasDeDesligamento(storage);
  const aberto = lista.find((a) => a.empregadoId === e.empregadoId && !a.resolvidoEm);
  if (aberto) return aberto;
  const novo: AlertaDesligamento = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `deslig-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    empregadoId: e.empregadoId, empregadoNome: e.empregadoNome, supervisorId: e.supervisorId ?? null, supervisorNome: e.supervisorNome ?? null,
    dataDesligamento: e.dataDesligamento, criadoEm: agora, resolvidoEm: null,
  };
  gravar([...lista, novo], storage);
  return novo;
}

/** Desfazer o desligamento retira o alerta que ele abriu (se ainda estiver aberto). */
export function retirarAlertaDeDesligamento(empregadoId: string, storage: StorageLike | null = padrao()): void {
  if (!storage) return;
  const lista = lerAlertasDeDesligamento(storage);
  const resto = lista.filter((a) => !(a.empregadoId === empregadoId && !a.resolvidoEm));
  if (resto.length !== lista.length) gravar(resto, storage);
}

export function resolverAlertaDeDesligamento(id: string, agora: string, storage: StorageLike | null = padrao()): void {
  if (!storage) return;
  const lista = lerAlertasDeDesligamento(storage);
  if (!lista.some((a) => a.id === id && !a.resolvidoEm)) return;
  gravar(lista.map((a) => (a.id === id && !a.resolvidoEm ? { ...a, resolvidoEm: agora } : a)), storage);
}

export const alertasAbertos = (lista: readonly AlertaDesligamento[]): AlertaDesligamento[] => lista.filter((a) => !a.resolvidoEm);

type EmpregadoPortador = { id: string; nome: string; ativo: boolean; data_demissao: string | null };
export type PortadorDesligado = { registroId: string; caixaId: string; caixaCodigo: string; empregadoId: string; empregadoNome: string; dataDemissao: string | null };

/** Caixas cujo portador ativo já foi desligado (inativo ou com a data de demissão vencida): a caixa precisa ser desvinculada na hora. */
export function portadoresDesligados(portadores: readonly PortadorCaixa[], empregados: readonly EmpregadoPortador[], hoje: string): PortadorDesligado[] {
  const porId = new Map(empregados.map((e) => [e.id, e]));
  const saida: PortadorDesligado[] = [];
  for (const p of portadores) {
    if (p.status !== "Ativa") continue;
    const e = porId.get(p.empregado_id);
    if (!e || (e.ativo && !demissaoVencida(e, hoje))) continue;
    saida.push({ registroId: p.id, caixaId: p.caixa_id, caixaCodigo: p.caixa_codigo, empregadoId: e.id, empregadoNome: e.nome, dataDemissao: e.data_demissao });
  }
  return saida.sort((a, b) => a.caixaCodigo.localeCompare(b.caixaCodigo, "pt-BR", { numeric: true }));
}

/** Supervisor obrigatório no cadastro: precisa ser outro empregado e estar ativo. Devolve o erro em texto ou null. */
export function erroDoSupervisor(supervisorId: string | null | undefined, empregadoId: string | null | undefined, empregados: readonly { id: string; ativo: boolean; data_demissao: string | null }[], hoje: string): string | null {
  if (!supervisorId) return "Escolha o supervisor do empregado.";
  if (supervisorId === empregadoId) return "O supervisor precisa ser outra pessoa.";
  const s = empregados.find((e) => e.id === supervisorId);
  if (!s || !s.ativo || demissaoVencida(s, hoje)) return "O supervisor precisa ser um empregado ativo.";
  return null;
}
