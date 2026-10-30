// Visão do estoque de EPI (decisão 329): uma linha por EPI, tamanho e compra de origem, separada em novos e usados. O estoque não guarda de qual compra vem cada unidade; vale a regra
// de que as unidades mais antigas saem primeiro, então o que está disponível como novo vem das compras mais recentes. O que é usado vem das devoluções (que mantêm a compra original).
export type CompraDoEstoque = {
  id: string;
  item_id: string | null;
  tamanho_id?: string | null;
  data_compra: string;
  nota_fiscal?: string | null;
  fornecedor?: string | null;
  ca?: string | null;
  quantidade: number;
  created_at?: string | null;
};
export type DevolucaoUsada = {
  item_id: string | null;
  tamanho_id?: string | null;
  quantidade: number;
  condicao?: string | null;
  tipo_movimentacao: string;
  compra_origem_id?: string | null;
  data_compra_origem?: string | null;
  nota_fiscal_origem?: string | null;
  fornecedor_origem?: string | null;
  ca_origem?: string | null;
};
export type ItemDoEstoque = {
  id: string;
  codigo_sku: string;
  nome: string;
  empresa_id: string | null;
  ca?: string | null;
};

export type LinhaEstoqueEpi = {
  chave: string;
  condicao: "novo" | "usado";
  itemId: string;
  codigo: string;
  descricao: string;
  empresaId: string | null;
  dataCompra: string | null;
  nf: string | null;
  fornecedor: string | null;
  ca: string | null;
  tamanhoId: string | null; // null = sem tamanho
  minimo: number;
  disponivel: number;
  alerta: boolean;
  mediaMensal: number;
};

export type EntradaEstoqueEpi = {
  itens: ItemDoEstoque[];
  compras: CompraDoEstoque[];
  devolucoes: DevolucaoUsada[];
  // Saldo disponível (novos e usados) e estoque mínimo por tamanho de cada EPI; a chave é o id do tamanho ou "sem-tamanho".
  saldosDe: (itemId: string) => Record<string, number>;
  minimosDe: (itemId: string) => Record<string, number>;
  mediaMensalDe: (itemId: string) => number;
  semTamanho?: string;
};

const SEM = "sem-tamanho";
const numero = (v: unknown) => Number(v) || 0;

