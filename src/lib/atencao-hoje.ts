// "O que precisa da sua atenção hoje": pendências reais, por prioridade, já com o caminho de cada ação. Só lê dados em memória; quem chama busca as listas.
import { somarDias } from "./consulta-rapida.ts";
import { resumoEmpregado, type ItemDoResumo } from "./resumo-empregado.ts";
import type { MovimentacaoEpi } from "./entrega-epi.ts";

export type AcaoPendencia = { rotulo: string; url: string; search?: Record<string, string> };
export type ItemPendencia = { chave: string; texto: string; detalhe: string; acao: AcaoPendencia };
export type GrupoPendencia = { id: string; titulo: string; prioridade: "alta" | "media" | "baixa"; vazio: string; itens: ItemPendencia[] };

type EmpregadoBase = { id: string; nome: string; empresa_id?: string | null; ativo?: boolean | null; data_demissao?: string | null };
type ItemEstoque = ItemDoResumo & { codigo_sku?: string | null; estoque_atual?: number | null; estoque_minimo?: number | null; status?: string | null };
export type EstadoDoEstoque = { saldo: number; minimo: number; alerta: boolean };

export type EntradaAtencao = {
  hoje: string;
  empregados: readonly EmpregadoBase[];
  epis: readonly ItemEstoque[];
  uniformes: readonly ItemEstoque[];
  ferramentas: readonly ItemEstoque[];
  movsEpi: readonly MovimentacaoEpi[];
  movsFerramenta: readonly MovimentacaoEpi[];
  /** Saldo, mínimo e alerta como a tela de Estoque calcula (inclui tamanhos); sem isto vale o saldo e o mínimo gravados no item. */
  estado?: (modulo: "epi" | "uniforme", item: ItemEstoque) => EstadoDoEstoque;
};

const ORDEM = { alta: 0, media: 1, baixa: 2 } as const;
const dataBr = (d: string) => d.slice(0, 10).split("-").reverse().join("/");

function porEmpregado(movs: readonly MovimentacaoEpi[]): Map<string, MovimentacaoEpi[]> {
  const mapa = new Map<string, MovimentacaoEpi[]>();
  for (const m of movs) {
    if (!m.empregado_id) continue;
    const lista = mapa.get(m.empregado_id);
    if (lista) lista.push(m);
    else mapa.set(m.empregado_id, [m]);
  }
  return mapa;
}

export function pendenciasDeHoje(e: EntradaAtencao): GrupoPendencia[] {
  const nomes = new Map(e.empregados.map((x) => [x.id, x]));
  const movsEpi = porEmpregado(e.movsEpi);
  const movsFer = porEmpregado(e.movsFerramenta);

  // 1) EPI em posse com CA ou validade vencida: o empregado precisa trocar.
  const vencidos: ItemPendencia[] = [];
  for (const [id, movs] of movsEpi) {
    const emp = nomes.get(id);
    if (!emp || emp.ativo === false || emp.data_demissao) continue;
    const r = resumoEmpregado(movs, e.epis, id, e.hoje);
    const lista = r.emPosse.filter((p) => p.vencido);
    if (lista.length === 0) continue;
    vencidos.push({
      chave: `venc-${id}`, texto: emp.nome, detalhe: lista.map((p) => p.nome).join(", "),
      acao: { rotulo: "Agendar troca", url: "/epi", search: { aba: "entrega", ...(emp.empresa_id ? { empresa: emp.empresa_id } : {}), empregado: id } },
    });
  }

  // 2) Ferramentas ainda com empregado desligado: devolução em atraso.
  const atrasadas: ItemPendencia[] = [];
  for (const [id, movs] of movsFer) {
    const emp = nomes.get(id);
    if (!emp || !(emp.ativo === false || emp.data_demissao)) continue;
    const r = resumoEmpregado(movs, e.ferramentas, id, e.hoje);
    if (r.emPosse.length === 0) continue;
    atrasadas.push({
      chave: `dev-${id}`, texto: emp.nome, detalhe: `${r.emPosse.map((p) => `${p.nome} (${p.quantidade})`).join(", ")}${emp.data_demissao ? ` · desligado em ${dataBr(emp.data_demissao)}` : ""}`,
      acao: { rotulo: "Registrar devolução", url: "/ferramentas", search: { aba: "entrega" } },
    });
  }

  // 3) Estoque no mínimo ou abaixo (EPI e uniforme).
  const padrao = (i: ItemEstoque): EstadoDoEstoque => ({ saldo: i.estoque_atual ?? 0, minimo: i.estoque_minimo ?? 0, alerta: (i.estoque_minimo ?? 0) > 0 && (i.estoque_atual ?? 0) <= (i.estoque_minimo ?? 0) });
  const abaixo = (itens: readonly ItemEstoque[], modulo: "epi" | "uniforme", url: string, area: string): ItemPendencia[] =>
    itens.filter((i) => i.status !== "Inativo").flatMap((i) => {
      const s = e.estado ? e.estado(modulo, i) : padrao(i);
      return s.alerta ? [{ chave: `min-${area}-${i.id}`, texto: i.nome, detalhe: `${area}: saldo ${s.saldo} para mínimo ${s.minimo}`, acao: { rotulo: "Repor estoque", url, search: { aba: "compras" } } }] : [];
    });
  const minimo = [...abaixo(e.epis, "epi", "/epi", "EPI"), ...abaixo(e.uniformes, "uniforme", "/uniformes", "Uniforme")];

  // 4) CA que vence nos próximos 30 dias (ainda válido): dá tempo de comprar o substituto.
  const limite = somarDias(e.hoje, 30);
  const caVencendo: ItemPendencia[] = e.epis
    .filter((i) => i.status !== "Inativo" && i.ca_validade && i.ca_validade.slice(0, 10) >= e.hoje && i.ca_validade.slice(0, 10) <= limite)
    .map((i) => ({ chave: `ca-${i.id}`, texto: i.nome, detalhe: `CA vence em ${dataBr(i.ca_validade as string)}`, acao: { rotulo: "Ver no estoque", url: "/epi", search: { aba: "estoque" } } }));

  const grupos: GrupoPendencia[] = [
    { id: "epi-vencido", titulo: "EPIs vencidos com empregados", prioridade: "alta", vazio: "Nenhum EPI vencido em posse.", itens: vencidos },
    { id: "devolucao-atrasada", titulo: "Devoluções atrasadas (empregado desligado)", prioridade: "alta", vazio: "Nenhuma ferramenta pendente de desligados.", itens: atrasadas },
    { id: "estoque-minimo", titulo: "Estoque no mínimo ou abaixo", prioridade: "media", vazio: "Nenhum item abaixo do mínimo.", itens: minimo },
    { id: "ca-vencendo", titulo: "CAs que vencem em 30 dias", prioridade: "baixa", vazio: "Nenhum CA perto de vencer.", itens: caVencendo },
  ];
  return grupos.sort((a, b) => ORDEM[a.prioridade] - ORDEM[b.prioridade]);
}

export const totalPendencias = (grupos: readonly GrupoPendencia[]): number => grupos.reduce((t, g) => t + g.itens.length, 0);
