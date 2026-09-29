// @ts-nocheck -- adaptador propositalmente genérico para emular a API de consulta no demo.
/* Ambiente de demonstração local. Não envia dados e não substitui o Supabase real. */
type Linha = Record<string, unknown>;
const agora = new Date().toISOString();
const empresa = { id: "empresa-demo", nome_fantasia: "GEMAPE", razao_social: "GEMAPE Demonstração", cnpj: "00.000.000/0001-00", created_at: agora };
const usuario = { id: "admin-demo", email: "admin@demo.local" };
const dadosIniciais: Record<string, Linha[]> = {
  perfis: [{ id: usuario.id, papel: "admin", ativo: true }], empresas: [empresa],
  empregados: [{ id: "emp-demo", empresa_id: empresa.id, nome: "Maria da Silva", cpf: "000.000.000-00", cargo: "Técnica", matricula: "1001", ativo: true }],
  epis: [{ id: "epi-demo", empresa_id: empresa.id, nome: "Capacete de segurança", codigo_sku: "EPI-0001", categoria: "Capacete", ca: "12345", estoque_atual: 12, estoque_minimo: 5, status: "Ativo", preco_unitario: 85, created_at: agora }],
  uniformes: [{ id: "uni-demo", empresa_id: empresa.id, nome: "Camisa operacional", codigo_sku: "UNI-0001", categoria: "Camisa", tamanho: "M", estoque_atual: 20, estoque_minimo: 8, status: "Ativo", preco_unitario: 55, created_at: agora }],
  ferramentas: [{ id: "fer-demo", empresa_id: empresa.id, nome: "Furadeira", codigo_sku: "FER-0001", categoria: "Elétrica", estoque_atual: 3, estoque_minimo: 2, status: "Ativo", preco_unitario: 240, created_at: agora }],
  veiculos: [{ id: "vei-demo", empresa_id: empresa.id, placa: "GEM-2026", marca: "Fiat", modelo: "Strada", quilometragem_atual: 25000, status: "Ativo", created_at: agora }],
  movimentacoes: [], ocorrencias: [], compras_epis: [], compras_uniformes: [], caixas_ferramentas: [], caixa_ferramenta_itens: [], cadastros_auxiliares: [], auditoria: [],
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
const id = () => crypto.randomUUID();
class Consulta {
  private filtros: Array<(l: Linha) => boolean> = []; private ordem?: string; private limite?: number; private payload?: Linha | Linha[]; private acao = "select"; private contagem = false;
  constructor(private tabela: string) {}
  select(_colunas = "*", opts?: { count?: string; head?: boolean }) { this.contagem = Boolean(opts?.count); return this; }
  eq(chave: string, valor: unknown) { this.filtros.push(l => l[chave] === valor); return this; }
  gte(chave: string, valor: unknown) { this.filtros.push(l => String(l[chave] ?? "") >= String(valor)); return this; }
  ilike(chave: string, valor: string) { const texto = valor.replaceAll("%", "").toLowerCase(); this.filtros.push(l => String(l[chave] ?? "").toLowerCase().includes(texto)); return this; }
  or(_valor: string) { return this; }
  not(_a: string, _b: string, _c: string) { return this; }
  order(chave: string, opts?: { ascending?: boolean }) { this.ordem = `${chave}:${opts?.ascending === false ? "desc" : "asc"}`; return this; }
  limit(n: number) { this.limite = n; return this; }
  insert(v: Linha | Linha[]) { this.acao = "insert"; this.payload = v; return this; }
  update(v: Linha) { this.acao = "update"; this.payload = v; return this; }
  delete() { this.acao = "delete"; return this; }
  single() { return this.executar(true); }
  then<TResult1 = { data: Linha[] | null; error: null; count?: number }, TResult2 = never>(ok?: ((v: { data: Linha[] | null; error: null; count?: number }) => TResult1 | PromiseLike<TResult1>) | null, bad?: ((e: unknown) => TResult2 | PromiseLike<TResult2>) | null) { return this.executar(false).then(ok, bad); }
  private async executar(unico: boolean) {
    const linhas = dados[this.tabela] ?? (dados[this.tabela] = []); let selecionadas = linhas.filter(l => this.filtros.every(f => f(l)));
    if (this.acao === "insert") { const novos = (Array.isArray(this.payload) ? this.payload : [this.payload]).map(l => ({ id: (l?.id as string) ?? id(), created_at: agora, ...l })); linhas.push(...novos); selecionadas = novos; persistirDados(); }
    if (this.acao === "update") { selecionadas.forEach(l => Object.assign(l, this.payload)); persistirDados(); }
    if (this.acao === "delete") { selecionadas.forEach(l => linhas.splice(linhas.indexOf(l), 1)); persistirDados(); }
    if (this.ordem) { const [c,d] = this.ordem.split(":"); selecionadas.sort((a,b) => String(a[c]).localeCompare(String(b[c])) * (d === "desc" ? -1 : 1)); }
    if (this.limite) selecionadas = selecionadas.slice(0,this.limite);
    const resultado = unico ? (selecionadas[0] ?? null) : clone(selecionadas);
    return { data: resultado, error: null, ...(this.contagem ? { count: selecionadas.length } : {}) };
  }
}
let sessao = true; let listeners: Array<(event: string) => void> = [];
export const demoSupabase = {
  from: (tabela: string) => new Consulta(tabela),
  rpc: async (nome: string, args: { p_id?: string; p_valores?: Linha; p_itens?: Linha[] }) => {
    if (nome !== "salvar_caixa") return { data: null, error: new Error("Operação indisponível na demonstração") };
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
