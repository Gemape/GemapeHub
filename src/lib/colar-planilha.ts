// Colar direto do Excel: o Excel copia as células separadas por TAB e as linhas por quebra de linha (célula com quebra ou TAB vem entre aspas).
// Aqui o texto colado vira linhas de código + quantidade, já conferidas contra o cadastro, para o operador revisar antes de lançar.
import { combinaBuscaTolerante } from "./busca-tolerante.ts";

const semAcentoMinusculo = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

/** Texto colado → matriz de células. Aceita TAB (Excel), ponto e vírgula (CSV brasileiro) e aspas com quebra de linha dentro. */
export function lerColagem(texto: string): string[][] {
  const t = texto.replace(/\r\n?/g, "\n").replace(/\n+$/, "");
  if (!t.trim()) return [];
  const separador = t.includes("\t") ? "\t" : t.split("\n")[0]?.includes(";") ? ";" : "\t";
  const linhas: string[][] = [];
  let linha: string[] = [];
  let celula = "";
  let entreAspas = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i] as string;
    if (entreAspas) {
      if (c === '"' && t[i + 1] === '"') { celula += '"'; i++; }
      else if (c === '"') entreAspas = false;
      else celula += c;
    } else if (c === '"' && celula === "") entreAspas = true;
    else if (c === separador) { linha.push(celula.trim()); celula = ""; }
    else if (c === "\n") { linha.push(celula.trim()); linhas.push(linha); linha = []; celula = ""; }
    else celula += c;
  }
  linha.push(celula.trim());
  linhas.push(linha);
  return linhas.filter((l) => l.some((c) => c !== ""));
}

/** "1.234,5" e "1234.5" viram número; texto que não é número devolve null. */
export function lerNumero(texto: string): number | null {
  const limpo = texto.trim().replace(/\s/g, "");
  if (!/^-?\d{1,3}(\.\d{3})*(,\d+)?$|^-?\d+([.,]\d+)?$/.test(limpo)) return null;
  // Ponto seguido de exatamente 3 dígitos é milhar (1.200 = 1200); com vírgula, os pontos são milhar e a vírgula é decimal.
  const milhar = /,/.test(limpo) || /^-?\d{1,3}(\.\d{3})+$/.test(limpo);
  const n = Number(milhar ? limpo.replace(/\./g, "").replace(",", ".") : limpo.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export type ItemColavel = { id: string; codigo_sku?: string | null; nome: string };
export type LinhaColada = { linha: number; codigo: string; quantidade: number | null; item: ItemColavel | null; erro: string | null };

// Cabeçalho: texto sem número e sem dígito algum (códigos como FER-001 têm dígito), e só se houver linhas de dado depois dele.
// Assim uma linha de dado com a quantidade em branco ou escrita por extenso não some em silêncio: volta com o erro dela.
const ehCabecalho = (celulas: string[]): boolean => celulas.length > 0 && !celulas.some((c) => /\d/.test(c));

/**
 * Cada linha: código (ou nome) e quantidade, em qualquer ordem das duas primeiras colunas que tenham texto e número.
 * O item é achado pelo código exato; sem código igual, por nome (tolerante a erro). Linha com problema volta com `erro` em português.
 */
export function linhasDaColagem(texto: string, itens: readonly ItemColavel[]): LinhaColada[] {
  let matriz = lerColagem(texto);
  if (matriz.length > 1 && matriz[0] && ehCabecalho(matriz[0])) matriz = matriz.slice(1);
  const porCodigo = new Map(itens.filter((i) => i.codigo_sku).map((i) => [String(i.codigo_sku).trim().toLowerCase(), i]));
  return matriz.map((celulas, n) => {
    const posNumero = celulas.findIndex((c, k) => k > 0 && lerNumero(c) !== null);
    const idx = posNumero === -1 ? celulas.findIndex((c) => lerNumero(c) !== null) : posNumero;
    const quantidade = idx === -1 ? null : lerNumero(celulas[idx] as string);
    const codigo = (celulas.find((_, k) => k !== idx) ?? "").trim();
    const base = { linha: n + 1, codigo, quantidade };
    if (!codigo) return { ...base, item: null, erro: "Falta o código do item." };
    if (quantidade === null) return { ...base, item: null, erro: "Falta a quantidade." };
    if (!Number.isInteger(quantidade) || quantidade <= 0) return { ...base, item: null, erro: "A quantidade precisa ser um número inteiro maior que zero." };
    const exato = porCodigo.get(codigo.toLowerCase());
    if (exato) return { ...base, item: exato, erro: null };
    // Entrada de estoque não adivinha: só vale o código exato ou o nome inteiro igual. Parecido vira sugestão, nunca lançamento.
    const mesmoNome = itens.filter((i) => semAcentoMinusculo(i.nome) === semAcentoMinusculo(codigo));
    if (mesmoNome.length === 1) return { ...base, item: mesmoNome[0] as ItemColavel, erro: null };
    const parecidos = itens.filter((i) => combinaBuscaTolerante(codigo, i.nome, i.codigo_sku)).slice(0, 2);
    const dica = parecidos.length > 0 ? ` Você quis dizer ${parecidos.map((i) => `${i.codigo_sku ?? "sem código"} (${i.nome})`).join(" ou ")}?` : "";
    return { ...base, item: null, erro: `Item “${codigo}” não encontrado no cadastro.${dica}` };
  });
}

/** Junta linhas que repetem o mesmo item, somando as quantidades (colar a mesma peça duas vezes não lança duas entradas soltas). */
export function somarPorItem(linhas: readonly LinhaColada[]): { item: ItemColavel; quantidade: number }[] {
  const mapa = new Map<string, { item: ItemColavel; quantidade: number }>();
  for (const l of linhas) {
    if (l.erro || !l.item || l.quantidade === null) continue;
    const atual = mapa.get(l.item.id);
    if (atual) atual.quantidade += l.quantidade;
    else mapa.set(l.item.id, { item: l.item, quantidade: l.quantidade });
  }
  return [...mapa.values()];
}
