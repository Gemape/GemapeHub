// Onde um parâmetro de Cadastros > Gerais é usado (decisão 22, regra 5): antes de excluir,
// a tela confere os cadastros e, se houver uso, recusa e mostra quais cadastros dependem dele.
import {
  autorizados,
  mesmoNome,
  type Opcao,
  type ParametrosBase,
  type Subcategoria,
  type TipoOpcao,
} from "./parametros-base.ts";
import { resolverSubcategoria, SUBCATEGORIA_DAS_TABELAS } from "./subcategoria-referencia.ts";
import { saldosPorTamanho, type ModuloTamanho, type ProdutoTamanho } from "./estoque-tamanho.ts";

export type UsoParametro = { modulo: string; codigos: string[] };
type Registro = Record<string, unknown>;

const MODULO_DA_TABELA: Record<keyof typeof SUBCATEGORIA_DAS_TABELAS, string> = {
  epis: "EPI",
  uniformes: "Uniforme",
  veiculos: "Veículo",
};
const MAXIMO_NO_AVISO = 5;

// Identificação do cadastro no aviso: o código, ou a placa do veículo.
const identificar = (r: Registro) =>
  String(r["codigo_sku"] || r["placa"] || r["nome"] || r["id"] || "sem código");

export function usoDaSubcategoria(
  sub: Subcategoria,
  parametros: ParametrosBase,
  cadastros: Partial<Record<keyof typeof SUBCATEGORIA_DAS_TABELAS, Registro[]>>,
): UsoParametro[] {
  const usos: UsoParametro[] = [];
  for (const [tabela, { categoriaId, campo }] of Object.entries(SUBCATEGORIA_DAS_TABELAS)) {
    if (categoriaId !== sub.categoriaId) continue;
    const codigos = (cadastros[tabela as keyof typeof SUBCATEGORIA_DAS_TABELAS] ?? [])
      .filter((r) => resolverSubcategoria(parametros, categoriaId, r, campo)?.id === sub.id)
      .map(identificar);
    if (codigos.length > 0) {
      usos.push({ modulo: MODULO_DA_TABELA[tabela as keyof typeof MODULO_DA_TABELA], codigos });
    }
  }
  return usos;
}

// Parâmetros gravados pelo nome (marcas, categoria e grupo de ferramenta).
export function usoPorNome(
  registros: Registro[],
  campo: string,
  nome: string,
  modulo: string,
): UsoParametro[] {
  const codigos = registros
    .filter((r) => typeof r[campo] === "string" && mesmoNome(r[campo] as string, nome))
    .map(identificar);
  return codigos.length > 0 ? [{ modulo, codigos }] : [];
}

export function usoDaCategoria(
  categoriaId: string,
  fornecedores: { nome_fantasia: string; categorias: string[] }[],
): UsoParametro[] {
  const nomes = fornecedores
    .filter((f) => f.categorias.includes(categoriaId))
    .map((f) => f.nome_fantasia);
  return nomes.length > 0 ? [{ modulo: "Fornecedor", codigos: nomes }] : [];
}

export const descreverUso = (usos: UsoParametro[]) =>
  usos
    .map(({ modulo, codigos }) => {
      const mostrados = codigos.slice(0, MAXIMO_NO_AVISO).join(", ");
      const resto = codigos.length - MAXIMO_NO_AVISO;
      return `${modulo}: ${mostrados}${resto > 0 ? ` e mais ${resto}` : ""}`;
    })
    .join("; ");

// ---------- Tamanhos e unidades (decisão 23) ----------

type TabelaComTamanho = "epis" | "uniformes";
const PRODUTOS_COM_TAMANHO: {
  tabela: TabelaComTamanho;
  modulo: ModuloTamanho;
  rotulo: string;
  categoriaId: string;
}[] = [
  { tabela: "epis", modulo: "epi", rotulo: "EPI", categoriaId: "cat-epi" },
  { tabela: "uniformes", modulo: "uniforme", rotulo: "Uniforme", categoriaId: "cat-uniformes" },
];
export type CadastrosComTamanho = Partial<
  Record<TabelaComTamanho | "movimentacoes" | "compras_epis" | "compras_uniformes", Registro[]>
>;

const positivo = (v: unknown) => Number(v) > 0;
const registros = (quantidade: number) => `${quantidade} registro(s)`;

