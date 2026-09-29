// Leitura do XML da NF-e (layout 4.00) no navegador, sem enviar o arquivo a lugar nenhum.
// Extrai o emitente e os itens para o cadastro de Código de Fábrica.

export type ItemNfe = {
  numero: number;
  codigo: string; // cProd: código do item no fornecedor
  descricao: string; // xProd
  ean: string;
  ncm: string;
  unidade: string;
  quantidade: string;
  ca: string; // número do CA, quando a nota informa na descrição ou em infAdProd
};

export type NotaNfe = {
  chave: string;
  numero: string;
  serie: string;
  emissao: string;
  emitente: { cnpj: string; nome: string };
  itens: ItemNfe[];
};

const ENTIDADES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const decodificar = (v: string) =>
  v
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (todo, e: string) => {
      if (e[0] === "#") return String.fromCodePoint(e[1]?.toLowerCase() === "x" ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
      return ENTIDADES[e.toLowerCase()] ?? todo;
    })
    .trim();

// Aceita prefixo de namespace (ex.: <nfe:xProd>) e atributos na tag de abertura.
const bloco = (xml: string, tag: string) =>
  xml.match(new RegExp(`<(?:[\\w-]+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w-]+:)?${tag}>`))?.[1] ?? "";
const blocos = (xml: string, tag: string) =>
  [...xml.matchAll(new RegExp(`<(?:[\\w-]+:)?${tag}(\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w-]+:)?${tag}>`, "g"))]
    .map((m) => ({ atributos: m[1] ?? "", conteudo: m[2] ?? "" }));
const campo = (xml: string, tag: string) => decodificar(bloco(xml, tag));

// "CA 12345", "C.A.: 12345", "CA nº 12345" etc. Exige o CA como palavra isolada.
export function extrairCa(texto: string): string {
  // O "N" só conta como "número" com º, ponto ou espaço antes dos dígitos, para não ler "CANO 400" como CA.
  return texto.match(/(?:^|[^\p{L}\d])C\.?\s?A\.?\s*(?:N(?:\s?[º°]|o?\.|\s+(?=\d))\s*)?[:\-]?\s*(\d{3,6})(?!\d)/iu)?.[1] ?? "";
}

export function lerNfe(xml: string): NotaNfe {
  const infNFe = blocos(xml, "infNFe")[0];
  if (!infNFe) throw new Error("O arquivo não é um XML de NF-e.");
  const chave = infNFe.atributos.match(/Id\s*=\s*"NFe(\d{44})"/)?.[1] ?? "";
  const ide = bloco(infNFe.conteudo, "ide");
  const emit = bloco(infNFe.conteudo, "emit");
  const itens = blocos(infNFe.conteudo, "det").map(({ atributos, conteudo }, i) => {
    const prod = bloco(conteudo, "prod");
    const descricao = campo(prod, "xProd");
    const adicional = campo(conteudo, "infAdProd");
    return {
      numero: Number(atributos.match(/nItem\s*=\s*"(\d+)"/)?.[1] ?? i + 1),
      codigo: campo(prod, "cProd"),
      descricao,
      ean: campo(prod, "cEAN").replace(/^SEM GTIN$/i, ""),
      ncm: campo(prod, "NCM"),
      unidade: campo(prod, "uCom"),
      quantidade: campo(prod, "qCom"),
      ca: extrairCa(`${descricao} ${adicional}`),
    };
  });
  if (itens.length === 0) throw new Error("A nota não tem itens.");
  if (itens.some((i) => !i.codigo)) throw new Error("Há item sem código do produto (cProd) na nota.");
  return {
    chave,
    numero: campo(ide, "nNF"),
    serie: campo(ide, "serie"),
    emissao: campo(ide, "dhEmi").slice(0, 10),
    emitente: { cnpj: campo(emit, "CNPJ") || campo(emit, "CPF"), nome: campo(emit, "xNome") },
    itens,
  };
}
