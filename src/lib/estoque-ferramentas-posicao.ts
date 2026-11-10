// Posição de cada ferramenta no estoque e nas caixas (decisão 379), no mesmo controle de entradas e saídas do EPI e do uniforme:
//  - entrada (compra, NF-e ou entrada avulsa) soma no saldo; baixa definitiva (perda, quebra, desgaste...) o reduz, com ou sem caixa;
//  - entrega a empregado e devolução não mexem no saldo, porque a ferramenta continua sendo da empresa: só mudam onde ela está;
//  - o saldo se reparte em guardada na caixa, com empregado e sem caixa, e a soma tem de bater com o saldo.
import { controleDaFerramenta } from "./controle-caixa.ts";
import { ehBaixa } from "./historico-movimentacoes.ts";

export type MovimentoDeFerramenta = {
  modulo: string;
  tipo_movimentacao: string;
  item_id: string | null;
  empregado_id: string | null;
  motivo_baixa: string | null;
  quantidade: number | null;
  caixa_id?: string | null | undefined;
};
export type ItemDeCaixa = { caixa_id: string; ferramenta_id: string; quantidade: number };

export type PosicaoDaFerramenta = {
  ferramentaId: string;
  caixaId: string | null;
  entradas: number;
  baixas: number;
  saldo: number; // o que o estoque da ferramenta guarda hoje
  saldoEsperado: number; // entradas − baixas, pelas movimentações
  naCaixa: number; // quantidade cadastrada na caixa, descontadas as baixas feitas por ela
  guardada: number;
  comEmpregado: number;
  semCaixa: number; // saldo − o que a caixa tem (negativo = a caixa tem mais do que o estoque)
  divergencias: string[];
};

export function posicaoDasFerramentas(
  ferramentas: { id: string; estoque_atual?: number | null }[],
  movimentos: readonly MovimentoDeFerramenta[],
  itensDeCaixa: readonly ItemDeCaixa[],
): PosicaoDaFerramenta[] {
  const porFerramenta = new Map<string, MovimentoDeFerramenta[]>();
  for (const m of movimentos) {
    if (m.modulo !== "ferramenta" || !m.item_id) continue;
    const lista = porFerramenta.get(m.item_id);
    if (lista) lista.push(m);
    else porFerramenta.set(m.item_id, [m]);
  }
  return ferramentas.map((f) => {
    const doItem = porFerramenta.get(f.id) ?? [];
    const soma = (filtro: (m: MovimentoDeFerramenta) => boolean) => doItem.filter(filtro).reduce((t, m) => t + (Number(m.quantidade) || 0), 0);
    const entradas = soma((m) => m.tipo_movimentacao === "Entrada");
    const baixas = soma((m) => m.tipo_movimentacao === "Saida" && ehBaixa(m));
    const item = itensDeCaixa.find((i) => i.ferramenta_id === f.id) ?? null;
    const baixasDaCaixa = item ? soma((m) => m.tipo_movimentacao === "Saida" && ehBaixa(m) && m.caixa_id === item.caixa_id) : 0;
    const saldo = Number(f.estoque_atual) || 0;
    const saldoEsperado = entradas - baixas;
    const naCaixa = Math.max((item ? Number(item.quantidade) || 0 : 0) - baixasDaCaixa, 0);
    const comEmpregado = controleDaFerramenta(doItem.map((m) => ({ ...m, quantidade: Number(m.quantidade) || 0 })), f.id).comEmpregado;
    const guardada = Math.max(naCaixa - comEmpregado, 0);
    const semCaixa = saldo - naCaixa;
    const divergencias: string[] = [];
    if (saldo !== saldoEsperado) divergencias.push(`O saldo (${saldo}) não bate com as entradas menos as baixas (${saldoEsperado}).`);
    if (semCaixa < 0) divergencias.push(`A caixa tem ${-semCaixa} a mais do que o estoque.`);
    return { ferramentaId: f.id, caixaId: item?.caixa_id ?? null, entradas, baixas, saldo, saldoEsperado, naCaixa, guardada, comEmpregado, semCaixa, divergencias };
  });
}

// O que a caixa pode guardar de uma ferramenta: o saldo do estoque mais o que já saiu da caixa por baixa (essa parte continua na quantidade cadastrada, mas não existe mais).
export const limiteDaCaixa = (saldo: number, baixasDaCaixa: number): number => Math.max((Number(saldo) || 0) + baixasDaCaixa, 0);

/** A caixa não guarda mais ferramentas do que o estoque tem: confere a lista antes de gravar; devolve a mensagem de erro ou null. */
export function ferramentasAcimaDoEstoque(
  itens: { ferramenta_id: string; quantidade: number }[],
  limite: (ferramentaId: string) => number,
  nomeFerramenta: (ferramentaId: string) => string,
): string | null {
  for (const i of itens) {
    const maximo = limite(i.ferramenta_id);
    if (i.quantidade > maximo)
      return `${nomeFerramenta(i.ferramenta_id)}: o estoque tem ${maximo}, e a caixa não pode guardar mais do que isso. Registre a entrada (compra ou ajuste) antes de aumentar a quantidade.`;
  }
  return null;
}

export type FerramentaAbaixoDoMinimo = { id: string; codigo: string; nome: string; empresaId: string | null; saldo: number; minimo: number; guardada: number; comEmpregado: number; situacao: "Zerado" | "Abaixo do mínimo" | "No mínimo" };

/** Ferramentas ativas no mínimo ou abaixo, do mais crítico ao menos: zeradas primeiro, depois as mais distantes do mínimo. Sem mínimo, só a ferramenta zerada alerta (mesma regra do EPI). */
export function ferramentasAbaixoDoMinimo(
  ferramentas: { id: string; codigo_sku?: string | null; nome: string; empresa_id?: string | null; estoque_minimo?: number | null; status?: string | null }[],
  posicoes: ReadonlyMap<string, Pick<PosicaoDaFerramenta, "saldo" | "guardada" | "comEmpregado">>,
): FerramentaAbaixoDoMinimo[] {
  const lista: FerramentaAbaixoDoMinimo[] = [];
  for (const f of ferramentas) {
    if (f.status === "Inativo") continue;
    const p = posicoes.get(f.id);
    const saldo = p?.saldo ?? 0;
    const minimo = Number(f.estoque_minimo) || 0;
    if (saldo > minimo) continue;
    lista.push({
      id: f.id, codigo: f.codigo_sku ?? "", nome: f.nome, empresaId: f.empresa_id ?? null, saldo, minimo, guardada: p?.guardada ?? 0, comEmpregado: p?.comEmpregado ?? 0,
      situacao: saldo === 0 ? "Zerado" : saldo < minimo ? "Abaixo do mínimo" : "No mínimo",
    });
  }
  const falta = (l: FerramentaAbaixoDoMinimo) => (l.minimo > 0 ? l.saldo / l.minimo : 0);
  return lista.sort((a, b) => falta(a) - falta(b) || a.nome.localeCompare(b.nome, "pt-BR"));
}