export function linhasDeEstoqueEpi(e: EntradaEstoqueEpi): LinhaEstoqueEpi[] {
  const sem = e.semTamanho ?? SEM;
  const linhas: LinhaEstoqueEpi[] = [];
  // Compras e devoluções usadas agrupadas uma vez por EPI e tamanho (a devolução grava "sem-tamanho" de forma explícita: vale como sem tamanho, o mesmo que null).
  const chaveDe = (itemId: string, tamanho: string | null | undefined) =>
    `${itemId}|${tamanho === sem ? "" : (tamanho ?? "")}`;
  const agrupar = <T,>(mapa: Map<string, T[]>, chave: string, valor: T) => {
    const lista = mapa.get(chave);
    if (lista) lista.push(valor);
    else mapa.set(chave, [valor]);
  };
  const comprasPorChave = new Map<string, CompraDoEstoque[]>();
  for (const c of e.compras) if (c.item_id) agrupar(comprasPorChave, chaveDe(c.item_id, c.tamanho_id), c);
  const usadasPorChave = new Map<string, DevolucaoUsada[]>();
  for (const d of e.devolucoes)
    if (d.item_id && d.tipo_movimentacao === "Devolucao" && d.condicao === "usado")
      agrupar(usadasPorChave, chaveDe(d.item_id, d.tamanho_id), d);
  for (const item of e.itens) {
    const saldos = e.saldosDe(item.id);
    const minimos = e.minimosDe(item.id);
    const media = e.mediaMensalDe(item.id);
    // O mínimo geral do EPI com tamanhos (chave "sem-tamanho" sem saldo nela) não cria uma linha fantasma sem tamanho.
    const chaves = [
      ...new Set([
        ...Object.keys(saldos),
        ...Object.keys(minimos).filter(
          (k) =>
            numero(minimos[k]) > 0 &&
            (k !== sem || k in saldos || Object.keys(saldos).length === 0),
        ),
      ]),
    ];
    for (const chave of chaves.length > 0 ? chaves : [sem]) {
      const tamanhoId = chave === sem ? null : chave;
      const saldo = Math.max(0, numero(saldos[chave]));
      const minimo = numero(minimos[chave]);
      const alerta = saldo <= minimo && (minimo > 0 || saldo === 0);
      const comum = {
        itemId: item.id,
        codigo: item.codigo_sku,
        descricao: item.nome,
        empresaId: item.empresa_id,
        tamanhoId,
        minimo,
        alerta,
        mediaMensal: media,
      };

      // Usados: as devoluções do EPI no tamanho, por compra de origem, sem passar do saldo.
      const usadas = usadasPorChave.get(chaveDe(item.id, tamanhoId)) ?? [];
      const porOrigem = new Map<string, DevolucaoUsada & { total: number }>();
      for (const d of usadas) {
        const k = d.compra_origem_id ?? "sem-origem";
        const atual = porOrigem.get(k);
        if (atual) atual.total += numero(d.quantidade);
        else porOrigem.set(k, { ...d, total: numero(d.quantidade) });
      }
      let restanteUsado = saldo;
      for (const [k, d] of [...porOrigem.entries()].sort((a, b) =>
        String(b[1].data_compra_origem ?? "").localeCompare(String(a[1].data_compra_origem ?? "")),
      )) {
        const q = Math.min(d.total, restanteUsado);
        if (q <= 0) continue;
        restanteUsado -= q;
        linhas.push({
          ...comum,
          chave: `${item.id}|${chave}|usado|${k}`,
          condicao: "usado",
          dataCompra: d.data_compra_origem ?? null,
          nf: d.nota_fiscal_origem ?? null,
          fornecedor: d.fornecedor_origem ?? null,
          ca: d.ca_origem ?? item.ca ?? null,
          disponivel: q,
        });
      }
      const usadoNoTamanho = saldo - restanteUsado;

      // Novos: o saldo menos o usado, atribuído às compras da mais recente para a mais antiga.
      let restanteNovo = saldo - usadoNoTamanho;
      let temNovo = false;
      const lotes = [...(comprasPorChave.get(chaveDe(item.id, tamanhoId)) ?? [])].sort(
        (a, b) =>
          b.data_compra.localeCompare(a.data_compra) ||
          String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")),
      );
      for (const c of lotes) {
        const q = Math.min(numero(c.quantidade), restanteNovo);
        if (q <= 0) continue;
        restanteNovo -= q;
        temNovo = true;
        linhas.push({
          ...comum,
          chave: `${item.id}|${chave}|novo|${c.id}`,
          condicao: "novo",
          dataCompra: c.data_compra,
          nf: c.nota_fiscal ?? null,
          fornecedor: c.fornecedor ?? null,
          ca: c.ca || item.ca || null,
          disponivel: q,
        });
      }
      // O que sobra (estoque inicial ou sem compra registrada) e o item zerado aparecem sem dados de compra, para o alerta não sumir.
      if (restanteNovo > 0 || (restanteNovo === 0 && !temNovo)) {
        linhas.push({
          ...comum,
          chave: `${item.id}|${chave}|novo|sem-compra`,
          condicao: "novo",
          dataCompra: null,
          nf: null,
          fornecedor: null,
          ca: item.ca ?? null,
          disponivel: Math.max(0, restanteNovo),
        });
      }
    }
  }
  return linhas;
}

export type FiltroEstoqueEpi = {
  empresaId?: string;
  palavra?: string;
  dataInicio?: string;
  dataFim?: string;
  fornecedor?: string;
  ca?: string;
  nf?: string;
};

const norm = (t: string | null | undefined) =>
  (t ?? "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[̀-ͯ]/g, "");

export function filtrarEstoqueEpi(
  linhas: LinhaEstoqueEpi[],
  f: FiltroEstoqueEpi,
  nomeDoTamanho: (id: string | null) => string,
): LinhaEstoqueEpi[] {
  const palavra = norm(f.palavra).trim();
  const ca = norm(f.ca).trim();
  const nf = norm(f.nf).trim();
  return linhas.filter((l) => {
    if (f.empresaId && l.empresaId !== f.empresaId) return false;
    if (f.fornecedor && l.fornecedor !== f.fornecedor) return false;
    if (ca && !norm(l.ca).includes(ca)) return false;
    if (nf && !norm(l.nf).includes(nf)) return false;
    if (
      (f.dataInicio || f.dataFim) &&
      (!l.dataCompra ||
        (f.dataInicio && l.dataCompra < f.dataInicio) ||
        (f.dataFim && l.dataCompra > f.dataFim))
    )
      return false;
    if (
      palavra &&
      !norm(
        [l.codigo, l.descricao, l.fornecedor, l.nf, l.ca, nomeDoTamanho(l.tamanhoId)].join(" "),
      ).includes(palavra)
    )
      return false;
    return true;
  });
}
