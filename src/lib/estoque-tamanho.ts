// Tamanho e unidade de EPI e Uniforme vindos de Cadastros > Gerais, com estoque por tamanho
// (decisão 23). O produto usa os tamanhos e as unidades que Associar Tamanho e Medida
// autoriza para a subcategoria dele. Cada tamanho tem saldo e mínimo próprios; o saldo
// antigo, de antes do controle por tamanho, fica em "Sem tamanho" e só pode sair até zerar.
import {
  autorizados,
  estaAtivo,
  mesmoNome,
  type Opcao,
  type ParametrosBase,
  type TipoOpcao,
} from "./parametros-base.ts";
import { resolverSubcategoria } from "./subcategoria-referencia.ts";

export type ModuloTamanho = "epi" | "uniforme";

export const CATEGORIA_DO_MODULO: Record<ModuloTamanho, string> = {
  epi: "cat-epi",
  uniforme: "cat-uniformes",
};

export const controlaModulo = (modulo: string): modulo is ModuloTamanho =>
  modulo in CATEGORIA_DO_MODULO;

// Chave do saldo antigo, sem tamanho, e valor da opção "Sem tamanho" nas listas.
export const SEM_TAMANHO = "sem-tamanho";
export const ROTULO_SEM_TAMANHO = "Sem tamanho";

export type Saldos = Record<string, number>;

export type ProdutoTamanho = {
  id?: string;
  nome?: string | null;
  categoria?: string | null;
  subcategoria_id?: string | null;
  tamanho?: string | null;
  estoque_atual?: number | null;
  estoque_minimo?: number | null;
  saldos_tamanho?: Saldos | null;
  minimos_tamanho?: Saldos | null;
  unidade_id?: string | null;
  unidade_medida?: string | null;
};

export type MovimentoTamanho = {
  tipo_movimentacao: string;
  quantidade: number;
  tamanho_id?: string | null;
};

const numero = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

function opcoesAutorizadas(
  p: ParametrosBase,
  modulo: ModuloTamanho,
  produto: ProdutoTamanho,
  tipo: TipoOpcao,
): Opcao[] {
  const sub = resolverSubcategoria(p, CATEGORIA_DO_MODULO[modulo], produto);
  return sub?.id ? autorizados(p, sub.id, tipo) : [];
}

/** Tamanhos autorizados para a subcategoria do produto, na ordem de Gerais (inclui os desativados). */
export const tamanhosAutorizadosDoProduto = (
  p: ParametrosBase,
  modulo: ModuloTamanho,
  produto: ProdutoTamanho,
) => opcoesAutorizadas(p, modulo, produto, "tamanhos");

/**
 * Tamanhos e numerações associados à subcategoria do produto em Associar Tamanho e Medida,
 * para o cadastro mostrar: todos, na ordem de Gerais, com o desativado marcado.
 */
export function tamanhosAssociadosParaCadastro(
  p: ParametrosBase,
  modulo: ModuloTamanho,
  produto: ProdutoTamanho,
): { id: string; rotulo: string }[] {
  return tamanhosAutorizadosDoProduto(p, modulo, produto).map((t) => ({
    id: t.id,
    rotulo: estaAtivo(p, t.id) ? t.nome : `${t.nome} (desativado)`,
  }));
}

/** Unidades autorizadas para a subcategoria do produto (inclui as desativadas). */
export const unidadesAutorizadasDoProduto = (
  p: ParametrosBase,
  modulo: ModuloTamanho,
  produto: ProdutoTamanho,
) => opcoesAutorizadas(p, modulo, produto, "unidades");

const saldosGravados = (produto: ProdutoTamanho): Saldos | null =>
  produto.saldos_tamanho && typeof produto.saldos_tamanho === "object"
    ? Object.fromEntries(
        Object.entries(produto.saldos_tamanho).map(([chave, valor]) => [chave, numero(valor)]),
      )
    : null;

/**
 * Controla tamanho: a subcategoria tem tamanho autorizado, ou o produto ainda tem saldo
 * positivo em algum tamanho (que continua podendo sair mesmo se for desautorizado).
 * Tamanho já zerado não prende o produto quando a subcategoria perde os tamanhos.
 */
export function controlaTamanho(
  p: ParametrosBase,
  modulo: ModuloTamanho,
  produto: ProdutoTamanho,
): boolean {
  if (tamanhosAutorizadosDoProduto(p, modulo, produto).length > 0) return true;
  return Object.entries(saldosGravados(produto) ?? {}).some(
    ([chave, saldo]) => chave !== SEM_TAMANHO && saldo > 0,
  );
}

