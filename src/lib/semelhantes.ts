// Detector de semelhança: enquanto se digita o nome de um item ou empregado novo, acha os cadastros parecidos ("Luva Vaqueta" ≈ "Luva de Vaqueta G").
// Só avisa; quem realmente precisa criar um item novo segue em frente. Sem acento, sem ligações ("de", "com"...) e com tolerância a erro de digitação.
import { distancia } from "./busca-tolerante.ts";

const LIGACOES = new Set(["de", "da", "do", "das", "dos", "com", "para", "em", "e", "a", "o", "tipo", "cor", "tam", "tamanho"]);

const palavras = (s: string): string[] =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter((p) => p.length > 0 && !LIGACOES.has(p));

// Duas palavras são "a mesma" se iguais, uma começa pela outra (vaq ≈ vaqueta, a partir de 3 letras) ou diferem por 1 letra (a partir de 5 letras).
// Palavra com dígito (G, 42, CA 12345) só casa exata: tamanho e número diferentes são itens diferentes.
function mesmaPalavra(a: string, b: string, exata = false): boolean {
  if (a === b) return true;
  if (exata) return false;
  if (/\d/.test(a) || /\d/.test(b)) return false;
  if (a.length >= 3 && b.length >= 3 && (a.startsWith(b) || b.startsWith(a))) return true;
  return a.length >= 5 && b.length >= 5 && distancia(a, b, 1) <= 1;
}

export type Parecido<T> = { item: T; pontos: number };

/**
 * Cadastros parecidos com o nome digitado, do mais para o menos parecido (no máximo `max`).
 * Pontos = parte das palavras digitadas que acham par no cadastro; é preciso achar par em pelo menos `minimo` (padrão 0,6) delas.
 * Com uma palavra só (ex.: "luva") ela precisa aparecer inteira no cadastro (sem casar só pelo começo ou por erro de digitação).
 */
export function cadastrosParecidos<T extends { id: string; nome: string }>(
  digitado: string, cadastros: readonly T[], opcoes: { ignorarId?: string | null | undefined; max?: number; minimo?: number; exata?: boolean } = {},
): Parecido<T>[] {
  const alvo = [...new Set(palavras(digitado))];
  if (alvo.length === 0 || digitado.trim().length < 4) return [];
  const minimo = opcoes.minimo ?? 0.6;
  const achados: Parecido<T>[] = [];
  for (const c of cadastros) {
    if (opcoes.ignorarId && c.id === opcoes.ignorarId) continue;
    const deles = [...new Set(palavras(c.nome))];
    if (deles.length === 0) continue;
    const casaram = alvo.filter((p) => deles.some((q) => mesmaPalavra(p, q, opcoes.exata))).length;
    if (casaram / alvo.length < minimo) continue;
    if (alvo.length === 1 && !deles.includes(alvo[0] as string)) continue;
    // Quanto menos palavras sobrarem do outro lado, mais parecido: "Luva Vaqueta" ≈ "Luva de Vaqueta" mais que "Luva Vaqueta Petroleira Forrada".
    const sobra = Math.max(0, deles.length - casaram) * 0.05;
    achados.push({ item: c, pontos: Math.round((casaram / alvo.length - sobra) * 100) / 100 });
  }
  return achados.sort((a, b) => b.pontos - a.pontos || a.item.nome.localeCompare(b.item.nome, "pt-BR")).slice(0, opcoes.max ?? 3);
}
