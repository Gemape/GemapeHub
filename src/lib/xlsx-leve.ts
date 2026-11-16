// Leitor mínimo de .xlsx (primeira planilha, só valores) sem biblioteca: o .xlsx é um zip de XMLs, e o navegador já
// descompacta (DecompressionStream "deflate-raw") e lê XML (DOMParser). Fórmulas entram pelo último valor calculado.
// shortcut: não lê datas formatadas como texto do Excel (vêm como número de série; corrigirData converte) nem planilhas além da primeira.

type Entrada = { nome: string; metodo: number; tamanho: number; inicio: number };

function entradasDoZip(b: DataView): Entrada[] {
  let fim = -1;
  for (let i = b.byteLength - 22; i >= Math.max(0, b.byteLength - 66_000); i--) {
    if (b.getUint32(i, true) === 0x06054b50) { fim = i; break; }
  }
  if (fim < 0) throw new Error("O arquivo não é uma planilha .xlsx válida.");
  const total = b.getUint16(fim + 10, true);
  let p = b.getUint32(fim + 16, true);
  const lista: Entrada[] = [];
  const texto = new TextDecoder();
  for (let n = 0; n < total; n++) {
    if (b.getUint32(p, true) !== 0x02014b50) break;
    const metodo = b.getUint16(p + 10, true);
    const tamanho = b.getUint32(p + 20, true);
    const lNome = b.getUint16(p + 28, true), lExtra = b.getUint16(p + 30, true), lComent = b.getUint16(p + 32, true);
    const local = b.getUint32(p + 42, true);
    const nome = texto.decode(new Uint8Array(b.buffer, b.byteOffset + p + 46, lNome));
    const inicio = local + 30 + b.getUint16(local + 26, true) + b.getUint16(local + 28, true);
    lista.push({ nome, metodo, tamanho, inicio });
    p += 46 + lNome + lExtra + lComent;
  }
  return lista;
}

async function conteudo(bytes: Uint8Array, e: Entrada): Promise<string> {
  const dados = bytes.subarray(e.inicio, e.inicio + e.tamanho);
  if (e.metodo === 0) return new TextDecoder().decode(dados);
  if (e.metodo !== 8) throw new Error("Compressão da planilha não suportada.");
  const fluxo = new Blob([new Uint8Array(dados)]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(fluxo).text();
}

const colunaDe = (ref: string) => [...(ref.match(/^[A-Z]+/)?.[0] ?? "A")].reduce((t, c) => t * 26 + c.charCodeAt(0) - 64, 0) - 1;

/** Linhas da primeira planilha do .xlsx, como texto (células vazias = ""). */
export async function lerXlsx(arquivo: ArrayBuffer): Promise<string[][]> {
  const bytes = new Uint8Array(arquivo);
  const entradas = entradasDoZip(new DataView(arquivo));
  const achar = (nome: string) => entradas.find((e) => e.nome === nome);
  const folha = achar("xl/worksheets/sheet1.xml") ?? entradas.filter((e) => /^xl\/worksheets\/sheet\d+\.xml$/.test(e.nome)).sort((a, b) => a.nome.localeCompare(b.nome, "en", { numeric: true }))[0];
  if (!folha) throw new Error("A planilha não tem nenhuma aba com dados.");
  const xml = (s: string) => new DOMParser().parseFromString(s, "application/xml");
  const compartilhadas = achar("xl/sharedStrings.xml");
  const textos = compartilhadas
    ? Array.from(xml(await conteudo(bytes, compartilhadas)).getElementsByTagName("si")).map((si) => Array.from(si.getElementsByTagName("t")).map((t) => t.textContent ?? "").join(""))
    : [];
  const linhas: string[][] = [];
  for (const row of Array.from(xml(await conteudo(bytes, folha)).getElementsByTagName("row"))) {
    // A linha vai para o número dela na planilha (r="5"): as em branco no meio ficam vazias e o número bate com o do Excel.
    const numero = Number(row.getAttribute("r"));
    while (Number.isFinite(numero) && numero > 0 && linhas.length < numero - 1) linhas.push([]);
    const linha: string[] = [];
    for (const c of Array.from(row.getElementsByTagName("c"))) {
      const tipo = c.getAttribute("t");
      const v = c.getElementsByTagName("v")[0]?.textContent ?? "";
      const valor = tipo === "s" ? (textos[Number(v)] ?? "") : tipo === "inlineStr" ? Array.from(c.getElementsByTagName("t")).map((t) => t.textContent ?? "").join("") : tipo === "b" ? (v === "1" ? "VERDADEIRO" : "FALSO") : v;
      // Sem a referência (r="B2", opcional no formato), a célula é a seguinte da linha.
      const ref = c.getAttribute("r");
      const i = ref ? colunaDe(ref) : linha.length;
      while (linha.length < i) linha.push("");
      linha[i] = valor.trim();
    }
    linhas.push(linha.some((x) => x !== "") ? linha : []);
  }
  while (linhas.length > 0 && linhas[linhas.length - 1]!.length === 0) linhas.pop();
  return linhas;
}
