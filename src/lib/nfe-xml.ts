// Leitura do XML da NF-e (modelo 55, leiaute 4.00) sem biblioteca externa.
// O arquivo vem de fora e é entrada não confiável: DOCTYPE e ENTITY são recusados, só as
// entidades padrão do XML são decodificadas e todo texto lido é tratado como dado.

export type ItemNfe = {
  numero: number;
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
};

export type NotaFiscalXml = {
  chave: string;
  numero: string;
  serie: string;
  // Data de emissão no fuso de Brasília (AAAA-MM-DD).
  dataEmissao: string;
  emitente: { cnpj: string; nome: string; fantasia: string };
  destinatario: { cnpj: string; nome: string };
  itens: ItemNfe[];
};

type No = {
  nome: string;
  qualificado: string;
  atributos: Record<string, string>;
  filhos: No[];
  texto: string;
};

const ENTIDADES = new Map([
  ["lt", "<"],
  ["gt", ">"],
  ["amp", "&"],
  ["quot", '"'],
  ["apos", "'"],
]);
const ERRO_XML = "O arquivo não é um XML válido.";

function decodificar(texto: string): string {
  return texto.replace(/&([^;\s]*);?/g, (trecho, nome: string) => {
    if (!trecho.endsWith(";")) throw new Error(`${ERRO_XML} Há um "&" solto no texto.`);
    const padrao = ENTIDADES.get(nome);
    if (padrao !== undefined) return padrao;
    const numero = /^#x([0-9a-f]+)$/i.exec(nome)?.[1];
    const decimal = /^#(\d+)$/.exec(nome)?.[1];
    const codigo = numero ? parseInt(numero, 16) : decimal ? parseInt(decimal, 10) : NaN;
    // Caracteres que o XML não permite: nulo, controles (fora tab e quebras) e surrogates.
    const proibido =
      (codigo < 0x20 && codigo !== 0x9 && codigo !== 0xa && codigo !== 0xd) ||
      (codigo >= 0xd800 && codigo <= 0xdfff) ||
      codigo === 0xfffe ||
      codigo === 0xffff;
    if (Number.isNaN(codigo) || codigo > 0x10ffff || proibido) {
      throw new Error(`${ERRO_XML} A entidade "${trecho}" não é permitida.`);
    }
    return String.fromCodePoint(codigo);
  });
}

// Nome sem o prefixo de namespace (ex.: "nfe:prod" vira "prod").
const nomeLocal = (nome: string) => nome.slice(nome.indexOf(":") + 1);

function lerArvore(texto: string): No {
  if (/<!DOCTYPE|<!ENTITY/i.test(texto)) {
    throw new Error("O XML tem DOCTYPE ou ENTITY, que não são aceitos por segurança.");
  }
  const raiz: No = { nome: "#raiz", qualificado: "#raiz", atributos: {}, filhos: [], texto: "" };
  const pilha: No[] = [raiz];
  const marca =
    /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)\]\]>|<\/([^\s>]+)\s*>|<([^\s/>!?]+)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"<]*"|'[^'<]*'))*)\s*(\/?)>|<|([^<]+)/g;
  for (const m of texto.matchAll(marca)) {
    const [trecho, cdata, fecha, abre, atributos, autoFecha, conteudo] = m;
    const atual = pilha[pilha.length - 1] ?? raiz;
    if (cdata !== undefined) {
      if (pilha.length === 1) throw new Error(ERRO_XML);
      atual.texto += cdata;
    } else if (fecha !== undefined) {
      if (pilha.length === 1 || atual.qualificado !== fecha) throw new Error(ERRO_XML);
      pilha.pop();
    } else if (abre !== undefined) {
      const no: No = {
        nome: nomeLocal(abre),
        qualificado: abre,
        atributos: {},
        filhos: [],
        texto: "",
      };
      const vistos = new Set<string>();
      for (const a of (atributos ?? "").matchAll(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
        const nome = a[1] ?? "";
        if (vistos.has(nome)) throw new Error(`${ERRO_XML} O atributo "${nome}" está repetido.`);
        vistos.add(nome);
        no.atributos[nomeLocal(nome)] = decodificar(a[2] ?? a[3] ?? "");
      }
      atual.filhos.push(no);
      if (!autoFecha) pilha.push(no);
    } else if (conteudo !== undefined) {
      if (pilha.length === 1 && conteudo.trim()) throw new Error(ERRO_XML);
      atual.texto += decodificar(conteudo);
    } else if (trecho === "<") throw new Error(ERRO_XML);
  }
  const [documento, ...sobra] = raiz.filhos;
  if (pilha.length !== 1 || !documento || sobra.length > 0) throw new Error(ERRO_XML);
  return documento;
}