/**
 * Saldo de cada tamanho. Produto ainda sem saldo por tamanho: o tamanho digitado antigo que
 * casa com um tamanho autorizado leva o saldo inteiro; senão, o saldo fica em "Sem tamanho".
 */
export function saldosPorTamanho(
  p: ParametrosBase,
  modulo: ModuloTamanho,
  produto: ProdutoTamanho,
): Saldos {
  const gravados = saldosGravados(produto);
  if (gravados) return gravados;
  const estoque = numero(produto.estoque_atual);
  const digitado = typeof produto.tamanho === "string" ? produto.tamanho.trim() : "";
  const casado = digitado
    ? tamanhosAutorizadosDoProduto(p, modulo, produto).find((t) => mesmoNome(t.nome, digitado))
    : undefined;
  return { [casado?.id ?? SEM_TAMANHO]: estoque };
}

export function nomeTamanho(p: ParametrosBase, chave: string | null | undefined): string {
  if (!chave || chave === SEM_TAMANHO) return ROTULO_SEM_TAMANHO;
  return p.tamanhos.find((t) => t.id === chave)?.nome ?? "tamanho excluído";
}

const rotuloComEstado = (p: ParametrosBase, chave: string) =>
  chave !== SEM_TAMANHO && !estaAtivo(p, chave)
    ? `${nomeTamanho(p, chave)} (desativado)`
    : nomeTamanho(p, chave);

/** Ordem de exibição: a sequência de Gerais, com "Sem tamanho" no fim. */
function ordenarChaves(p: ParametrosBase, chaves: string[]): string[] {
  const posicao = (chave: string) => {
    const i = p.tamanhos.findIndex((t) => t.id === chave);
    return chave === SEM_TAMANHO ? Number.MAX_SAFE_INTEGER : i < 0 ? p.tamanhos.length : i;
  };
  return [...chaves].sort((a, b) => posicao(a) - posicao(b));
}

const nomeProduto = (produto: ProdutoTamanho) => produto.nome?.trim() || "o produto";

/**
 * Aplica uma movimentação nos saldos por tamanho (mesma regra do gatilho do demo).
 * Entrada soma e exige tamanho autorizado e ativo. Devolução soma no tamanho em que o item
 * saiu: qualquer tamanho de Gerais (mesmo desativado ou desautorizado depois) ou "Sem tamanho",
 * informado explicitamente. Saída subtrai do tamanho escolhido (ou do "Sem tamanho");
 * vistoria e transferência não mexem. Saldo negativo é recusado.
 */
export function movimentarTamanho(
  p: ParametrosBase,
  modulo: ModuloTamanho,
  produto: ProdutoTamanho,
  saldos: Saldos,
  mov: MovimentoTamanho,
): Saldos {
  const quantidade = numero(mov.quantidade);
  const tipo = mov.tipo_movimentacao;
  const soma = tipo === "Entrada" || tipo === "Devolucao";
  if (!soma && tipo !== "Saida") return { ...saldos };
  const chave = mov.tamanho_id || SEM_TAMANHO;
  const autorizadosIds = new Set(tamanhosAutorizadosDoProduto(p, modulo, produto).map((t) => t.id));
  if (tipo === "Devolucao") {
    if (!mov.tamanho_id) throw new Error(`Informe o tamanho de ${nomeProduto(produto)}.`);
    if (chave !== SEM_TAMANHO && !p.tamanhos.some((t) => t.id === chave)) {
      throw new Error(
        `O tamanho ${nomeTamanho(p, chave)} não está autorizado para ${nomeProduto(produto)}.`,
      );
    }
  } else if (soma) {
    if (chave === SEM_TAMANHO) throw new Error(`Informe o tamanho de ${nomeProduto(produto)}.`);
    if (!autorizadosIds.has(chave)) {
      throw new Error(
        `O tamanho ${nomeTamanho(p, chave)} não está autorizado para ${nomeProduto(produto)}.`,
      );
    }
    if (!estaAtivo(p, chave)) {
      throw new Error(
        `O tamanho ${nomeTamanho(p, chave)} está desativado em Cadastros > Gerais e não recebe entrada.`,
      );
    }
  } else if (chave !== SEM_TAMANHO && !autorizadosIds.has(chave) && !(chave in saldos)) {
    throw new Error(
      `O tamanho ${nomeTamanho(p, chave)} não está autorizado para ${nomeProduto(produto)}.`,
    );
  }
  const saldo = numero(saldos[chave]) + (soma ? quantidade : -quantidade);
  if (saldo < 0) {
    throw new Error(
      `Estoque insuficiente de ${nomeProduto(produto)} no tamanho ${nomeTamanho(p, chave)} (disponível ${numero(saldos[chave])}).`,
    );
  }
  const novos = { ...saldos, [chave]: saldo };
  // O saldo antigo "Sem tamanho" zerado não volta mais: sai da lista.
  if (novos[SEM_TAMANHO] === 0) delete novos[SEM_TAMANHO];
  return novos;
}

