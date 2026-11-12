// Tela inicial (Início): o menu em cartões. Só dados: a tela desenha. Cartão com submenus se abre no próprio cartão e mostra os
// atalhos; cartão sem submenu abre a tela direto. Os submenus saem dos mesmos dados do menu (menu-parametros.ts), sem lista paralela.
import {
  ABAS_EPI, ABAS_EPI_RELATORIOS, ABAS_EQUIPAMENTO, ABAS_FERRAMENTA, ABAS_FERRAMENTA_RELATORIOS, ABAS_UNIFORME, ABAS_UNIFORME_RELATORIOS, ABAS_VEICULO, ABAS_VIAGEM, MENU_EPI, MENU_FERRAMENTAS, MENU_GERAIS, MENU_UNIFORMES,
  MENU_EQUIPAMENTOS, MENU_VEICULOS, MENU_VIAGENS, type AbaMenu, type GrupoMenu, type ItemComFilhos, type ItemMenu, type NomeIcone,
} from "./menu-parametros.ts";

export type IconeInicio =
  | "LayoutDashboard" | "HardHat" | "Shirt" | "Wrench" | "Car" | "Luggage" | "Forklift"
  | "FolderCog" | "Building2" | "Users" | "Truck" | "Handshake";

// Cada atalho é do módulo (a rotina do dia a dia) ou dos parâmetros (o cadastro que a alimenta); o cartão mostra os dois separados.
export type SecaoInicio = "Módulo" | "Relatórios" | "Parâmetros";
// Atalho dentro de um cartão: a tela, com ?aba= ou ?de= quando o menu lateral também levava (decisões 43 e 86).
export type SubitemInicio = { titulo: string; url: string; icone: NomeIcone; secao: SecaoInicio; search?: Record<string, string>; soAdmin?: boolean };
// Ou `url` (abre a tela direto) ou `itens` (abre a lista de atalhos no cartão).
export type CartaoInicio = { titulo: string; icone: IconeInicio; soAdmin?: boolean; url?: string; itens?: readonly SubitemInicio[] };
export type GrupoInicio = { titulo: string; cartoes: readonly CartaoInicio[] };

const dasAbas = (url: string, abas: readonly AbaMenu[], secao: SecaoInicio = "Módulo"): SubitemInicio[] =>
  abas.map((a) => ({ titulo: a.titulo, url, icone: a.icone, secao, search: { aba: a.aba }, ...(a.soAdmin ? { soAdmin: true } : {}) }));

const doItem = (i: ItemMenu): SubitemInicio => {
  const search = i.search ?? (i.de ? { de: i.de } : undefined);
  return { titulo: i.titulo, url: i.url, icone: i.icone, secao: "Parâmetros", ...(search ? { search } : {}), ...(i.soAdmin ? { soAdmin: true } : {}) };
};
// Itens do menu na ordem da tela; os filhos (como Cadastrar Ficha de EPI) vêm logo depois do pai.
const dosItens = (itens: readonly (ItemComFilhos | GrupoMenu)[]): SubitemInicio[] =>
  itens.flatMap((i) => ("url" in i ? [doItem(i), ...(i.filhos ?? []).map(doItem)] : i.filhos.map(doItem)));

// Cada área tem um cartão só, com os atalhos do módulo e os dos parâmetros dela (Gerais só tem parâmetros).
export const GRUPOS_INICIO: readonly GrupoInicio[] = [
  { titulo: "Visão geral", cartoes: [{ titulo: "Dashboard", url: "/dashboard", icone: "LayoutDashboard" }] },
  {
    titulo: "Módulos",
    cartoes: [
      { titulo: "EPIs", icone: "HardHat", itens: [...dasAbas("/epi", ABAS_EPI), ...dasAbas("/epi", ABAS_EPI_RELATORIOS, "Relatórios"), ...dosItens(MENU_EPI)] },
      { titulo: "Uniformes", icone: "Shirt", itens: [...dasAbas("/uniformes", ABAS_UNIFORME), ...dasAbas("/uniformes", ABAS_UNIFORME_RELATORIOS, "Relatórios"), ...dosItens(MENU_UNIFORMES)] },
      { titulo: "Ferramentas", icone: "Wrench", itens: [...dasAbas("/ferramentas", ABAS_FERRAMENTA), ...dasAbas("/ferramentas", ABAS_FERRAMENTA_RELATORIOS, "Relatórios"), ...dosItens(MENU_FERRAMENTAS)] },
      { titulo: "Veículos", icone: "Car", itens: [...dasAbas("/veiculos", ABAS_VEICULO), ...dosItens(MENU_VEICULOS)] },
      { titulo: "Viagens", icone: "Luggage", itens: [...dasAbas("/viagens", ABAS_VIAGEM), ...dosItens(MENU_VIAGENS)] },
      {
        titulo: "Equipamentos", icone: "Forklift",
        itens: [...dasAbas("/equipamentos", ABAS_EQUIPAMENTO), ...dosItens(MENU_EQUIPAMENTOS)],
      },
    ],
  },
  {
    titulo: "Cadastros",
    cartoes: [
      { titulo: "Gerais", icone: "FolderCog", soAdmin: true, itens: dosItens(MENU_GERAIS) },
      { titulo: "Empresas", icone: "Building2", url: "/empresas" },
      { titulo: "Empregados", icone: "Users", url: "/empregados" },
      { titulo: "Fornecedores", icone: "Truck", url: "/cadastros/fornecedores" },
      { titulo: "Clientes", icone: "Handshake", url: "/cadastros/clientes" },
    ],
  },
];

