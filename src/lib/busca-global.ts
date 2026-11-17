// Busca global do cabeçalho (Ctrl+K): acha empregado, veículo e item de estoque por nome, código, matrícula ou placa e leva direto à tela do item.
// Só dados: a tela desenha e confere a permissão de cada destino. Os resultados vêm agrupados por módulo.
export type DestinoBusca = { url: string; search: Record<string, string> };
export type ResultadoGlobal = { chave: string; titulo: string; detalhe: string; destino: DestinoBusca };
export type ModuloBusca = "Empregados" | "Veículos" | "EPIs" | "Uniformes" | "Ferramentas";
export type GrupoBusca = { modulo: ModuloBusca; itens: ResultadoGlobal[] };

type Empregado = { id: string; nome: string; empresa_id?: string | null; matricula?: string | null; ativo?: boolean | null; data_demissao?: string | null };
type Veiculo = { id: string; placa?: string | null; marca?: string | null; modelo?: string | null };
type Item = { id: string; nome: string; codigo_sku?: string | null; ca?: string | null; status?: string | null };

export type FontesBusca = {
  empregados?: readonly Empregado[];
  veiculos?: readonly Veiculo[];
  epis?: readonly Item[];
  uniformes?: readonly Item[];
  ferramentas?: readonly Item[];
};

const semAcento = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const palavras = (t: string) => semAcento(t).split(/[^a-z0-9]+/).filter(Boolean);
// Código, matrícula e placa: sem pontuação, hífen ou espaço ("abc-1d23" acha "ABC1D23"; "fer 007" acha "FER-007").
const compacto = (t: string) => semAcento(t).replace(/[^a-z0-9]/g, "");

// Texto livre (nome): todas as palavras digitadas começam alguma palavra do texto ("joao si" acha "João Silva").
const casaNome = (texto: string, termo: string[]) => {
  const alvo = palavras(texto);
  return termo.every((p) => alvo.some((a) => a.startsWith(p)));
};
// Identificador (código, matrícula, placa, CA): o que foi digitado aparece dentro dele. Com menos de 2 caracteres não casa, para não listar tudo.
const casaCodigo = (codigo: string | null | undefined, termo: string) => !!codigo && termo.length >= 2 && compacto(codigo).includes(termo);

export const MIN_BUSCA = 2;
export const LIMITE_POR_MODULO = 5;

export function buscarGlobal(termoBruto: string, f: FontesBusca, limite = LIMITE_POR_MODULO): GrupoBusca[] {
  const termo = palavras(termoBruto);
  const codigo = compacto(termoBruto);
  if (termoBruto.trim().length < MIN_BUSCA || termo.length === 0) return [];
  const grupos: GrupoBusca[] = [];
  const add = (modulo: ModuloBusca, itens: ResultadoGlobal[]) => { if (itens.length) grupos.push({ modulo, itens: itens.slice(0, limite) }); };

  add("Empregados", (f.empregados ?? []).filter((e) => casaNome(e.nome, termo) || casaCodigo(e.matricula, codigo)).map((e) => ({
    chave: `emp-${e.id}`,
    titulo: e.nome,
    detalhe: `${e.matricula ? `Matrícula ${e.matricula} · ` : ""}${e.ativo === false || e.data_demissao ? "Desligado" : "Ativo"}`,
    destino: { url: "/epi", search: { aba: "historico", ...(e.empresa_id ? { empresa: e.empresa_id } : {}), empregado: e.id } },
  })));

  add("Veículos", (f.veiculos ?? []).filter((v) => casaCodigo(v.placa, codigo) || casaNome(`${v.marca ?? ""} ${v.modelo ?? ""}`, termo)).map((v) => ({
    chave: `vei-${v.id}`,
    titulo: v.placa ? `Placa ${v.placa}` : "Veículo sem placa",
    detalhe: [v.marca, v.modelo].filter(Boolean).join(" ") || "Sem marca e modelo",
    destino: { url: "/veiculos", search: { aba: "frota", extrato: v.id } },
  })));

  const itens = (modulo: ModuloBusca, lista: readonly Item[] | undefined, url: string, comCa: boolean, comItem: boolean) =>
    add(modulo, (lista ?? []).filter((i) => i.status !== "Inativo" && (casaNome(i.nome, termo) || casaCodigo(i.codigo_sku, codigo) || (comCa && casaCodigo(i.ca, codigo)))).map((i) => ({
      chave: `${modulo}-${i.id}`,
      titulo: i.nome,
      detalhe: [i.codigo_sku, comCa ? (i.ca ? `CA ${i.ca}` : "sem CA") : null].filter(Boolean).join(" · ") || "Sem código",
      // Estoque já filtrado pelo item; a ferramenta ainda abre o extrato dela (?item=).
      destino: { url, search: { aba: "estoque", q: i.codigo_sku || i.nome, ...(comItem ? { item: i.id } : {}) } },
    })));
  itens("EPIs", f.epis, "/epi", true, false);
  itens("Uniformes", f.uniformes, "/uniformes", false, false);
  itens("Ferramentas", f.ferramentas, "/ferramentas", false, true);
  return grupos;
}