export const somaSaldos = (saldos: Saldos) =>
  Object.values(saldos).reduce((total, valor) => total + numero(valor), 0);

/** Tamanhos para entrada (compra): os autorizados e ativos. */
export function opcoesTamanhoEntrada(
  p: ParametrosBase,
  modulo: ModuloTamanho,
  produto: ProdutoTamanho,
): { valor: string; rotulo: string }[] {
  return tamanhosAutorizadosDoProduto(p, modulo, produto)
    .filter((t) => estaAtivo(p, t.id))
    .map((t) => ({ valor: t.id, rotulo: t.nome }));
}

/**
 * Tamanhos para devolução: o item volta no tamanho em que saiu. Mostra os autorizados (mesmo
 * desativados), os que o produto já tem gravados e "Sem tamanho", na ordem de Gerais.
 */
export function opcoesTamanhoDevolucao(
  p: ParametrosBase,
  modulo: ModuloTamanho,
  produto: ProdutoTamanho,
): { valor: string; rotulo: string }[] {
  const chaves = new Set([
    ...tamanhosAutorizadosDoProduto(p, modulo, produto).map((t) => t.id),
    ...Object.keys(saldosPorTamanho(p, modulo, produto)).filter((chave) =>
      p.tamanhos.some((t) => t.id === chave),
    ),
    SEM_TAMANHO,
  ]);
  return ordenarChaves(p, [...chaves]).map((chave) => ({
    valor: chave,
    rotulo: rotuloComEstado(p, chave),
  }));
}

/** Tamanhos para saída (entrega, baixa): os que têm saldo, inclusive "Sem tamanho". */
export function opcoesTamanhoSaida(
  p: ParametrosBase,
  modulo: ModuloTamanho,
  produto: ProdutoTamanho,
): { valor: string; rotulo: string; saldo: number }[] {
  const saldos = saldosPorTamanho(p, modulo, produto);
  return ordenarChaves(
    p,
    Object.keys(saldos).filter((chave) => numero(saldos[chave]) > 0),
  ).map((chave) => ({
    valor: chave,
    rotulo: rotuloComEstado(p, chave),
    saldo: numero(saldos[chave]),
  }));
}

/** "40: 2 · 42: 0 · Sem tamanho: 1": tamanhos com saldo ou com mínimo definido. */
export function resumoEstoquePorTamanho(
  p: ParametrosBase,
  modulo: ModuloTamanho,
  produto: ProdutoTamanho,
): string {
  const saldos = saldosPorTamanho(p, modulo, produto);
  const minimos = produto.minimos_tamanho ?? {};
  const chaves = new Set([
    ...Object.keys(saldos).filter((chave) => numero(saldos[chave]) > 0),
    ...Object.keys(minimos).filter((chave) => numero(minimos[chave]) > 0),
  ]);
  return ordenarChaves(p, [...chaves])
    .map((chave) => `${rotuloComEstado(p, chave)}: ${numero(saldos[chave])}`)
    .join(" · ");
}

/** "40: 2 · 42: 1": mínimos definidos, na ordem de Gerais, com o desativado marcado. */
export function resumoMinimosPorTamanho(p: ParametrosBase, produto: ProdutoTamanho): string {
  const minimos = produto.minimos_tamanho ?? {};
  return ordenarChaves(
    p,
    Object.keys(minimos).filter((chave) => numero(minimos[chave]) > 0),
  )
    .map((chave) => `${rotuloComEstado(p, chave)}: ${numero(minimos[chave])}`)
    .join(" · ");
}

/** O alerta do produto é por tamanho: controla tamanho e tem algum mínimo de tamanho. */
export const usaMinimoPorTamanho = (
  p: ParametrosBase,
  modulo: ModuloTamanho,
  produto: ProdutoTamanho,
) =>
  controlaTamanho(p, modulo, produto) &&
  Object.values(produto.minimos_tamanho ?? {}).some((minimo) => numero(minimo) > 0);

export type AlertaTamanho = { chave: string; nome: string; saldo: number; minimo: number };

