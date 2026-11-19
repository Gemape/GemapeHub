// Permissões por usuário no modo demonstração (só teste): cada tela tem quatro ações (ver, criar, editar, excluir). O perfil (Administrador, RH ou Padrão)
// dá o ponto de partida e cada usuário pode ter exceções; só a diferença para o perfil é guardada. Tudo fica no armazenamento do navegador, nunca no Supabase.
// Quem usa confere o modo demonstração (`import.meta.env.VITE_DEMO_MODE !== "false"`) no ponto de uso, para este arquivo sair do sistema de produção.

import { GRUPOS_INICIO } from "./inicio.ts";

export const ACOES = ["ver", "criar", "editar", "excluir"] as const;
export type Acao = (typeof ACOES)[number];
export type Matriz = Record<string, Partial<Record<Acao, boolean>>>;
export type PerfilBase = "admin" | "rh" | "padrao";
// Além dos três perfis de origem, o Administrador cria perfis próprios (`Estado.perfis`), com a sua matriz de permissões por módulo.
export type PerfilId = PerfilBase | (string & {});
export type PerfilPersonalizado = { id: string; nome: string; matriz: Matriz };
export type Usuario = { id: string; nome: string; perfil: PerfilId; excecoes: Matriz };
export type Estado = { versao: number; usuarios: Usuario[]; perfis?: PerfilPersonalizado[] };
type Armazenamento = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const CHAVE_PERMISSOES = "gemape-demo-permissoes";
export const CHAVE_USUARIO_ATIVO = "gemape-demo-usuario-ativo";
export const EVENTO_PERMISSOES = "gemape-permissoes";
// Sobe quando o conjunto original de usuários ou perfis muda: os dados são refeitos sozinhos.
export const VERSAO_PERMISSOES = 1;
export const USUARIO_PADRAO = "teste-usuario-1";

// Cada tela da matriz, com os caminhos que ela cobre (o caminho vale também para as rotas que começam com ele e "-", como /epi-ficha).
export const TELAS = [
  { id: "dashboard", nome: "Dashboard", grupo: "Visão geral", caminhos: ["/dashboard"], tabelas: [] },
  { id: "epi", nome: "EPIs", grupo: "Módulos", caminhos: ["/epi", "/cadastros/epi"], tabelas: ["epis", "epis_catalogo", "compras_epis"] },
  { id: "uniformes", nome: "Uniformes", grupo: "Módulos", caminhos: ["/uniformes", "/cadastros/uniformes"], tabelas: ["uniformes", "uniformes_catalogo", "compras_uniformes"] },
  { id: "ferramentas", nome: "Ferramentas e caixas", grupo: "Módulos", caminhos: ["/ferramentas", "/caixas-ferramentas", "/cadastros/ferramentas", "/cadastros/ferramentas-plano-vistorias", "/cadastros/caixas-ferramentas"], tabelas: ["ferramentas", "caixas_ferramentas", "caixa_ferramenta_itens"] },
  { id: "veiculos", nome: "Veículos", grupo: "Módulos", caminhos: ["/veiculos", "/cadastros/veiculos"], tabelas: ["veiculos"] },
  { id: "viagens", nome: "Viagens", grupo: "Módulos", caminhos: ["/viagens", "/cadastros/viagens", "/cadastros/viagens-questionario-despesas", "/cadastros/viagens-especificos"], tabelas: [] },
  { id: "equipamentos", nome: "Equipamentos", grupo: "Módulos", caminhos: ["/equipamentos", "/cadastros/equipamentos"], tabelas: [] },
  { id: "empresas", nome: "Empresas", grupo: "Cadastros", caminhos: ["/empresas"], tabelas: ["empresas"] },
  { id: "empregados", nome: "Empregados", grupo: "Cadastros", caminhos: ["/empregados"], tabelas: ["empregados"] },
  { id: "fornecedores", nome: "Fornecedores", grupo: "Cadastros", caminhos: ["/cadastros/fornecedores"], tabelas: [] },
  { id: "clientes", nome: "Clientes", grupo: "Cadastros", caminhos: ["/cadastros/clientes"], tabelas: [] },
] as const;
export type TelaId = (typeof TELAS)[number]["id"];

