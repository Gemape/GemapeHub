// @ts-nocheck -- adaptador propositalmente genérico para emular a API de consulta no demo.
/* Ambiente de demonstração local. Não envia dados e não substitui o Supabase real. */
import { EVENTO_PARAMETROS, lerParametros } from "../../lib/parametros-base.ts";
import { duplicadoNoCatalogo, editarEpiCatalogo, excluirEpiCatalogo, sincronizarEstoqueEpis } from "../../lib/epi-catalogo.ts";
import { aplicarSeparacao, opcoesDaSeparacao } from "../../lib/epi-separar-tamanhos.ts";
import { vincularSubcategorias } from "../../lib/subcategoria-referencia.ts";
import {
  controlaModulo,
  controlaTamanho,
  movimentarTamanho,
  saldosPorTamanho,
  SEM_TAMANHO,
  somaSaldos,
} from "../../lib/estoque-tamanho.ts";

type Linha = Record<string, unknown>;
const agora = new Date().toISOString();
const empresa = { id: "empresa-demo", nome_fantasia: "GEMAPE", razao_social: "GEMAPE Demonstração", cnpj: "00.000.000/0001-00", rua: "Rua Exemplo", numero: "100", bairro: "Centro", cep: "01000-000", cidade: "São Paulo", estado: "SP", status: "Ativa", created_at: agora };
const usuario = { id: "admin-demo", email: "admin@demo.local" };
const dadosIniciais: Record<string, Linha[]> = {
  perfis: [{ id: usuario.id, papel: "admin", ativo: true }], empresas: [empresa],
  empregados: [{ id: "emp-demo", empresa_id: empresa.id, nome: "Maria da Silva", cpf: "000.000.000-00", cargo: "Técnica", matricula: "1001", ativo: true }],
  epis: [{ id: "epi-demo", empresa_id: empresa.id, nome: "Capacete de segurança", codigo_sku: "EPI-0001", categoria: "Capacete", subcategoria_id: "sub-epi-capacete", ca: "12345", estoque_atual: 12, estoque_minimo: 5, status: "Ativo", preco_unitario: 85, created_at: agora }],
  uniformes: [{ id: "uni-demo", empresa_id: empresa.id, nome: "Camisa operacional", codigo_sku: "UNI-0001", categoria: "Camisa", subcategoria_id: "sub-uniformes-camisa", tamanho: "M", estoque_atual: 20, estoque_minimo: 8, status: "Ativo", preco_unitario: 55, created_at: agora }],
  ferramentas: [{ id: "fer-demo", empresa_id: empresa.id, nome: "Furadeira", codigo_sku: "FER-0001", categoria: "Elétrica", subcategoria_id: "sub-ferramentas-eletrica", estoque_atual: 3, estoque_minimo: 2, status: "Ativo", preco_unitario: 240, created_at: agora }],
  veiculos: [{ id: "vei-demo", empresa_id: empresa.id, placa: "GEM-2026", marca: "Fiat", modelo: "Strada", quilometragem_atual: 25000, status: "Ativo", created_at: agora }],
  movimentacoes: [], ocorrencias: [], compras_epis: [], compras_uniformes: [], caixas_ferramentas: [], caixa_ferramenta_itens: [], cadastros_auxiliares: [], auditoria: [],
  notas_fiscais_importadas: [],
};
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const chaveArmazenamento = "gemape-demo-dados";
const lerDados = (): Record<string, Linha[]> => {
  if (typeof window === "undefined") return dadosIniciais;
  try {
    const salvo = window.localStorage.getItem(chaveArmazenamento);
    return salvo ? JSON.parse(salvo) : clone(dadosIniciais);
  } catch {
    return clone(dadosIniciais);
  }
};
const dados = lerDados();
const persistirDados = () => {
  if (typeof window !== "undefined") window.localStorage.setItem(chaveArmazenamento, JSON.stringify(dados));
};
// Cadastros gravados só com o nome da subcategoria ganham a referência dela (decisão 22).
// Roda ao abrir e a cada mudança em Gerais, para ligar nomes que passem a existir lá.
const vincularSubcategoriasGravadas = () => {
  if (typeof window === "undefined") return;
  try {
    if (vincularSubcategorias(dados, lerParametros()) > 0) persistirDados();
  } catch {
    // Gerais ilegível: os cadastros continuam como estão.
  }
};
vincularSubcategoriasGravadas();
// O estoque de cada empresa nasce do catálogo de EPI (decisão 35). Ao abrir, completa o que faltar.
if (typeof window !== "undefined") window.addEventListener?.(EVENTO_PARAMETROS, vincularSubcategoriasGravadas);
const id = () => crypto.randomUUID();
const sincronizarEpis = () => {
  if (sincronizarEstoqueEpis(dados, id, new Date().toISOString())) persistirDados();
};
sincronizarEpis();
// Catálogo de EPI: o mesmo EPI não entra duas vezes no mesmo tamanho e o código é único.
// Tudo ou nada: se um item do lote falha, nenhum entra.
const validarCatalogoEpi = (novos: Linha[]): Error | null => {
  const aceitos: Linha[] = [...(dados.epis_catalogo ?? [])];
  const codigos = new Set([...aceitos.map(c => String(c.codigo_sku)), ...(dados.epis ?? []).filter(e => !e.catalogo_id).map(e => String(e.codigo_sku))]);
  for (const n of novos) {
    if (duplicadoNoCatalogo(aceitos as never, String(n.nome ?? ""), (n.tamanho_id as string | null) ?? null)) return new Error("Este EPI já está cadastrado neste tamanho.");
    if (codigos.has(String(n.codigo_sku))) return new Error(`O código ${n.codigo_sku} já está em uso.`);
    aceitos.push(n); codigos.add(String(n.codigo_sku));
  }
  return null;
};
// Emula o gatilho de movimentações do banco real (migration 20260928140000): entrada e
// devolução somam, saída subtrai, vistoria e transferência não mexem no saldo. Tudo ou nada.
const TABELA_DO_MODULO: Record<string, string> = { epi: "epis", uniforme: "uniformes", ferramenta: "ferramentas" };
// EPI e uniforme com tamanho autorizado em Gerais têm saldo por tamanho (decisão 23): a
// movimentação informa o tamanho e só mexe no saldo dele; o estoque do produto é a soma.
const aplicarEstoque = (movimentacoes: Linha[]): Error | null => {
  const saldos = new Map<Linha, number>();
  const porTamanho = new Map<Linha, Record<string, number>>();
  let parametros: ReturnType<typeof lerParametros> | null = null;
  for (const m of movimentacoes) {
    const item = (dados[TABELA_DO_MODULO[m.modulo as string]] ?? []).find(i => i.id === m.item_id);
    const quantidade = Number(m.quantidade) || 0;
    const delta = m.tipo_movimentacao === "Entrada" || m.tipo_movimentacao === "Devolucao" ? quantidade : m.tipo_movimentacao === "Saida" ? -quantidade : 0;
    if (!item) continue;
    if (controlaModulo(m.modulo as string)) {
      parametros ??= lerParametros();
      const modulo = m.modulo as "epi" | "uniforme";
      if (controlaTamanho(parametros, modulo, item)) {
        try {
          const atuais = porTamanho.get(item) ?? saldosPorTamanho(parametros, modulo, item);
          porTamanho.set(item, movimentarTamanho(parametros, modulo, item, atuais, m));
        } catch (erro) {
          return erro as Error;
        }
        continue;
      }
      // "Sem tamanho" explícito (devolução) vale também para o produto sem tamanho.
      if (m.tamanho_id && m.tamanho_id !== SEM_TAMANHO && delta !== 0)
        return new Error(
          `${item.nome ?? "O produto"} não tem tamanho autorizado em Cadastros > Gerais.`,
        );
    }
    if (delta === 0) continue;
    const saldo = (saldos.get(item) ?? (Number(item.estoque_atual) || 0)) + delta;
    if (saldo < 0) return new Error("Estoque insuficiente");
    saldos.set(item, saldo);
  }
  saldos.forEach((saldo, item) => {
    item.estoque_atual = saldo;
    // Produto que deixou de controlar tamanho: o mapa antigo (só "Sem tamanho" ou tamanhos
    // zerados) sai, para o saldo voltar inteiro se a subcategoria ganhar tamanhos de novo.
    if (item.saldos_tamanho) item.saldos_tamanho = null;
  });
  porTamanho.forEach((saldosDoItem, item) => {
    item.saldos_tamanho = saldosDoItem;
    item.estoque_atual = somaSaldos(saldosDoItem);
  });
  return null;
};
// Emula o gatilho gemape_compra (migration 20260916001000): cada compra de EPI ou uniforme
// vira uma entrada no histórico de movimentações, que soma no estoque.
const MODULO_DA_COMPRA: Record<string, string> = { compras_epis: "epi", compras_uniformes: "uniforme" };
const registrarCompras = (tabela: string, compras: Linha[]): Error | null => {
  if (compras.some(c => !(Number(c.quantidade) > 0) || c.valor_unitario == null || Number(c.valor_unitario) < 0)) {
    return new Error("Quantidade e valor de compra inválidos");
  }
  const entradas = compras.map(c => ({
    id: id(), created_at: agora, modulo: MODULO_DA_COMPRA[tabela], tipo_movimentacao: "Entrada",
    quantidade: Number(c.quantidade), data_movimentacao: c.data_compra, item_id: c.item_id, empresa_id: c.empresa_id,
    tamanho_id: c.tamanho_id ?? null,
    empregado_id: null, motivo_baixa: null, onus_baixa: null, tipo_vistoria: null, sinalizar_ocorrencia: false,
    observacao: `Compra: NF ${c.nota_fiscal || "não informada"} / ${c.fornecedor ?? ""}`.slice(0, 500),
  }));
  const erro = aplicarEstoque(entradas);
  if (erro) return erro;
  // valor_total é coluna calculada no banco real (quantidade × valor unitário).
  compras.forEach(c => { c.valor_total = Math.round(Number(c.quantidade) * Number(c.valor_unitario) * 100) / 100; });
  (dados.movimentacoes ?? (dados.movimentacoes = [])).push(...entradas);
  return null;
};
// Emula a função do banco real (pendência da Fase 2) que importa uma NF-e numa transação:
// compras de EPI e uniforme, entradas de ferramenta e o registro da chave de acesso.
// Qualquer falha desfaz tudo; a mesma chave não é importada duas vezes.
const importarNotaFiscal = (e: Linha): Error | null => {
  if (!/^\d{44}$/.test(String(e?.chave ?? ""))) return new Error("Chave de acesso inválida");
  const notas = dados.notas_fiscais_importadas ?? (dados.notas_fiscais_importadas = []);
  if (notas.some(n => n.chave === e.chave)) return new Error(`A NF-e ${e.numero} (chave ${e.chave}) já foi importada.`);
  const total = ["compras_epis", "compras_uniformes", "movimentacoes"].reduce((n, t) => n + (Array.isArray(e[t]) ? e[t].length : 0), 0);
  if (total === 0) return new Error("A nota não tem nenhum item para gravar.");
  const copia = clone(dados);
  // Cada produto precisa ser da empresa da nota, e a quantidade, inteira e positiva.
  const valido = (l: Linha, tabela: string) => Number.isInteger(l.quantidade) && Number(l.quantidade) > 0 && l.empresa_id === e.empresa_id
    && (dados[tabela] ?? []).some(i => i.id === l.item_id && i.empresa_id === e.empresa_id);
  const desfazer = (erro: Error) => { Object.keys(dados).forEach(k => delete dados[k]); Object.assign(dados, copia); return erro; };
  const novas = (linhas: unknown) => (Array.isArray(linhas) ? linhas : []).map((l: Linha) => ({ id: id(), created_at: agora, ...l }));
  for (const tabela of ["compras_epis", "compras_uniformes"]) {
    const compras = novas(e[tabela]);
    const modulo = MODULO_DA_COMPRA[tabela];
    if (compras.some(c => !valido(c, TABELA_DO_MODULO[modulo]))) return desfazer(new Error("Compra inválida: produto de outra empresa, inexistente ou quantidade não inteira"));
    const erro = registrarCompras(tabela, compras);
    if (erro) return desfazer(erro);
    (dados[tabela] ?? (dados[tabela] = [])).push(...compras);
  }
  const entradas = novas(e.movimentacoes);
  if (entradas.some(m => m.tipo_movimentacao !== "Entrada" || !valido(m, TABELA_DO_MODULO[m.modulo as string]))) {
    return desfazer(new Error("Entrada de ferramenta inválida"));
  }
  const erro = aplicarEstoque(entradas);
  if (erro) return desfazer(erro);
  (dados.movimentacoes ?? (dados.movimentacoes = [])).push(...entradas);
  notas.push({ id: id(), created_at: agora, chave: e.chave, numero: e.numero, serie: e.serie, data_emissao: e.data_emissao, empresa_id: e.empresa_id, fornecedor_id: e.fornecedor_id });
  return null;
};
class Consulta {
  private filtros: Array<(l: Linha) => boolean> = []; private ordens: string[] = []; private limite?: number; private intervalo?: [number, number]; private payload?: Linha | Linha[]; private acao = "select"; private contagem = false;
  private colunas = "*";
  private tabela: string;
  constructor(tabela: string) { this.tabela = tabela; }
  select(colunas = "*", opts?: { count?: string; head?: boolean }) { this.colunas = colunas; this.contagem = Boolean(opts?.count); return this; }
  eq(chave: string, valor: unknown) { this.filtros.push(l => l[chave] === valor); return this; }
  gte(chave: string, valor: unknown) { this.filtros.push(l => String(l[chave] ?? "") >= String(valor)); return this; }
  ilike(chave: string, valor: string) { const texto = valor.replaceAll("%", "").toLowerCase(); this.filtros.push(l => String(l[chave] ?? "").toLowerCase().includes(texto)); return this; }
  or(_valor: string) { return this; }
  not(_a: string, _b: string, _c: string) { return this; }
  order(chave: string, opts?: { ascending?: boolean }) { this.ordens.push(`${chave}:${opts?.ascending === false ? "desc" : "asc"}`); return this; }
  limit(n: number) { this.limite = n; return this; }
  range(inicio: number, fim: number) { this.intervalo = [inicio, fim]; return this; }
  insert(v: Linha | Linha[]) { this.acao = "insert"; this.payload = v; return this; }
  update(v: Linha) { this.acao = "update"; this.payload = v; return this; }
  delete() { this.acao = "delete"; return this; }
  single() { return this.executar(true); }
  then<TResult1 = { data: Linha[] | null; error: null; count?: number }, TResult2 = never>(ok?: ((v: { data: Linha[] | null; error: null; count?: number }) => TResult1 | PromiseLike<TResult1>) | null, bad?: ((e: unknown) => TResult2 | PromiseLike<TResult2>) | null) { return this.executar(false).then(ok, bad); }
  private async executar(unico: boolean) {
    const linhas = dados[this.tabela] ?? (dados[this.tabela] = []); let selecionadas = linhas.filter(l => this.filtros.every(f => f(l)));
    if (this.acao === "insert") {
      const novos = (Array.isArray(this.payload) ? this.payload : [this.payload]).map(l => ({ id: (l?.id as string) ?? id(), created_at: agora, ...l }));
      if (this.tabela === "movimentacoes") { const erro = aplicarEstoque(novos); if (erro) return { data: null, error: erro }; }
      if (this.tabela in MODULO_DA_COMPRA) { const erro = registrarCompras(this.tabela, novos); if (erro) return { data: null, error: erro }; }
      if (this.tabela === "epis_catalogo") { const erro = validarCatalogoEpi(novos); if (erro) return { data: null, error: erro }; }
      linhas.push(...novos); selecionadas = novos;
      if (this.tabela === "epis_catalogo" || this.tabela === "empresas") sincronizarEpis();
      persistirDados();
    }
    if (this.acao === "update" && this.tabela === "epis_catalogo") {
      // A edição também não pode repetir o EPI no mesmo tamanho nem o código de outro.
      const proposto = { ...(this.payload ?? {}) } as Linha;
      for (const l of selecionadas) {
        const depois = { ...l, ...proposto };
        const outros = linhas.filter(o => o !== l);
        if (duplicadoNoCatalogo(outros as never, String(depois.nome ?? ""), (depois.tamanho_id as string | null) ?? null)) return { data: null, error: new Error("Este EPI já está cadastrado neste tamanho.") };
        if (outros.some(o => o.codigo_sku === depois.codigo_sku)) return { data: null, error: new Error(`O código ${depois.codigo_sku} já está em uso.`) };
      }
    }
    if (this.acao === "delete" && this.tabela === "epis_catalogo" && selecionadas.length) {
      // A exclusão passa pela operação excluir_epi_catalogo, que confere saldo e histórico.
      return { data: null, error: new Error("EPI do catálogo não pode ser excluído direto: use a operação de excluir, que confere saldo e histórico.") };
    }
    if (this.acao === "update") {
      selecionadas.forEach(l => Object.assign(l, this.payload));
      if (this.tabela === "epis_catalogo") sincronizarEpis();
      persistirDados();
    }
    if (this.acao === "delete") { selecionadas.forEach(l => linhas.splice(linhas.indexOf(l), 1)); persistirDados(); }
    if (this.ordens.length) selecionadas.sort((a,b) => {
      for (const ordem of this.ordens) {
        const [c,d] = ordem.split(":");
        const diferenca = String(a[c]).localeCompare(String(b[c])) * (d === "desc" ? -1 : 1);
        if (diferenca) return diferenca;
      }
      return 0;
    });
    if (this.limite) selecionadas = selecionadas.slice(0,this.limite);
    if (this.intervalo) selecionadas = selecionadas.slice(this.intervalo[0], this.intervalo[1] + 1);
    const linhasResultado = this.acao === "select" && this.tabela === "caixa_ferramenta_itens" && this.colunas.includes("ferramenta:ferramentas(")
      ? selecionadas.map(linha => ({ ...linha, ferramenta: dados.ferramentas.find(f => f.id === linha.ferramenta_id) ?? null }))
      : selecionadas;
    const resultado = unico ? (linhasResultado[0] ?? null) : clone(linhasResultado);
    return { data: resultado, error: null, ...(this.contagem ? { count: selecionadas.length } : {}) };
  }
}
let sessao = true; let listeners: Array<(event: string) => void> = [];
export const demoSupabase = {
  from: (tabela: string) => new Consulta(tabela),
  rpc: async (nome: string, args: { p_id?: string; p_valores?: Linha; p_itens?: Linha[]; p_entradas?: Linha }) => {
    if (nome === "importar_nota_fiscal") {
      const erro = importarNotaFiscal(args.p_entradas ?? {});
      if (erro) return { data: null, error: erro };
      persistirDados();
      return { data: args.p_entradas?.chave, error: null };
    }
    if (nome === "editar_epi_catalogo" || nome === "excluir_epi_catalogo") {
      // Tudo ou nada: a conferência vem antes de qualquer alteração (decisão 45).
      const r = nome === "editar_epi_catalogo"
        ? editarEpiCatalogo(dados, String(args.p_id ?? ""), { nome: String(args.p_valores?.nome ?? ""), estoque_minimo: args.p_valores?.estoque_minimo as string | number })
        : excluirEpiCatalogo(dados, String(args.p_id ?? ""));
      if (r.erro) return { data: null, error: new Error(r.erro) };
      persistirDados();
      return { data: args.p_id, error: null };
    }
    if (nome === "separar_epis_por_tamanho") {
      // Tudo ou nada: aplicarSeparacao só troca os dados se conseguir terminar.
      const r = aplicarSeparacao(dados, opcoesDaSeparacao(lerParametros()), id, new Date().toISOString());
      if (r.erro) return { data: null, error: new Error(r.erro) };
      persistirDados();
      return { data: r, error: null };
    }
    if (nome !== "salvar_caixa") return { data: null, error: new Error("Operação indisponível na demonstração") };
    // Código único, como a restrição UNIQUE do banco: nada é gravado se repetir.
    const codigo = args.p_valores?.codigo;
    if (codigo && dados.caixas_ferramentas.some(x => x.codigo === codigo && x.id !== args.p_id)) {
      return { data: null, error: new Error(`Já existe a caixa ${codigo}.`) };
    }
    const caixa = args.p_id ? (dados.caixas_ferramentas.find(x => x.id === args.p_id) ?? {}) : { id: id(), created_at: agora };
    Object.assign(caixa, args.p_valores); if (!args.p_id) dados.caixas_ferramentas.push(caixa);
    dados.caixa_ferramenta_itens = dados.caixa_ferramenta_itens.filter(x => x.caixa_id !== caixa.id);
    dados.caixa_ferramenta_itens.push(...(args.p_itens ?? []).map(x => ({ id: id(), caixa_id: caixa.id, ...x })));
    persistirDados();
    return { data: caixa.id, error: null };
  },
  auth: {
    getUser: async () => ({ data: { user: sessao ? usuario : null }, error: sessao ? null : new Error("Sem sessão") }),
    getSession: async () => ({ data: { session: sessao ? { access_token: "demo" } : null } }),
    signInWithPassword: async () => { sessao = true; listeners.forEach(f => f("SIGNED_IN")); return { data: { user: usuario }, error: null }; },
    signOut: async () => { sessao = false; listeners.forEach(f => f("SIGNED_OUT")); return { error: null }; },
    resetPasswordForEmail: async () => ({ error: null }), updateUser: async () => ({ error: null }),
    onAuthStateChange: (f: (e: string) => void) => { listeners.push(f); return { data: { subscription: { unsubscribe: () => { listeners = listeners.filter(x => x !== f); } } } }; },
  },
};