/** Tamanhos com mínimo definido e saldo igual ou abaixo dele (produto com tamanhos). */
export function alertasPorTamanho(
  p: ParametrosBase,
  modulo: ModuloTamanho,
  produto: ProdutoTamanho,
): AlertaTamanho[] {
  if (!controlaTamanho(p, modulo, produto)) return [];
  const saldos = saldosPorTamanho(p, modulo, produto);
  const minimos = produto.minimos_tamanho ?? {};
  return ordenarChaves(p, Object.keys(minimos))
    .map((chave) => ({
      chave,
      nome: nomeTamanho(p, chave),
      saldo: numero(saldos[chave]),
      minimo: numero(minimos[chave]),
    }))
    .filter((a) => a.minimo > 0 && a.saldo <= a.minimo);
}

type LinhaComTamanho = { item_id: string; quantidade: number; tamanho?: string | null };
type ItemComTamanho = ProdutoTamanho & { id: string; nome: string };

/**
 * Confere as linhas de uma entrada ou saída na tela: produto com tamanhos precisa do tamanho
 * escolhido, e a saída não passa do saldo daquele tamanho (somando as linhas iguais).
 */
export function validarLinhasTamanho(
  linhas: LinhaComTamanho[],
  itens: ItemComTamanho[],
  p: ParametrosBase,
  modulo: ModuloTamanho,
  acao: "entrega" | "baixa" | "saída" | "entrada" | "devolução",
): string | null {
  const pedidas = new Map<string, { item: ItemComTamanho; chave: string; quantidade: number }>();
  const entrada = acao === "entrada" || acao === "devolução";
  const opcoes = (item: ItemComTamanho) =>
    acao === "devolução"
      ? opcoesTamanhoDevolucao(p, modulo, item)
      : acao === "entrada"
        ? opcoesTamanhoEntrada(p, modulo, item)
        : opcoesTamanhoSaida(p, modulo, item);
  for (const linha of linhas) {
    const item = itens.find((i) => i.id === linha.item_id);
    if (!item) continue;
    let chave = SEM_TAMANHO;
    if (controlaTamanho(p, modulo, item)) {
      const escolhido = linha.tamanho ?? "";
      const validos = opcoes(item).map((o) => o.valor);
      if (acao === "entrada" && validos.length === 0) {
        return `${item.nome} não tem tamanho ativo autorizado em Cadastros > Gerais > Associar Tamanho e Medida. Autorize um tamanho para registrar a entrada.`;
      }
      if (!escolhido || !validos.includes(escolhido)) {
        return `Escolha o tamanho de ${item.nome}.`;
      }
      chave = escolhido;
    }
    const id = `${item.id}|${chave}`;
    const atual = pedidas.get(id);
    pedidas.set(id, { item, chave, quantidade: (atual?.quantidade ?? 0) + linha.quantidade });
  }
  if (entrada) return null;
  for (const { item, chave, quantidade } of pedidas.values()) {
    const temTamanho = controlaTamanho(p, modulo, item);
    const disponivel = temTamanho
      ? numero(saldosPorTamanho(p, modulo, item)[chave])
      : numero(item.estoque_atual);
    if (quantidade > disponivel) {
      const tamanho = temTamanho ? ` do tamanho ${nomeTamanho(p, chave)}` : "";
      return `A ${acao} de ${quantidade} unidade(s) de ${item.nome} passa do estoque disponível${tamanho} (${disponivel}).`;
    }
  }
  return null;
}

/**
 * Tamanho escolhido na tela para gravar: vazio vira nulo. "Sem tamanho" também vira nulo, a não
 * ser na devolução, que precisa dizer explicitamente que o item volta para "Sem tamanho".
 */
export const tamanhoParaGravar = (
  escolhido: string | null | undefined,
  manterSemTamanho = false,
): string | null =>
  !escolhido || (escolhido === SEM_TAMANHO && !manterSemTamanho) ? null : escolhido;

/** Nome do tamanho de uma movimentação ou compra; vazio quando não tem tamanho. */
export const nomeTamanhoGravado = (p: ParametrosBase, tamanhoId: string | null | undefined) =>
  tamanhoId ? nomeTamanho(p, tamanhoId) : "";

/** Unidade do produto: a de Gerais pela referência, ou o texto antigo gravado. */
export function nomeUnidade(p: ParametrosBase, produto: ProdutoTamanho): string {
  const unidade = produto.unidade_id ? p.unidades.find((u) => u.id === produto.unidade_id) : null;
  if (unidade) return estaAtivo(p, unidade.id) ? unidade.nome : `${unidade.nome} (desativada)`;
  return produto.unidade_medida?.trim() ?? "";
}
