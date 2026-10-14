// Ramificação do Questionário de Despesas (dec 178): cada opção de resposta pode levar a outra pergunta ou encerrar o formulário.
// Sem destino marcado, a opção segue para a próxima pergunta. Fase 1: tudo no navegador, em modo demonstração.
import {
  ID_TIPO_DESPESA, aceitaCondicao, gravarEstado, questionarioDoTipo, tiposDeDespesa, type Estado, type Pergunta,
} from "./questionario-despesas.ts";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export const DESTINO_ENCERRAR = "encerrar";
export const prefixoPergunta = "pergunta:";
export const destinoPergunta = (id: string): string => `${prefixoPergunta}${id}`;
export const idDoDestino = (destino: string): string | null => (destino.startsWith(prefixoPergunta) ? destino.slice(prefixoPergunta.length) : null);

// Só pergunta de uma única resposta, com opções escritas nela, ramifica (caixas com mais de uma marcação não tem destino único).
export const aceitaDestino = (p: Pergunta): boolean => aceitaCondicao(p) && !p.multiplas;

export const destinosDoTipo = (e: Estado, tipo: string): Record<string, Record<string, string>> => e.destinos?.[tipo] ?? {};

// Opção que a pessoa marcou (uma só, nas perguntas que ramificam).
export const opcaoRespondida = (resposta: string | string[] | undefined): string | undefined => (Array.isArray(resposta) ? resposta[0] : resposta);

export type Pendencia = { perguntaId: string; opcao: string; motivo: string };

// Ação requerida: destinos que apontam para uma pergunta que saiu do questionário (ou foi excluída) ou que
// pertencem a uma opção que não existe mais. O questionário só é publicado depois de corrigir (dec 178).
export function pendencias(e: Estado, tipo: string): Pendencia[] {
  const ids = questionarioDoTipo(e, tipo);
  const lista: Pendencia[] = [];
  for (const [perguntaId, porOpcao] of Object.entries(destinosDoTipo(e, tipo))) {
    const origem = e.perguntas.find((p) => p.id === perguntaId);
    if (!origem || !ids.includes(perguntaId)) continue;
    if (!aceitaDestino(origem)) {
      lista.push({ perguntaId, opcao: Object.keys(porOpcao).join(", "), motivo: "A pergunta não aceita mais ramificação (mais de uma resposta ou sem opções escritas)." });
      continue;
    }
    for (const [opcao, destino] of Object.entries(porOpcao)) {
      const alvo = idDoDestino(destino);
      if (!origem.opcoes.includes(opcao)) lista.push({ perguntaId, opcao, motivo: "A opção não existe mais." });
      else if (alvo !== null && !ids.includes(alvo)) lista.push({ perguntaId, opcao, motivo: "A pergunta de destino saiu do questionário." });
    }
  }
  return lista;
}

export const questionarioPublicado = (e: Estado, tipo: string): boolean => pendencias(e, tipo).length === 0;

const rotuloPergunta = (e: Estado, id: string): string => e.perguntas.find((p) => p.id === id)?.codigo ?? "?";

// Busca em profundidade no grafo do questionário (cada pergunta vai para a próxima e para os destinos escolhidos).
// Devolve o caminho do ciclo (A, B, A) ou null quando o fluxo não volta a uma pergunta já visitada.
export function encontrarCiclo(e: Estado, tipo: string): string[] | null {
  const ids = questionarioDoTipo(e, tipo);
  const destinos = destinosDoTipo(e, tipo);
  const arestas = (id: string): string[] => {
    const i = ids.indexOf(id);
    const seguinte = i >= 0 && i + 1 < ids.length ? [ids[i + 1] as string] : [];
    const saltos = Object.values(destinos[id] ?? {}).map(idDoDestino).filter((x): x is string => x !== null && ids.includes(x));
    return [...seguinte, ...saltos];
  };
  const estado = new Map<string, 1 | 2>(); // 1 = no caminho atual, 2 = já concluída
  const caminho: string[] = [];
  const visitar = (id: string): string[] | null => {
    estado.set(id, 1);
    caminho.push(id);
    for (const alvo of arestas(id)) {
      if (estado.get(alvo) === 1) return [...caminho.slice(caminho.indexOf(alvo)), alvo];
      if (!estado.has(alvo)) {
        const achado = visitar(alvo);
        if (achado) return achado;
      }
    }
    caminho.pop();
    estado.set(id, 2);
    return null;
  };
  for (const id of ids) {
    if (!estado.has(id)) {
      const achado = visitar(id);
      if (achado) return achado;
    }
  }
  return null;
}

export const textoDoCiclo = (e: Estado, ciclo: string[]): string => `Fluxo em ciclo: ${ciclo.map((id) => rotuloPergunta(e, id)).join(" → ")}.`;

// Define (ou tira, com null) o destino de uma opção de resposta no questionário de um tipo de despesa.
export function gravarDestino(e: Estado, tipo: string, perguntaId: string, opcao: string, destino: string | null, storage: StorageLike = localStorage): Estado {
  if (!tiposDeDespesa(e).includes(tipo)) throw new Error("Tipo de despesa desconhecido.");
  const ids = questionarioDoTipo(e, tipo);
  const origem = e.perguntas.find((p) => p.id === perguntaId);
  if (perguntaId === ID_TIPO_DESPESA || !origem || !ids.includes(perguntaId) || !aceitaDestino(origem)) throw new Error("Esta pergunta não ramifica.");
  if (!origem.opcoes.includes(opcao)) throw new Error("Escolha uma opção da pergunta.");
  const { [opcao]: _antigo, ...resto } = e.destinos?.[tipo]?.[perguntaId] ?? {};
  if (destino !== null && destino !== DESTINO_ENCERRAR) {
    const alvo = idDoDestino(destino);
    if (alvo === null || !ids.includes(alvo) || alvo === ID_TIPO_DESPESA) throw new Error("Escolha uma pergunta deste questionário.");
    if (alvo === perguntaId) throw new Error("A opção não pode voltar para a própria pergunta.");
  }
  const novasOpcoes = destino === null ? resto : { ...resto, [opcao]: destino };
  const porPergunta = { ...(e.destinos?.[tipo] ?? {}) };
  if (Object.keys(novasOpcoes).length) porPergunta[perguntaId] = novasOpcoes;
  else delete porPergunta[perguntaId];
  const candidato: Estado = { ...e, destinos: { ...(e.destinos ?? {}), [tipo]: porPergunta } };
  const ciclo = encontrarCiclo(candidato, tipo);
  if (ciclo) throw new Error(textoDoCiclo(candidato, ciclo));
  return gravarEstado(candidato, storage);
}

// Antes de gravar uma nova ordem: reordenar não pode criar um fluxo que volte a uma pergunta já visitada.
export function conferirOrdem(e: Estado, tipo: string, ids: string[]): void {
  const candidato: Estado = { ...e, questionarios: { ...e.questionarios, [tipo]: ids.filter((id) => id !== ID_TIPO_DESPESA) } };
  const ciclo = encontrarCiclo(candidato, tipo);
  if (ciclo) throw new Error(textoDoCiclo(candidato, ciclo));
}
