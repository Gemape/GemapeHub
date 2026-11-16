// Consulta rápida em linguagem natural: entende poucas perguntas frequentes (quem está com uma ferramenta, o que vence em um período),
// explica o funcionamento do sistema (conhecimento-sistema.ts) e responde com o texto e o link direto da tela. Sem serviço externo nem IA: regras simples, sobre os dados que a tela já leu.
import { responderSobreSistema } from "./conhecimento-sistema.ts";
import { emPosseEpi, type MovimentacaoEpi } from "./entrega-epi.ts";

export type LinkConsulta = { rotulo: string; url: string; search?: Record<string, string> };
export type RespostaConsulta = { texto: string; links: LinkConsulta[] };
export type ItemConsulta = { id: string; nome: string; codigo_sku?: string | null; patrimonio?: string | null; ca_validade?: string | null; data_validade?: string | null };
export type ContextoConsulta = {
  hoje: string;
  ferramentas: readonly ItemConsulta[];
  movimentosFerramenta: readonly MovimentacaoEpi[];
  epis: readonly ItemConsulta[];
  uniformes: readonly ItemConsulta[];
  empregados: readonly { id: string; nome: string }[];
};

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const palavras = (t: string) => semAcento(t).split(/[^a-z0-9]+/).filter(Boolean);
const ARTIGOS = new Set(["a", "o", "as", "os", "um", "uma", "da", "do", "das", "dos", "de", "na", "no"]);

// Soma `dias` a uma data AAAA-MM-DD, sem depender do fuso do aparelho.
export function somarDias(data: string, dias: number): string {
  const [a = 0, m = 1, d = 1] = data.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

// Todas as palavras do termo precisam aparecer no nome, código ou patrimônio (então "furadeira 04" acha "Furadeira de impacto 04").
function acha(item: ItemConsulta, termo: string[]): boolean {
  const texto = palavras(`${item.nome} ${item.codigo_sku ?? ""} ${item.patrimonio ?? ""}`);
  // Prefixo e plural simples: "furad" e "furadeiras" acham "Furadeira".
  return termo.every((p) => texto.some((t) => t.startsWith(p) || (p.length > 3 && p.endsWith("s") && t.startsWith(p.slice(0, -1)))));
}

function quemEstaCom(termoBruto: string, ctx: ContextoConsulta): RespostaConsulta {
  const termo = palavras(termoBruto).filter((p) => !ARTIGOS.has(p));
  if (!termo.length) return { texto: "Diga qual ferramenta procura, por exemplo: “Quem está com a furadeira 04?”.", links: [] };
  const achadas = ctx.ferramentas.filter((f) => acha(f, termo)).slice(0, 5);
  if (!achadas.length) return { texto: `Não encontrei ferramenta parecida com “${termoBruto.trim()}”.`, links: [{ rotulo: "Ver ferramentas", url: "/ferramentas", search: { aba: "estoque" } }] };
  const nomeDe = (id: string) => ctx.empregados.find((e) => e.id === id)?.nome ?? "empregado desconhecido";
  const linhas = achadas.map((f) => {
    const ids = [...new Set(ctx.movimentosFerramenta.filter((m) => m.item_id === f.id && m.empregado_id).map((m) => m.empregado_id as string))];
    const donos = ids.map((e) => ({ e, q: emPosseEpi(ctx.movimentosFerramenta, e, f.id, null) })).filter((x) => x.q > 0);
    return `${f.nome}${f.codigo_sku ? ` (${f.codigo_sku})` : ""}: ${donos.length ? donos.map((x) => `${nomeDe(x.e)}${x.q > 1 ? ` (${x.q})` : ""}`).join(", ") : "ninguém, está no estoque"}`;
  });
  return { texto: linhas.join("\n"), links: [{ rotulo: "Histórico de ferramentas", url: "/ferramentas", search: { aba: "historico" } }] };
}

// Período dito na pergunta: hoje, semana (7 dias), mês (30). Sem período, só o que já venceu.
function periodo(p: string, hoje: string): { fim: string; nome: string } {
  const dias = p.match(/(\d+)\s*dias?/);
  if (dias?.[1]) return { fim: somarDias(hoje, Number(dias[1])), nome: `nos próximos ${dias[1]} dias` };
  if (/\bamanha\b/.test(p)) return { fim: somarDias(hoje, 1), nome: "até amanhã" };
  if (/quinzena/.test(p)) return { fim: somarDias(hoje, 15), nome: "nos próximos 15 dias" };
  if (/\bhoje\b/.test(p)) return { fim: hoje, nome: "hoje" };
  if (/\bsemana\b/.test(p)) return { fim: somarDias(hoje, 7), nome: "nos próximos 7 dias" };
  if (/\bmes\b/.test(p)) return { fim: somarDias(hoje, 30), nome: "nos próximos 30 dias" };
  return { fim: somarDias(hoje, -1), nome: "" };
}

function vencimentos(p: string, ctx: ContextoConsulta): RespostaConsulta {
  const uniforme = /uniforme/.test(p);
  const lista = uniforme ? ctx.uniformes : ctx.epis;
  const { fim, nome } = periodo(p, ctx.hoje);
  const datas = (i: ItemConsulta) => [i.ca_validade, i.data_validade].filter((d): d is string => !!d).map((d) => d.slice(0, 10));
  const achados = lista.filter((i) => datas(i).some((d) => d <= fim)).sort((a, b) => (datas(a)[0] ?? "").localeCompare(datas(b)[0] ?? ""));
  const rotulo = uniforme ? "uniformes" : "EPIs";
  const link: LinkConsulta = { rotulo: uniforme ? "Estoque de uniformes" : "Estoque de EPIs", url: uniforme ? "/uniformes" : "/epi", search: { aba: "estoque" } };
  if (!achados.length) return { texto: `Nenhum dos ${rotulo} ${nome ? `vence ${nome}` : "tem validade vencida"}.`, links: [link] };
  const txt = achados.slice(0, 8).map((i) => {
    const d = datas(i).find((x) => x <= fim) ?? "";
    return `${i.nome} — ${d < ctx.hoje ? "venceu" : "vence"} em ${d.split("-").reverse().join("/")}`;
  });
  const mais = achados.length > 8 ? `\n… e mais ${achados.length - 8}.` : "";
  return { texto: `${achados.length} ${rotulo} ${nome ? `vencidos ou vencendo ${nome}` : "já vencidos"}:\n${txt.join("\n")}${mais}`, links: [link] };
}

export function responderConsulta(pergunta: string, ctx: ContextoConsulta): RespostaConsulta | null {
  const p = semAcento(pergunta).trim();
  if (!p) return null;
  const quem = p.match(/^(?:quem|com quem)\s+(?:esta|ta|tem|ficou|levou|pegou)\s+(?:com\s+)?(.+?)\??$/);
  if (quem?.[1]) return quemEstaCom(quem[1], ctx);
  if (/(venc|expir|validade)/.test(p) && /(epi|uniforme|\bca\b)/.test(p)) return vencimentos(p, ctx);
  // Perguntas sobre o funcionamento do sistema ("como entregar EPI?"): respondidas pela base de conhecimento.
  return responderSobreSistema(pergunta);
}
