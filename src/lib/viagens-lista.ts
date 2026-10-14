// Lista das despesas do mês (dec 186): uma linha por lançamento, com filtros e status. "Finalizado" é a despesa que já
// entrou num relatório gerado; as demais estão "Em aberto".
import type { RespostaRegistrada } from "./respostas-despesas.ts";
import { dadosDoLancamento, lancamentosDoPeriodo, type PeriodoMes } from "./viagens.ts";

export type StatusDespesa = "Em aberto" | "Finalizado";
export const STATUS_EM_ABERTO: StatusDespesa = "Em aberto";
export const STATUS_FINALIZADO: StatusDespesa = "Finalizado";

export type ImagemDespesa = { nome: string; dataUrl: string };
export type LinhaDespesa = {
  id: string;
  data: string;
  local: string | null;
  cliente: string | null;
  tecnico: string | null;
  responsavel: string | null;
  tipo: string;
  valor: number | null;
  fotos: ImagemDespesa[];
  descricao: string | null;
  itens: RespostaRegistrada["itens"];
  registradoEm: string;
  // Lançada pelo próprio técnico (verdadeiro), pelo gestor (falso) ou fora do índice (nulo), como no ICL.
  conforme: boolean | null;
  status: StatusDespesa;
  relatorioId: string | null;
};

export type FiltroLista = { tipo: string | null; tecnico: string | null; de: string; ate: string };
export const FILTRO_VAZIO: FiltroLista = { tipo: null, tecnico: null, de: "", ate: "" };

const ID_UF = "q-05";
const ID_MUNICIPIO = "q-06";
const resposta = (r: RespostaRegistrada, id: string): string | null => r.itens.find((i) => i.perguntaId === id)?.resposta?.trim() || null;

// "Belo Horizonte/MG" a partir das perguntas de estado ("Minas Gerais - MG") e município.
export function localDaDespesa(r: RespostaRegistrada): string | null {
  const uf = /-\s*([A-Z]{2})\s*$/.exec(resposta(r, ID_UF) ?? "")?.[1] ?? null;
  const cidade = resposta(r, ID_MUNICIPIO);
  if (cidade && uf) return `${cidade}/${uf}`;
  return cidade ?? uf;
}

export function linhaDaDespesa(r: RespostaRegistrada, relatorios: ReadonlyMap<string, string>): LinhaDespesa {
  const d = dadosDoLancamento(r);
  const relatorioId = relatorios.get(r.id) ?? null;
  return {
    id: r.id, data: d.dataDespesa ?? r.data, local: localDaDespesa(r), cliente: d.cliente, tecnico: d.responsavel ?? d.tecnico,
    responsavel: d.responsavel, tipo: d.tipo, valor: d.valor,
    fotos: r.itens.flatMap((i) => i.imagens ?? []).filter((i) => i.dataUrl.startsWith("data:image/")),
    descricao: d.descricao, itens: r.itens, registradoEm: `${r.data} ${r.hora}`,
    conforme: d.conforme,
    status: relatorioId ? STATUS_FINALIZADO : STATUS_EM_ABERTO, relatorioId,
  };
}

// Despesas do mês escolhido, da mais nova para a mais antiga, com os filtros aplicados.
export function listaDoPeriodo(lista: readonly RespostaRegistrada[], p: PeriodoMes, relatorios: ReadonlyMap<string, string>, f: FiltroLista = FILTRO_VAZIO): LinhaDespesa[] {
  return lancamentosDoPeriodo(lista, p)
    .map((r) => linhaDaDespesa(r, relatorios))
    .filter((l) => (!f.tipo || l.tipo === f.tipo) && (!f.tecnico || l.tecnico === f.tecnico) && (!f.de || l.data >= f.de) && (!f.ate || l.data <= f.ate))
    .sort((a, b) => b.data.localeCompare(a.data) || b.registradoEm.localeCompare(a.registradoEm) || b.id.localeCompare(a.id));
}

export const periodoDeDatasValido = (f: FiltroLista): boolean => !f.de || !f.ate || f.de <= f.ate;

// Extrato do técnico no mês (dec 187): despesas dele (técnico responsável), quantidade e custo total.
export type Extrato = { quantidade: number; custoTotal: number; linhas: LinhaDespesa[] };
export function extratoDoTecnico(lista: readonly RespostaRegistrada[], p: PeriodoMes, tecnico: string, relatorios: ReadonlyMap<string, string>): Extrato {
  const linhas = listaDoPeriodo(lista, p, relatorios).filter((l) => l.responsavel === tecnico);
  return { quantidade: linhas.length, custoTotal: linhas.reduce((soma, l) => soma + (l.valor ?? 0), 0), linhas };
}

// Mês anterior (-1) ou seguinte (+1), virando o ano quando preciso.
export function deslocarMes(p: PeriodoMes, delta: number): PeriodoMes {
  const indice = p.ano * 12 + (p.mes - 1) + delta;
  return { ano: Math.floor(indice / 12), mes: (indice % 12) + 1 };
}