// Cada menu do sistema (aba do módulo e item de Parâmetros) é uma tela da matriz, abaixo da tela do módulo: sem exceção, herda o que o módulo tem;
// com exceção, o Administrador libera ou tira só aquele menu. Os menus saem dos mesmos dados da tela inicial, sem lista paralela.
export type SubTela = { id: string; nome: string; grupo: string; pai: TelaId; url: string; secao: string; search?: Record<string, string> };
const PAI_DO_CARTAO: Record<string, TelaId> = { EPIs: "epi", Uniformes: "uniformes", Ferramentas: "ferramentas", Veículos: "veiculos", Viagens: "viagens", Equipamentos: "equipamentos" };
export const SUBTELAS: readonly SubTela[] = (() => {
  const vistos = new Set<string>();
  const saida: SubTela[] = [];
  for (const cartao of GRUPOS_INICIO.flatMap((g) => g.cartoes)) {
    const pai = PAI_DO_CARTAO[cartao.titulo];
    if (!pai) continue;
    for (const i of cartao.itens ?? []) {
      if (i.soAdmin) continue;
      let id = `${pai}|${i.secao}|${i.titulo}`;
      if (vistos.has(id)) id += `|${Object.values(i.search ?? {}).join("-")}`;
      for (let n = 2; vistos.has(id); n++) id += `|${n}`;
      vistos.add(id);
      saida.push({ id, nome: i.titulo, grupo: `${cartao.titulo} · ${i.secao}`, pai, url: i.url, secao: i.secao, ...(i.search ? { search: i.search } : {}) });
    }
  }
  return saida;
})();
const SUBTELA_POR_ID = new Map(SUBTELAS.map((s) => [s.id, s]));
export const ehSubTela = (id: string): boolean => SUBTELA_POR_ID.has(id);

export const PERFIS: readonly { id: PerfilId; nome: string }[] = [
  { id: "admin", nome: "Administrador" },
  { id: "rh", nome: "RH" },
  { id: "padrao", nome: "Padrão" },
];

// Perfis próprios do estado lido por último (as contas de permissão abaixo precisam achá-los pelo id, como os de origem).
let personalizados = new Map<string, Matriz>();
const sincronizar = (estado: Estado) => { personalizados = new Map((estado.perfis ?? []).map((p) => [p.id, p.matriz])); };
export const padraoDe = (perfil: PerfilId): Matriz => PADRAO_DO_PERFIL[perfil as PerfilBase] ?? personalizados.get(perfil) ?? PADRAO_DO_PERFIL.padrao;
export const perfisDoEstado = (estado: Estado): { id: PerfilId; nome: string; proprio: boolean }[] => [
  ...PERFIS.map((p) => ({ ...p, proprio: false })),
  ...(estado.perfis ?? []).map((p) => ({ id: p.id, nome: p.nome, proprio: true })),
];
export const nomeDoPerfil = (estado: Estado, id: PerfilId): string => perfisDoEstado(estado).find((p) => p.id === id)?.nome ?? String(id);

const tudo = (): Record<Acao, boolean> => ({ ver: true, criar: true, editar: true, excluir: true });
const so = (...acoes: Acao[]): Partial<Record<Acao, boolean>> => Object.fromEntries(acoes.map((a) => [a, true]));
// Ponto de partida de cada perfil. Administrador tem tudo (e é o único que vê Gerais e Configurações); RH cuida de pessoas, EPIs e uniformes; Padrão
// opera os módulos do dia a dia e não vê os cadastros administrativos.
export const PADRAO_DO_PERFIL: Record<PerfilBase, Matriz> = {
  admin: Object.fromEntries(TELAS.map((t) => [t.id, tudo()])),
  rh: Object.fromEntries(TELAS.map((t) => [t.id, t.id === "empregados" ? tudo() : t.id === "epi" || t.id === "uniformes" ? so("ver", "criar", "editar") : so("ver")])),
  padrao: Object.fromEntries(TELAS.map((t) => [t.id, ["empresas", "empregados", "fornecedores", "clientes"].includes(t.id) ? {} : ["epi", "uniformes", "ferramentas", "viagens"].includes(t.id) ? so("ver", "criar") : so("ver")])),
};