const filho = (no: No | undefined, nome: string) => no?.filhos.find((f) => f.nome === nome);
const filhos = (no: No | undefined, nome: string) =>
  no?.filhos.filter((f) => f.nome === nome) ?? [];
const texto = (no: No | undefined, nome: string) => filho(no, nome)?.texto.trim() ?? "";

function buscar(no: No, nome: string): No | undefined {
  if (no.nome === nome) return no;
  for (const f of no.filhos) {
    const achado = buscar(f, nome);
    if (achado) return achado;
  }
  return undefined;
}

// Só a notação decimal da NF-e (ex.: 10.0000): nada de hexadecimal, expoente ou Infinity.
function numero(valor: string, campo: string, item: number): number {
  const n = Number(valor);
  if (!/^-?\d+(\.\d+)?$/.test(valor) || !Number.isFinite(n)) {
    throw new Error(`O item ${item} da nota tem ${campo} inválido ("${valor}").`);
  }
  return n;
}

const DATA_HORA =
  /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(Z|[+-]\d{2}:\d{2}))?$/;

// Data no fuso de Brasília a partir da data e hora de emissão da nota (nunca a data UTC).
export function dataLocalBrasilia(valor: string): string {
  const v = valor.trim();
  const partes = DATA_HORA.exec(v);
  const [ano, mes, dia, hora = 0, minuto = 0, segundo = 0] = (partes?.slice(1, 7) ?? []).map((p) =>
    p === undefined ? undefined : Number(p),
  );
  const calendario = partes ? new Date(Date.UTC(ano ?? 0, (mes ?? 0) - 1, dia ?? 0)) : null;
  // A data precisa existir no calendário (sem 30/02 nem mês 13) e a hora ser válida.
  const valida =
    calendario !== null &&
    (ano ?? 0) >= 1 &&
    calendario.getUTCFullYear() === ano &&
    calendario.getUTCMonth() + 1 === mes &&
    calendario.getUTCDate() === dia &&
    hora <= 23 &&
    minuto <= 59 &&
    segundo <= 59;
  if (!valida) throw new Error(`A data de emissão da nota é inválida ("${valor}").`);
  if (!partes?.[4]) return v;
  const instante = new Date(v);
  // en-CA formata como AAAA-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instante);
}

export function lerXmlNfe(conteudo: string): NotaFiscalXml {
  const raiz = lerArvore(conteudo.replace(/^\uFEFF/, ""));
  const inf = buscar(raiz, "infNFe");
  if (!inf) throw new Error("O XML não é de uma NF-e: falta o bloco infNFe.");
  const ide = filho(inf, "ide");
  const emit = filho(inf, "emit");
  const dest = filho(inf, "dest");

  const chave =
    (inf.atributos["Id"] ?? "").replace(/^NFe/, "") || texto(buscar(raiz, "infProt"), "chNFe");
  if (!/^\d{44}$/.test(chave)) throw new Error("A chave de acesso da NF-e é inválida.");
  const numeroNota = texto(ide, "nNF");
  if (!numeroNota) throw new Error("O XML não traz o número da NF-e.");
  const cnpjEmitente = texto(emit, "CNPJ");
  if (!/^\d{14}$/.test(cnpjEmitente))
    throw new Error("O XML não traz o CNPJ do fornecedor (emitente).");
  const cnpjDestinatario = texto(dest, "CNPJ");
  if (!/^\d{14}$/.test(cnpjDestinatario)) {
    throw new Error("O XML não traz o CNPJ da empresa destinatária.");
  }

  const numeros = new Set<number>();
  const itens = filhos(inf, "det").map((det, i): ItemNfe => {
    const prod = filho(det, "prod");
    const n = Number(det.atributos["nItem"]) || i + 1;
    if (numeros.has(n)) throw new Error(`O item ${n} da nota está repetido.`);
    numeros.add(n);
    return {
      numero: n,
      codigo: texto(prod, "cProd"),
      descricao: texto(prod, "xProd"),
      unidade: texto(prod, "uCom"),
      quantidade: numero(texto(prod, "qCom"), "quantidade", n),
      valorUnitario: numero(texto(prod, "vUnCom"), "valor unitário", n),
      valorTotal: numero(texto(prod, "vProd"), "valor total", n),
    };
  });
  if (itens.length === 0) throw new Error("A NF-e não tem nenhum item.");

  return {
    chave,
    numero: numeroNota,
    serie: texto(ide, "serie"),
    dataEmissao: dataLocalBrasilia(texto(ide, "dhEmi") || texto(ide, "dEmi")),
    emitente: { cnpj: cnpjEmitente, nome: texto(emit, "xNome"), fantasia: texto(emit, "xFant") },
    destinatario: { cnpj: cnpjDestinatario, nome: texto(dest, "xNome") },
    itens,
  };
}