// Os cartões e atalhos que o perfil pode ver (Gerais e Cadastrar Caixa são só do Administrador, como no menu lateral).
// `podeVer` (só no demo, pelas permissões de Configurações) tira cartões e atalhos de telas que o usuário não pode ver; cartão que fica sem atalhos some.
export function gruposDoInicio(isAdmin: boolean, podeVer: (url: string, search?: Record<string, string>) => boolean = () => true): GrupoInicio[] {
  return GRUPOS_INICIO.map((g) => ({
    ...g,
    cartoes: g.cartoes
      .filter((c) => !c.soAdmin || isAdmin)
      .map((c) => (c.itens ? { ...c, itens: c.itens.filter((i) => (!i.soAdmin || isAdmin) && podeVer(i.url, i.search)) } : c))
      .filter((c) => (c.itens ? c.itens.length > 0 : !c.url || podeVer(c.url))),
  })).filter((g) => g.cartoes.length > 0);
}

// Caminho mostrado no alto de toda página (decisão 314): o card e, depois, se a tela é do Módulo ou dos Parâmetros dele; o título grande da página é o menu aberto.
// Ex.: "Veículos › Parâmetros" sobre "Tipos de ocorrência", ou "Veículos › Módulo" sobre "Frota".
export const caminhoDoCard = (card: string, secao: SecaoInicio): string => `${card} › ${secao}`;

// Área (cartão) a que uma tela pertence, para o menu do topo levar às outras rotinas dela sem voltar ao início. Telas repetidas
// em mais de uma área (como Parâmetros Específicos) se resolvem pelo ?de= ou ?aba= do atalho; sem cartão com submenu, devolve null.
export function areaDaRota(pathname: string, search: Record<string, unknown>, isAdmin: boolean, podeVer: (url: string, search?: Record<string, string>) => boolean = () => true): { cartao: CartaoInicio; atual: SubitemInicio } | null {
  const caminho = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const casaBusca = (i: SubitemInicio) => !!i.search && Object.entries(i.search).every(([k, v]) => String(search[k] ?? "") === v);
  const candidatos = gruposDoInicio(isAdmin, podeVer).flatMap((g) => g.cartoes).flatMap((cartao) =>
    (cartao.itens ?? []).map((atual) => ({ cartao, atual })),
  );
  const daUrl = candidatos.filter((c) => c.atual.url === caminho);
  const subrotas = candidatos.filter((c) => caminho.startsWith(`${c.atual.url}/`));
  const achados = daUrl.length > 0 ? daUrl : subrotas;
  return achados.find((c) => casaBusca(c.atual)) ?? achados.find((c) => !c.atual.search) ?? achados[0] ?? null;
}

// Busca rápida da tela inicial: acha qualquer função de qualquer módulo sem abrir os cartões. Ignora acentos e maiúsculas; todas as palavras digitadas
// precisam aparecer no nome do atalho, do cartão ou da seção; o que começa pelo que foi digitado vem primeiro.
export type ResultadoBusca = { titulo: string; cartao: string; secao: SecaoInicio | null; url: string; search?: Record<string, string> };

const semAcento = (t: string): string => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export function buscarAtalhos(grupos: readonly GrupoInicio[], termo: string, limite = 8): ResultadoBusca[] {
  const palavras = semAcento(termo).split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return [];
  const achados: { r: ResultadoBusca; nota: number; ordem: number }[] = [];
  let ordem = 0;
  const considera = (r: ResultadoBusca) => {
    const titulo = semAcento(r.titulo);
    const todo = `${titulo} ${semAcento(r.cartao)} ${r.secao ? semAcento(r.secao) : ""}`;
    if (!palavras.every((p) => todo.includes(p))) return;
    const nota = titulo.startsWith(palavras[0] ?? "") ? 0 : titulo.includes(palavras[0] ?? "") ? 1 : 2;
    achados.push({ r, nota, ordem: ordem++ });
  };
  for (const g of grupos) {
    for (const c of g.cartoes) {
      if (c.url) considera({ titulo: c.titulo, cartao: c.titulo, secao: null, url: c.url });
      for (const i of c.itens ?? []) considera({ titulo: i.titulo, cartao: c.titulo, secao: i.secao, url: i.url, ...(i.search ? { search: i.search } : {}) });
    }
  }
  return achados.sort((a, b) => a.nota - b.nota || a.ordem - b.ordem).slice(0, limite).map((a) => a.r);
}

// Cartões abertos na tela inicial, lembrados neste navegador (chave `grupo/cartão`). Sem armazenamento ou com dado ilegível, tudo começa recolhido.
export const CHAVE_ABERTOS = "gemape-inicio-abertos";

export function lerAbertos(): Set<string> {
  try {
    const bruto: unknown = JSON.parse(globalThis.localStorage?.getItem(CHAVE_ABERTOS) ?? "[]");
    return new Set(Array.isArray(bruto) ? bruto.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

export function guardarAbertos(abertos: ReadonlySet<string>): void {
  try {
    globalThis.localStorage?.setItem(CHAVE_ABERTOS, JSON.stringify([...abertos]));
  } catch {
    // armazenamento cheio ou bloqueado: a tela segue funcionando, só não lembra
  }
}