/** Onde o tamanho é usado: saldo ou mínimo de produto, tamanho digitado antigo, movimentações e compras. */
export function usoDoTamanho(
  tamanho: Opcao,
  parametros: ParametrosBase,
  cadastros: CadastrosComTamanho,
): UsoParametro[] {
  const usos: UsoParametro[] = [];
  for (const { tabela, modulo, rotulo } of PRODUTOS_COM_TAMANHO) {
    const codigos = (cadastros[tabela] ?? [])
      .filter((r) => {
        const produto = r as ProdutoTamanho;
        if (positivo(produto.minimos_tamanho?.[tamanho.id])) return true;
        return tamanho.id in saldosPorTamanho(parametros, modulo, produto);
      })
      .map(identificar);
    if (codigos.length > 0) usos.push({ modulo: rotulo, codigos });
  }
  const movimentos = (cadastros.movimentacoes ?? []).filter((m) => m["tamanho_id"] === tamanho.id);
  if (movimentos.length > 0)
    usos.push({ modulo: "Movimentações", codigos: [registros(movimentos.length)] });
  const compras = [
    ...(cadastros.compras_epis ?? []),
    ...(cadastros.compras_uniformes ?? []),
  ].filter((c) => c["tamanho_id"] === tamanho.id);
  if (compras.length > 0) usos.push({ modulo: "Compras", codigos: [registros(compras.length)] });
  return usos;
}

const usaUnidade = (r: Registro, unidade: Opcao) =>
  r["unidade_id"]
    ? r["unidade_id"] === unidade.id
    : typeof r["unidade_medida"] === "string" && mesmoNome(r["unidade_medida"], unidade.nome);

/** Produtos que usam a unidade (pela referência ou pelo texto antigo). */
export function usoDaUnidade(unidade: Opcao, cadastros: CadastrosComTamanho): UsoParametro[] {
  return PRODUTOS_COM_TAMANHO.flatMap(({ tabela, rotulo }) => {
    const codigos = (cadastros[tabela] ?? [])
      .filter((r) => usaUnidade(r, unidade))
      .map(identificar);
    return codigos.length > 0 ? [{ modulo: rotulo, codigos }] : [];
  });
}

/**
 * Produtos da subcategoria que dependem dos tamanhos ou unidades a desautorizar: saldo,
 * mínimo ou histórico no tamanho, ou a unidade escolhida no cadastro.
 */
export function dependenciasDaDesautorizacao(
  parametros: ParametrosBase,
  subcategoriaId: string,
  tipo: TipoOpcao,
  ids: string[],
  cadastros: CadastrosComTamanho,
): UsoParametro[] {
  const alvo = new Set(ids);
  return PRODUTOS_COM_TAMANHO.flatMap(({ tabela, modulo, rotulo, categoriaId }) => {
    const codigos = (cadastros[tabela] ?? [])
      .filter((r) => resolverSubcategoria(parametros, categoriaId, r)?.id === subcategoriaId)
      .filter((r) => {
        const produto = r as ProdutoTamanho;
        if (tipo === "unidades") return !!produto.unidade_id && alvo.has(produto.unidade_id);
        const saldos = saldosPorTamanho(parametros, modulo, produto);
        const minimos = produto.minimos_tamanho ?? {};
        return (
          ids.some((id) => positivo(saldos[id]) || positivo(minimos[id])) ||
          (cadastros.movimentacoes ?? []).some(
            (m) => m["item_id"] === r["id"] && alvo.has(String(m["tamanho_id"] ?? "")),
          )
        );
      })
      .map(identificar);
    return codigos.length > 0 ? [{ modulo: rotulo, codigos }] : [];
  });
}

/**
 * Autorizar o primeiro tamanho numa subcategoria com produtos com saldo: o saldo deles fica em
 * "Sem tamanho" (só sai até zerar) e não é convertido. Devolve o aviso, ou null.
 */
export function avisoAutorizacaoTamanhos(
  parametros: ParametrosBase,
  subcategoriaId: string,
  produtos: Registro[],
): string | null {
  if (autorizados(parametros, subcategoriaId, "tamanhos").length > 0) return null;
  const sub = parametros.subcategorias.find((s) => s.id === subcategoriaId);
  if (!sub) return null;
  const codigos = produtos
    .filter((r) => resolverSubcategoria(parametros, sub.categoriaId, r)?.id === subcategoriaId)
    .filter((r) => positivo(r["estoque_atual"]) && !r["saldos_tamanho"])
    // Tamanho digitado antigo que casa com Gerais leva o saldo para esse tamanho.
    .filter((r) => {
      const digitado = typeof r["tamanho"] === "string" ? r["tamanho"].trim() : "";
      return !digitado || !parametros.tamanhos.some((t) => mesmoNome(t.nome, digitado));
    })
    .map(identificar);
  if (codigos.length === 0) return null;
  const lista = descreverUso([{ modulo: "Produtos com saldo", codigos }]);
  return `${lista}. Esse saldo fica em "Sem tamanho": não é convertido e só pode sair até zerar.`;
}
