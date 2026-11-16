// Importação assistida de planilhas antigas (CSV ou XLSX): lê as linhas, sugere o de-para das colunas com os campos do sistema
// e corrige a formatação mais comum (datas em qualquer formato, CPF sem pontos ou sem o zero da frente que o Excel come).

export type CampoDestino = { id: string; rotulo: string; sinonimos: readonly string[]; obrigatorio?: boolean };
/** Para cada campo do sistema, o índice da coluna da planilha (-1 = não importar). */
export type Mapeamento = Record<string, number>;

const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** CSV com ; , ou tabulação (o que mais aparecer no cabeçalho), com aspas e quebra de linha dentro de aspas. */
export function lerCsv(texto: string): string[][] {
  // Tira o BOM que o Excel põe no começo do CSV.
  const limpo = texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto;
  const primeira = limpo.split(/\r?\n/, 1)[0] ?? "";
  const sep = [";", "\t", ","].map((s) => [s, primeira.split(s).length] as const).sort((a, b) => b[1] - a[1])[0]![0];
  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = "";
  let aspas = false;
  for (let i = 0; i < limpo.length; i++) {
    const c = limpo[i]!;
    if (aspas) {
      if (c === '"' && limpo[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"' && campo === "") aspas = true;
    else if (c === sep) { linha.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && limpo[i + 1] === "\n") i++;
      linha.push(campo); linhas.push(linha); linha = []; campo = "";
    } else campo += c;
  }
  if (campo !== "" || linha.length > 0) { linha.push(campo); linhas.push(linha); }
  // Linhas em branco no meio ficam (vazias), para o número de cada linha bater com o da planilha; só as do fim saem.
  const limpas = linhas.map((l) => (linhaEmBranco(l) ? [] : l.map((v) => v.trim())));
  while (limpas.length > 0 && limpas[limpas.length - 1]!.length === 0) limpas.pop();
  return limpas;
}

export const linhaEmBranco = (l: readonly string[]) => l.every((v) => v.trim() === "");

/** Sugere a coluna de cada campo pelo nome do cabeçalho (igual, sinônimo ou contendo). Cada coluna serve a um campo só. */
export function sugerirMapeamento(cabecalhos: readonly string[], campos: readonly CampoDestino[]): Mapeamento {
  const cab = cabecalhos.map(sem);
  const usadas = new Set<number>();
  const m: Mapeamento = {};
  for (const passo of ["igual", "contem"] as const) {
    for (const campo of campos) {
      if ((m[campo.id] ?? -1) >= 0) continue;
      const nomes = [campo.rotulo, ...campo.sinonimos].map(sem);
      // "Contém" só com 3 letras ou mais dos dois lados: um cabeçalho curto como "Nº" não vira matrícula por ter um "n".
      const i = cab.findIndex((h, n) => !usadas.has(n) && h !== "" && nomes.some((x) => (passo === "igual" ? h === x : h.length >= 3 && x.length >= 3 && (h.includes(x) || x.includes(h)))));
      m[campo.id] = i;
      if (i >= 0) usadas.add(i);
    }
  }
  return m;
}

const doisDigitos = (n: number) => String(n).padStart(2, "0");
function dataValida(a: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(a, m - 1, d));
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? `${a}-${doisDigitos(m)}-${doisDigitos(d)}` : null;
}

/** Data em AAAA-MM-DD a partir de dd/mm/aaaa, d/m/aa, dd-mm-aaaa, aaaa-mm-dd ou número de série do Excel. Vazio → "", inválida → null. */
export function corrigirData(valor: string): string | null {
  const v = valor.trim();
  if (!v) return "";
  let r = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(v);
  if (r) return dataValida(+r[1]!, +r[2]!, +r[3]!);
  r = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(v);
  if (r) {
    const ano = r[3]!.length === 2 ? 2000 + +r[3]! - (+r[3]! > 50 ? 100 : 0) : +r[3]!;
    return dataValida(ano, +r[2]!, +r[1]!);
  }
  // Excel guarda a data como dias desde 30/12/1899.
  if (/^\d{4,6}(\.\d+)?$/.test(v)) {
    const dt = new Date(Date.UTC(1899, 11, 30) + Math.floor(+v) * 86_400_000);
    return dataValida(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }
  return null;
}

/** CPF com pontos e traço; devolve os zeros da frente que o Excel tira de "012.345.678-90" lido como número. */
export function corrigirCpf(valor: string): string {
  const d = valor.replace(/\D/g, "");
  if (d.length === 0 || d.length > 11) return valor.trim();
  const c = d.padStart(11, "0");
  return `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}`;
}

/** Valores de uma linha da planilha já com o de-para aplicado (campo do sistema → texto da célula). */
export function valoresDaLinha(linha: readonly string[], m: Mapeamento): Record<string, string> {
  return Object.fromEntries(Object.entries(m).map(([campo, i]) => [campo, i >= 0 ? (linha[i] ?? "").trim() : ""]));
}