// Usuários de teste, cada um com acessos diferentes: o último é do perfil Padrão, restrito por exceções a EPIs e Uniformes.
export function usuariosOriginais(): Usuario[] {
  const somente = (...ids: TelaId[]): Matriz => Object.fromEntries(TELAS.map((t) => [t.id, ids.includes(t.id) ? so("ver", "criar") : {}]));
  return [
    { id: USUARIO_PADRAO, nome: "Administrador Demo", perfil: "admin", excecoes: {} },
    { id: "teste-usuario-2", nome: "Helena Rocha (RH)", perfil: "rh", excecoes: {} },
    { id: "teste-usuario-3", nome: "Paulo Mendes (Padrão)", perfil: "padrao", excecoes: {} },
    { id: "teste-usuario-4", nome: "Marina Souza (restrita a EPIs e Uniformes)", perfil: "padrao", excecoes: diferencaParaPerfil("padrao", somente("epi", "uniformes")) },
  ];
}

// Só o que difere do padrão do perfil (todas as ações de todas as telas comparadas).
export function diferencaParaPerfil(perfil: PerfilId, desejada: Matriz): Matriz {
  const saida: Matriz = {};
  for (const t of TELAS) for (const a of ACOES) {
    const quer = !!desejada[t.id]?.[a];
    if (quer !== !!padraoDe(perfil)[t.id]?.[a]) (saida[t.id] ??= {})[a] = quer;
  }
  return saida;
}

// Permissões efetivas do usuário: padrão do perfil com as exceções por cima. Criar, editar e excluir só valem com "ver".
const cacheEfetivas = new WeakMap<object, Matriz>();
export function efetivas(u: Pick<Usuario, "perfil" | "excecoes">): Matriz {
  const guardada = cacheEfetivas.get(u);
  if (guardada) return guardada;
  const saida: Matriz = {};
  for (const t of TELAS) {
    const base = padraoDe(u.perfil)[t.id];
    const ver = u.excecoes[t.id]?.ver ?? base?.ver ?? false;
    saida[t.id] = Object.fromEntries(ACOES.map((a) => [a, a === "ver" ? ver : ver && (u.excecoes[t.id]?.[a] ?? base?.[a] ?? false)]));
  }
  // Menus: herdam do módulo, e a exceção do menu vale por cima (só com "ver" do módulo).
  for (const s of SUBTELAS) {
    const pai = saida[s.pai] ?? {};
    const exc = u.excecoes[s.id];
    const ver = !!pai.ver && (exc?.ver ?? true);
    saida[s.id] = Object.fromEntries(ACOES.map((a) => [a, a === "ver" ? ver : ver && (exc?.[a] ?? pai[a] ?? false)]));
  }
  cacheEfetivas.set(u, saida);
  return saida;
}

// Lê sem gravar (é chamado durante a renderização): sem dado válido, vale o conjunto original, que só é gravado ao salvar ou restaurar. O resultado fica
// guardado enquanto o texto salvo não muda, para as telas não refazerem a conta a cada chamada.
let ultimoTexto: string | null | undefined;
let ultimoEstado: Estado | null = null;
export function lerPermissoes(storage: Armazenamento): Estado {
  const texto = storage.getItem(CHAVE_PERMISSOES);
  if (ultimoEstado && texto === ultimoTexto) return ultimoEstado;
  let estado: Estado | null = null;
  try {
    const guardado = JSON.parse(texto ?? "null") as Estado | null;
    if (guardado && guardado.versao === VERSAO_PERMISSOES && Array.isArray(guardado.usuarios) && guardado.usuarios.length > 0) estado = guardado;
  } catch { /* dado ilegível: volta ao original */ }
  ultimoTexto = texto;
  ultimoEstado = estado ?? { versao: VERSAO_PERMISSOES, usuarios: usuariosOriginais() };
  sincronizar(ultimoEstado);
  return ultimoEstado;
}
export function salvarPermissoes(storage: Armazenamento, estado: Estado): void {
  storage.setItem(CHAVE_PERMISSOES, JSON.stringify(estado));
  avisar();
}
// Repõe usuários, exceções e o usuário ativo (Administrador) como no início.
export function restaurarPermissoes(storage: Armazenamento, avisarMudanca = true): Estado {
  const estado: Estado = { versao: VERSAO_PERMISSOES, usuarios: usuariosOriginais() };
  storage.setItem(CHAVE_PERMISSOES, JSON.stringify(estado));
  storage.setItem(CHAVE_USUARIO_ATIVO, USUARIO_PADRAO);
  if (avisarMudanca) avisar();
  return estado;
}
export function usuarioAtivo(storage: Armazenamento): Usuario {
  const estado = lerPermissoes(storage);
  const id = storage.getItem(CHAVE_USUARIO_ATIVO);
  return estado.usuarios.find((u) => u.id === id) ?? estado.usuarios[0]!;
}
export function definirUsuarioAtivo(storage: Armazenamento, id: string): void {
  storage.setItem(CHAVE_USUARIO_ATIVO, id);
  avisar();
}

