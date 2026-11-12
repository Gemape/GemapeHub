// Atalhos pessoais da tela inicial: os fixados (favoritos, com estrela) e os últimos acessados. Ficam neste navegador, um conjunto por usuário.
// Só dados e armazenamento: a tela desenha. Sem armazenamento (ou dado ilegível) a lista começa vazia e a tela segue funcionando.
import type { SecaoInicio } from "./inicio.ts";

export type AtalhoGuardado = { titulo: string; cartao: string; secao: SecaoInicio | null; url: string; search?: Record<string, string> };

export const MAX_RECENTES = 4;
export const MAX_FIXADOS = 8;

// Identidade de um atalho: a tela e o ?aba=/?de= que a abre.
export const chaveDoAtalho = (a: { url: string; search?: Record<string, string> | undefined }): string =>
  `${a.url}?${Object.entries(a.search ?? {}).sort(([x], [y]) => x.localeCompare(y)).map(([k, v]) => `${k}=${v}`).join("&")}`;

const chaveArmazenamento = (tipo: "fixados" | "recentes", usuario: string) => `gemape-inicio-${tipo}:${usuario || "anonimo"}`;

function ler(tipo: "fixados" | "recentes", usuario: string): AtalhoGuardado[] {
  try {
    const bruto: unknown = JSON.parse(globalThis.localStorage?.getItem(chaveArmazenamento(tipo, usuario)) ?? "[]");
    if (!Array.isArray(bruto)) return [];
    return bruto.filter((a): a is AtalhoGuardado => !!a && typeof a === "object" && typeof (a as AtalhoGuardado).url === "string" && typeof (a as AtalhoGuardado).titulo === "string" && typeof (a as AtalhoGuardado).cartao === "string");
  } catch {
    return [];
  }
}

function guardar(tipo: "fixados" | "recentes", usuario: string, lista: readonly AtalhoGuardado[]): void {
  try {
    globalThis.localStorage?.setItem(chaveArmazenamento(tipo, usuario), JSON.stringify(lista));
  } catch {
    // armazenamento cheio ou bloqueado: segue sem lembrar
  }
}

export const lerFixados = (usuario: string): AtalhoGuardado[] => ler("fixados", usuario);
export const lerRecentes = (usuario: string): AtalhoGuardado[] => ler("recentes", usuario);

// Estrela: fixa se ainda não está, tira se já está. Devolve a nova lista (já guardada). Passa do limite: sai o fixado mais antigo.
export function alternarFixado(usuario: string, atalho: AtalhoGuardado): AtalhoGuardado[] {
  const atuais = lerFixados(usuario);
  const chave = chaveDoAtalho(atalho);
  const novos = atuais.some((a) => chaveDoAtalho(a) === chave) ? atuais.filter((a) => chaveDoAtalho(a) !== chave) : [...atuais, atalho].slice(-MAX_FIXADOS);
  guardar("fixados", usuario, novos);
  return novos;
}

// Registra um acesso: vai para o começo, sem repetir, e só os últimos ficam. Devolve a lista (já guardada).
export function registrarRecente(usuario: string, atalho: AtalhoGuardado): AtalhoGuardado[] {
  const chave = chaveDoAtalho(atalho);
  const atuais = lerRecentes(usuario);
  if (atuais[0] && chaveDoAtalho(atuais[0]) === chave) return atuais;
  const novos = [atalho, ...atuais.filter((a) => chaveDoAtalho(a) !== chave)].slice(0, MAX_RECENTES);
  guardar("recentes", usuario, novos);
  return novos;
}
