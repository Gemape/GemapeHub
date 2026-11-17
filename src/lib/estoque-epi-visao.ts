// Visão do estoque de EPI (decisões 329 e 408): uma linha por EPI e tamanho, separada em novos e usados. O produto existe uma vez em cada estoque (empresa) e as compras de todos os
// fornecedores se somam num estoque só; a linha mostra o total e, como informação, o que veio de cada compra (fornecedores, notas, CAs e a data da última). O estoque não guarda de
// qual compra vem cada unidade: o que é usado vem das devoluções (que mantêm a compra original) e o resto é novo.
// Condição em que o Estoque abre quando vem da busca global: a que o item tem (só uma) ou "todos" quando tem as duas.
export const condicaoInicial = (haNovos: boolean, haUsados: boolean): "novo" | "usado" | "todos" => (haNovos && haUsados ? "todos" : haUsados ? "usado" : "novo");

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
  // Tudo o que alimentou o estoque da linha: as compras (ou, nos usados, as compras de origem das devoluções), sem repetir.
  fornecedores: string[];
  notas: string[];
  cas: string[];
  datas: string[];
  tamanhoId: string | null; // null = sem tamanho
  minimo: number;
  disponivel: number;
  // Saldo total do EPI no tamanho (novos + usados): o alerta olha este saldo, não o `disponivel` da linha (que é só a parte novo ou usado).
  saldo: number;
  // Quantos do saldo são novos e quantos são usados, no mesmo item e tamanho (as linhas de novos e de usados mostram os dois números; novos + usados = saldo).
  novos: number;
  usados: number;
  alerta: boolean;
  mediaMensal: number;
};

// Nível do alerta de estoque mínimo (decisões 419 e 420): abaixo do mínimo ou zerado é "abaixo" (vermelho); saldo igual ao mínimo é "minimo" (amarelo, "Estoque mínimo");
// saldo a 1 unidade acima do mínimo é "proximo" (aviso "Próximo do mínimo"). Sem mínimo definido, só o saldo zerado alerta.
export function nivelDoAlerta(saldo: number, minimo: number): "abaixo" | "minimo" | "proximo" | null {
  if (saldo < minimo || (saldo === 0 && minimo === 0)) return "abaixo";
  if (minimo <= 0) return null;
  return saldo === minimo ? "minimo" : saldo === minimo + 1 ? "proximo" : null;
}

export const TEXTO_DO_NIVEL_ALERTA = { abaixo: "Abaixo do mínimo", minimo: "Estoque mínimo", proximo: "Próximo do mínimo" } as const;
// Cores do nível na coluna Alerta, as mesmas em todas as telas de estoque (decisão 421).
export const CLASSE_DO_NIVEL = {
  abaixo: "font-bold text-destructive",
  minimo: "font-bold text-amber-600 dark:text-amber-400",
  proximo: "font-semibold text-yellow-600 dark:text-yellow-300",
  nenhum: "",
} as const;

export const textoDoAlerta = (l: { saldo: number; minimo: number }): string => {
  const nivel = nivelDoAlerta(l.saldo, l.minimo);
  return nivel ? TEXTO_DO_NIVEL_ALERTA[nivel] : "";
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

// caItem: CA do cadastro do item; só vale quando nenhuma compra (ou devolução de origem) trouxe CA.
type LinhaDeLote = Omit<LinhaEstoqueEpi, "novos" | "usados" | "fornecedores" | "notas" | "cas" | "datas"> & { caItem: string | null };
const distintos = (valores: (string | null)[]) => [...new Set(valores.filter((v): v is string => !!v))];
const juntar = (l: string[]) => (l.length ? l.join(", ") : null);

// Junta as linhas de lote do mesmo EPI, tamanho e condição numa só (uma linha por código + empresa + tamanho; fornecedores, notas e CAs diferentes não separam e aparecem listados): a quantidade soma e os dados de compra viram listas.
function somarLotes(lotes: LinhaDeLote[]): Omit<LinhaEstoqueEpi, "novos" | "usados">[] {
  const grupos = new Map<string, LinhaDeLote[]>();
  for (const l of lotes) {
    const k = `${l.itemId}|${l.tamanhoId ?? ""}|${l.condicao}`;
    const g = grupos.get(k);
    if (g) g.push(l);
    else grupos.set(k, [l]);
  }
  return [...grupos.entries()].map(([k, g]) => {
    const fornecedores = distintos(g.map((l) => l.fornecedor));
    const notas = distintos(g.map((l) => l.nf));
    // O CA do cadastro do item só vale quando nenhuma compra trouxe CA (não é CA de compra).
    const cas = distintos(g.map((l) => l.ca));
    if (cas.length === 0) cas.push(...distintos(g.map((l) => l.caItem)));
    const { caItem: _caItem, ...primeira } = g[0]!;
    const datas = distintos(g.map((l) => l.dataCompra)).sort();
    return {
      ...primeira,
      chave: k,
      disponivel: g.reduce((t, l) => t + l.disponivel, 0),
      dataCompra: datas.length ? datas[datas.length - 1]! : null,
      fornecedor: juntar(fornecedores),
      nf: juntar(notas),
      ca: juntar(cas),
      fornecedores,
      notas,
      cas,
      datas,
    };
  });
}

export function linhasDeEstoqueEpi(e: EntradaEstoqueEpi): LinhaEstoqueEpi[] {
  const sem = e.semTamanho ?? SEM;
  const linhas: LinhaDeLote[] = [];
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
      // Conta como alerta (decisão 417) o nível "abaixo" ou "minimo"; "proximo" é só aviso de leitura.
      const nivel = nivelDoAlerta(saldo, minimo);
      const alerta = nivel === "abaixo" || nivel === "minimo";
      const comum = {
        itemId: item.id,
        codigo: item.codigo_sku,
        descricao: item.nome,
        empresaId: item.empresa_id,
        tamanhoId,
        minimo,
        saldo,
        alerta,
        mediaMensal: media,
        caItem: item.ca ?? null,
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
          ca: d.ca_origem ?? null,
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
          ca: c.ca || null,
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
          ca: null,
          disponivel: Math.max(0, restanteNovo),
        });
      }
    }
  }
  const somadas = somarLotes(linhas);
  const porGrupo = new Map<string, { novos: number; usados: number }>();
  for (const l of somadas) {
    const k = `${l.itemId}|${l.tamanhoId ?? ""}`;
    const g = porGrupo.get(k) ?? { novos: 0, usados: 0 };
    if (l.condicao === "usado") g.usados += l.disponivel;
    else g.novos += l.disponivel;
    porGrupo.set(k, g);
  }
  return somadas.map((l) => ({ ...l, ...porGrupo.get(`${l.itemId}|${l.tamanhoId ?? ""}`)! }));
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
    if (f.fornecedor && !l.fornecedores.includes(f.fornecedor)) return false;
    if (ca && !l.cas.some((c) => norm(c).includes(ca))) return false;
    if (nf && !l.notas.some((n) => norm(n).includes(nf))) return false;
    // Basta uma das compras que formam o estoque cair no período.
    if (
      (f.dataInicio || f.dataFim) &&
      !l.datas.some((d) => (!f.dataInicio || d >= f.dataInicio) && (!f.dataFim || d <= f.dataFim))
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