// Marca ou desmarca uma ação do usuário. Marcar criar, editar ou excluir marca também "ver"; desmarcar "ver" desmarca as outras. Administrador não muda.
export function alternarAcao(estado: Estado, usuarioId: string, tela: string, acao: Acao, valor: boolean): Estado {
  return {
    ...estado,
    usuarios: estado.usuarios.map((u) => {
      if (u.id !== usuarioId || u.perfil === "admin") return u;
      const atual = efetivas(u)[tela] ?? {};
      const novo = { ...atual, [acao]: valor };
      if (acao === "ver" && !valor) for (const a of ACOES) novo[a] = false;
      if (acao !== "ver" && valor) novo.ver = true;
      const menu = SUBTELA_POR_ID.get(tela);
      // Exceções dos menus ficam como estão; a do módulo (ou a do menu mexido) é recalculada contra o padrão dele.
      const dosMenus = Object.fromEntries(Object.entries(u.excecoes).filter(([id]) => SUBTELA_POR_ID.has(id) && id !== tela));
      if (menu) {
        const pai = efetivas(u)[menu.pai] ?? {};
        const exc: Partial<Record<Acao, boolean>> = {};
        for (const a of ACOES) if (!!novo[a] !== (a === "ver" ? true : !!pai[a])) exc[a] = !!novo[a];
        const proprias = Object.fromEntries(Object.entries(u.excecoes).filter(([id]) => !SUBTELA_POR_ID.has(id)));
        return { ...u, excecoes: { ...proprias, ...dosMenus, ...(Object.keys(exc).length ? { [tela]: exc } : {}) } };
      }
      const desejada: Matriz = { ...efetivas(u), [tela]: novo };
      return { ...u, excecoes: { ...diferencaParaPerfil(u.perfil, desejada), ...dosMenus } };
    }),
  };
}
// Perfil próprio: nasce como cópia de outro perfil (a "base") e depois o Administrador ajusta as caixas por módulo.
export function criarPerfil(estado: Estado, nome: string, baseId: PerfilId): Estado {
  const base = padraoDe(baseId);
  const matriz: Matriz = Object.fromEntries(TELAS.map((t) => [t.id, { ...(base[t.id] ?? {}) }]));
  return { ...estado, perfis: [...(estado.perfis ?? []), { id: `perfil-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, nome: nome.trim(), matriz }] };
}
// Mesma regra da matriz dos usuários: marcar criar, editar ou excluir marca "ver"; desmarcar "ver" desmarca as outras.
export function alterarAcaoDoPerfil(estado: Estado, perfilId: string, tela: string, acao: Acao, valor: boolean): Estado {
  return {
    ...estado,
    perfis: (estado.perfis ?? []).map((p) => {
      if (p.id !== perfilId) return p;
      const novo: Partial<Record<Acao, boolean>> = { ...(p.matriz[tela] ?? {}), [acao]: valor };
      if (acao === "ver" && !valor) for (const a of ACOES) novo[a] = false;
      if (acao !== "ver" && valor) novo.ver = true;
      return { ...p, matriz: { ...p.matriz, [tela]: novo } };
    }),
  };
}
// Quem usava o perfil excluído volta ao Padrão, sem exceções.
export const excluirPerfil = (estado: Estado, perfilId: string): Estado => ({
  ...estado,
  perfis: (estado.perfis ?? []).filter((p) => p.id !== perfilId),
  usuarios: estado.usuarios.map((u) => (u.perfil === perfilId ? { ...u, perfil: "padrao", excecoes: {} } : u)),
});
export const mudarPerfil = (estado: Estado, usuarioId: string, perfil: PerfilId): Estado => ({
  ...estado, usuarios: estado.usuarios.map((u) => (u.id === usuarioId ? { ...u, perfil, excecoes: {} } : u)),
});
export const voltarAoPerfil = (estado: Estado, usuarioId: string): Estado => ({
  ...estado, usuarios: estado.usuarios.map((u) => (u.id === usuarioId ? { ...u, excecoes: {} } : u)),
});

export function pode(u: Usuario, tela: string | null, acao: Acao): boolean {
  return tela ? !!efetivas(u)[tela]?.[acao] : u.perfil === "admin";
}
const casa = (pathname: string, caminho: string) => pathname === caminho || pathname.startsWith(`${caminho}/`) || pathname.startsWith(`${caminho}-`);
// Tela da matriz a que o caminho pertence; null para as que não entram na matriz (início, Gerais, ocorrências...).
// Com `search` (?aba= ou ?de=), vale o menu mais específico da rota; sem menu que case, a tela do módulo. Numa rota de abas sem ?aba=, vale a primeira aba.
export function telaDaRota(pathname: string, search: Record<string, unknown> = {}): string | null {
  const achada = TELAS.flatMap((t) => t.caminhos.map((c) => ({ id: t.id, c }))).filter(({ c }) => casa(pathname, c)).sort((a, b) => b.c.length - a.c.length)[0];
  if (!achada) return null;
  const caminho = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const doModulo = SUBTELAS.filter((s) => s.pai === achada.id && (s.url === caminho || caminho.startsWith(`${s.url}/`)));
  const casaBusca = (s: SubTela) => !!s.search && Object.entries(s.search).every(([k, v]) => String(search[k] ?? "") === v);
  const exatos = doModulo.filter((s) => s.url === caminho);
  const candidatos = exatos.length > 0 ? exatos : doModulo;
  const menu = candidatos.find(casaBusca) ?? candidatos.find((s) => !s.search) ?? (Object.keys(search).length === 0 ? candidatos.find((s) => s.secao === "Módulo") : undefined);
  return menu?.id ?? achada.id;
}
export const telaDaTabela = (tabela: string): TelaId | null => TELAS.find((t) => (t.tabelas as readonly string[]).includes(tabela))?.id ?? null;
export const telaDoModulo = (modulo: unknown): TelaId | null => (modulo === "epi" ? "epi" : modulo === "uniforme" ? "uniformes" : modulo === "ferramenta" ? "ferramentas" : null);
// Gerais e as rotinas administrativas fora da matriz são só do Administrador.
export const rotaSoAdministrador = (pathname: string): boolean => casa(pathname, "/cadastros/gerais") || casa(pathname, "/usuarios");

// Recusa a gravação pedida ao cliente de demonstração quando o usuário ativo não tem a ação na tela da tabela.
export function recusaGravacao(storage: Armazenamento, tabela: string, acao: "insert" | "update" | "delete", linhas: unknown): string | null {
  const modulo = tabela === "movimentacoes" ? (Array.isArray(linhas) ? (linhas[0] as { modulo?: unknown } | undefined)?.modulo : (linhas as { modulo?: unknown } | null)?.modulo) : null;
  const tela = tabela === "movimentacoes" ? telaDoModulo(modulo) : telaDaTabela(tabela);
  if (!tela) return null;
  const u = usuarioAtivo(storage);
  const quer: Acao = acao === "insert" ? "criar" : acao === "update" ? "editar" : "excluir";
  return pode(u, tela, quer) ? null : `Sem permissão: ${u.nome} não pode ${quer} em ${TELAS.find((t) => t.id === tela)!.nome}.`;
}

function avisar(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO_PERMISSOES));
}
// Para a tela reagir: a assinatura avisa quando algo muda (nesta aba, pelo evento; em outra aba, pelo evento de armazenamento).
export function assinarPermissoes(aoMudar: () => void): () => void {
  window.addEventListener(EVENTO_PERMISSOES, aoMudar);
  window.addEventListener("storage", aoMudar);
  return () => { window.removeEventListener(EVENTO_PERMISSOES, aoMudar); window.removeEventListener("storage", aoMudar); };
}
export const fotografiaPermissoes = (storage: Armazenamento): string => `${storage.getItem(CHAVE_PERMISSOES) ?? ""}|${storage.getItem(CHAVE_USUARIO_ATIVO) ?? ""}`;
