// Seções e novos questionários do Questionário de Despesas (dec 179). Cada seção começa numa pergunta e vira uma página
// no preenchimento; seção sem título fica oculta. Fase 1: tudo no navegador, em modo demonstração.
import {
  ID_TIPO_DESPESA, gravarEstado, questionarioDoTipo, tiposDeDespesa, type Estado, type Pergunta, type Secao,
} from "./questionario-despesas.ts";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

// Seções do questionário do tipo, na ordem em que aparecem (a que começa antes vem primeiro).
export function secoesDoTipo(e: Estado, tipo: string): Secao[] {
  const ids = questionarioDoTipo(e, tipo);
  return (e.secoes?.[tipo] ?? [])
    .filter((s) => ids.includes(s.inicio))
    .sort((a, b) => ids.indexOf(a.inicio) - ids.indexOf(b.inicio));
}

// Seção a que a pergunta pertence: a última que começou nela ou antes dela; null quando nenhuma começou ainda.
export function secaoDaPergunta(e: Estado, tipo: string, id: string): Secao | null {
  const ids = questionarioDoTipo(e, tipo);
  const posicao = ids.indexOf(id);
  let achada: Secao | null = null;
  for (const s of secoesDoTipo(e, tipo)) if (ids.indexOf(s.inicio) <= posicao) achada = s;
  return achada;
}

// Primeira pergunta da próxima seção depois da pergunta dada (destino "Ir para a próxima seção"); null quando não há outra.
export function inicioDaProximaSecao(e: Estado, tipo: string, id: string): string | null {
  const ids = questionarioDoTipo(e, tipo);
  const posicao = ids.indexOf(id);
  return secoesDoTipo(e, tipo).find((s) => ids.indexOf(s.inicio) > posicao)?.inicio ?? null;
}

export type Pagina = { secao: Secao | null; perguntas: Pergunta[] };

// Agrupa as perguntas visíveis em páginas, uma por seção (página sem nenhuma pergunta visível não existe).
export function paginasDoPreenchimento(e: Estado, tipo: string, visiveis: readonly Pergunta[]): Pagina[] {
  const paginas: Pagina[] = [];
  for (const p of visiveis) {
    const secao = secaoDaPergunta(e, tipo, p.id);
    const ultima = paginas[paginas.length - 1];
    if (ultima && (ultima.secao?.id ?? null) === (secao?.id ?? null)) ultima.perguntas.push(p);
    else paginas.push({ secao, perguntas: [p] });
  }
  return paginas;
}

const novoIdSecao = () => `s-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// Cria, edita (com título e subtítulo) ou tira, com null, a seção que começa na pergunta `inicio`.
export function gravarSecao(e: Estado, tipo: string, inicio: string, dados: { titulo: string; subtitulo: string } | null, storage: StorageLike = localStorage): Estado {
  if (!tiposDeDespesa(e).includes(tipo)) throw new Error("Tipo de despesa desconhecido.");
  if (!questionarioDoTipo(e, tipo).includes(inicio)) throw new Error("A pergunta não está neste questionário.");
  const lista = e.secoes?.[tipo] ?? [];
  const atual = lista.find((s) => s.inicio === inicio);
  if (dados === null) {
    if (!atual) throw new Error("Não há seção iniciando nesta pergunta.");
    if (inicio === ID_TIPO_DESPESA) throw new Error("A primeira seção não pode ser removida.");
    return gravarEstado({ ...e, secoes: { ...(e.secoes ?? {}), [tipo]: lista.filter((s) => s.inicio !== inicio) } }, storage);
  }
  const nova: Secao = { id: atual?.id ?? novoIdSecao(), titulo: dados.titulo.trim(), subtitulo: dados.subtitulo.trim(), inicio };
  return gravarEstado({ ...e, secoes: { ...(e.secoes ?? {}), [tipo]: atual ? lista.map((s) => (s.inicio === inicio ? nova : s)) : [...lista, nova] } }, storage);
}

// Novo questionário: um tipo novo na pergunta "Tipos de despesas", com a primeira seção (título e subtítulo opcionais) e sem
// outras perguntas; elas são acrescentadas do banco (dec 179).
export function criarQuestionario(e: Estado, nome: string, secao: { titulo: string; subtitulo: string }, storage: StorageLike = localStorage): Estado {
  const limpo = nome.trim();
  if (!limpo) throw new Error("Informe o nome do questionário.");
  if (tiposDeDespesa(e).some((t) => t.toLocaleLowerCase("pt-BR") === limpo.toLocaleLowerCase("pt-BR"))) throw new Error("Já existe um questionário com esse nome.");
  const perguntas = e.perguntas.map((p) => (p.id === ID_TIPO_DESPESA ? { ...p, opcoes: [...p.opcoes, limpo] } : p));
  const primeira: Secao = { id: novoIdSecao(), titulo: secao.titulo.trim(), subtitulo: secao.subtitulo.trim(), inicio: ID_TIPO_DESPESA };
  return gravarEstado({
    ...e, perguntas, questionarios: { ...e.questionarios, [limpo]: [] }, secoes: { ...(e.secoes ?? {}), [limpo]: [primeira] },
  }, storage);
}
