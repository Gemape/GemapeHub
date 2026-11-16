// Navegação "voltar para onde eu estava": a pilha de telas visitadas (com a rolagem de cada uma), a linha do tempo da sessão (os últimos 10 registros
// abertos) e a vizinhança de um registro dentro da lista em que foi aberto (anterior / próximo). Só dados e armazenamento: a tela desenha.
// Fica na sessão do navegador (some ao fechar a aba) e por usuário; sem armazenamento a navegação segue, só não lembra.
import { chaveDoAtalho } from "./atalhos-usuario.ts";

export type Pagina = { chave: string; rotulo: string; url: string; search?: Record<string, string>; rolagem: number };
export type RegistroSessao = { tipo: string; rotulo: string; url: string; search?: Record<string, string> };
export type ArmazenamentoSessao = Pick<Storage, "getItem" | "setItem">;

export const MAX_PILHA = 20;
export const MAX_SESSAO = 10;

export const chavePagina = (url: string, search?: Record<string, string>): string => chaveDoAtalho({ url, search });

function ler<T>(arm: ArmazenamentoSessao | undefined, chave: string): T[] {
  try {
    const bruto: unknown = JSON.parse(arm?.getItem(chave) ?? "[]");
    return Array.isArray(bruto) ? (bruto as T[]).filter((x) => !!x && typeof x === "object" && typeof (x as { url?: unknown }).url === "string") : [];
  } catch {
    return [];
  }
}
function guardar(arm: ArmazenamentoSessao | undefined, chave: string, valor: unknown): void {
  try {
    arm?.setItem(chave, JSON.stringify(valor));
  } catch {
    // armazenamento cheio ou bloqueado: segue sem lembrar
  }
}

const chavePilha = (dono: string) => `gemape-nav-pilha:${dono || "anonimo"}`;
const chaveSessao = (dono: string) => `gemape-nav-sessao:${dono || "anonimo"}`;

export const lerPilha = (arm: ArmazenamentoSessao | undefined, dono: string): Pagina[] => ler<Pagina>(arm, chavePilha(dono));

// Chegou a uma tela: entra no topo da pilha. Se já era a tela do topo (só mudou o rótulo, que pode chegar depois dos dados), atualiza o rótulo.
export function empurrarPagina(arm: ArmazenamentoSessao | undefined, dono: string, p: Omit<Pagina, "rolagem" | "chave">): Pagina[] {
  const pilha = lerPilha(arm, dono);
  const chave = chavePagina(p.url, p.search);
  const topo = pilha.at(-1);
  const nova: Pagina[] = topo?.chave === chave ? [...pilha.slice(0, -1), { ...topo, rotulo: p.rotulo }] : [...pilha, { ...p, chave, rolagem: 0 }].slice(-MAX_PILHA);
  guardar(arm, chavePilha(dono), nova);
  return nova;
}

// O rótulo melhora quando os dados chegam (nome do empregado, placa): atualiza só o rótulo da tela do topo.
export function rotularTopo(arm: ArmazenamentoSessao | undefined, dono: string, chave: string, rotulo: string): void {
  const pilha = lerPilha(arm, dono);
  const topo = pilha.at(-1);
  if (topo?.chave === chave && topo.rotulo !== rotulo) guardar(arm, chavePilha(dono), [...pilha.slice(0, -1), { ...topo, rotulo }]);
}

// Guarda a rolagem da tela do topo (chamada ao rolar e ao sair).
export function guardarRolagem(arm: ArmazenamentoSessao | undefined, dono: string, chave: string, y: number): void {
  const pilha = lerPilha(arm, dono);
  const topo = pilha.at(-1);
  if (!topo || topo.chave !== chave) return;
  guardar(arm, chavePilha(dono), [...pilha.slice(0, -1), { ...topo, rolagem: Math.max(0, Math.round(y)) }]);
}

// A tela de onde a pessoa veio: a mais recente da pilha que não é a atual (cada tela vira o topo ao chegar).
export function paginaAnterior(arm: ArmazenamentoSessao | undefined, dono: string, chaveAtual: string): Pagina | null {
  const pilha = lerPilha(arm, dono);
  const i = pilha.map((p) => p.chave).lastIndexOf(chaveAtual);
  const antes = i === -1 ? pilha : pilha.slice(0, i);
  return antes.at(-1) ?? null;
}

// Voltou para `destino`: tira da pilha a tela atual e tudo o que veio depois do destino, para o próximo "voltar" ir mais atrás.
export function recuarPara(arm: ArmazenamentoSessao | undefined, dono: string, destino: string): void {
  const pilha = lerPilha(arm, dono);
  const i = pilha.map((p) => p.chave).lastIndexOf(destino);
  if (i !== -1) guardar(arm, chavePilha(dono), pilha.slice(0, i + 1));
}

export const lerSessao = (arm: ArmazenamentoSessao | undefined, dono: string): RegistroSessao[] => ler<RegistroSessao>(arm, chaveSessao(dono));

// Registro específico aberto (ficha de um empregado, de um EPI, um veículo): vai para o começo, sem repetir; ficam os 10 últimos.
export function registrarNaSessao(arm: ArmazenamentoSessao | undefined, dono: string, r: RegistroSessao): RegistroSessao[] {
  const chave = chavePagina(r.url, r.search);
  const atuais = lerSessao(arm, dono);
  if (atuais[0] && chavePagina(atuais[0].url, atuais[0].search) === chave && atuais[0].rotulo === r.rotulo) return atuais;
  const novos = [r, ...atuais.filter((x) => chavePagina(x.url, x.search) !== chave)].slice(0, MAX_SESSAO);
  guardar(arm, chaveSessao(dono), novos);
  return novos;
}

// Anterior e próximo de um registro dentro da lista em que foi aberto (a lista como a tela a mostra: filtrada e ordenada). Fora da lista, nada.
export function vizinhosNaLista<T extends { id: string }>(lista: readonly T[], atualId: string): { anterior: T | null; proximo: T | null; posicao: number; total: number } | null {
  const i = lista.findIndex((x) => x.id === atualId);
  if (i === -1 || lista.length < 2) return null;
  return { anterior: lista[i - 1] ?? null, proximo: lista[i + 1] ?? null, posicao: i + 1, total: lista.length };
}
