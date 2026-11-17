// Trilha de orientação no alto de toda tela interna (Início › área › tela). Só dados: a tela desenha.
// Dashboard e Início são a raiz e não têm trilha. Telas de cartão sem submenu (Empresas, Empregados...) e telas avulsas (Ocorrências, Relatórios, Usuários) também entram.
import { areaDaRota, gruposDoInicio } from "./inicio.ts";

export type NivelTrilha = { rotulo: string; url?: string; search?: Record<string, string> };

type Acesso = (url: string, search?: Record<string, string>) => boolean;

// Telas fora dos cartões: título da tela e o grupo a que pertencem na trilha.
const AVULSAS: Record<string, { grupo?: string; titulo: string }> = {
  "/ocorrencias": { titulo: "Ocorrências" },
  "/relatorios": { titulo: "Relatórios" },
  "/usuarios": { grupo: "Configurações", titulo: "Usuários" },
};

const semBarra = (p: string): string => (p.length > 1 ? p.replace(/\/+$/, "") : p);

// A rota é a própria tela ou uma subrota dela (/empresas/123).
const daTela = (caminho: string, url: string): boolean => caminho === semBarra(url) || caminho.startsWith(`${semBarra(url)}/`);

export function trilhaDaRota(pathname: string, search: Record<string, unknown>, isAdmin: boolean, podeVer: Acesso = () => true): NivelTrilha[] | null {
  const caminho = semBarra(pathname);
  if (caminho === "/inicio" || caminho === "/dashboard") return null;
  const inicio: NivelTrilha = { rotulo: "Início", url: "/inicio" };

  const area = areaDaRota(caminho, search, isAdmin, podeVer);
  if (area) {
    const { cartao, atual } = area;
    const primeiro = cartao.itens?.[0];
    const niveis: NivelTrilha[] = [inicio, primeiro && primeiro !== atual ? { rotulo: cartao.titulo, url: primeiro.url, ...(primeiro.search ? { search: primeiro.search } : {}) } : { rotulo: cartao.titulo }];
    if (atual.secao !== "Módulo") niveis.push({ rotulo: atual.secao });
    niveis.push({ rotulo: atual.titulo });
    return niveis;
  }

  for (const g of gruposDoInicio(isAdmin, podeVer)) {
    const cartao = g.cartoes.find((c) => c.url && daTela(caminho, c.url));
    if (cartao) return [inicio, { rotulo: g.titulo }, { rotulo: cartao.titulo }];
  }

  const avulsa = Object.entries(AVULSAS).find(([url]) => daTela(caminho, url))?.[1];
  if (avulsa) return [inicio, ...(avulsa.grupo ? [{ rotulo: avulsa.grupo }] : []), { rotulo: avulsa.titulo }];
  return null;
}

// Para onde o botão Voltar leva quando não há tela anterior na sessão (link aberto direto): o nível de cima da trilha que tem destino, ou o Início.
export function destinoPaiDaTrilha(niveis: readonly NivelTrilha[] | null): NivelTrilha {
  const pai = [...(niveis ?? [])].slice(0, -1).reverse().find((n) => n.url);
  return pai ?? { rotulo: "Início", url: "/inicio" };
}
