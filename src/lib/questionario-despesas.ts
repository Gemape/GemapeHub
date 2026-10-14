// Questionário de Despesas (Parâmetros > Veículos): formulário montado por esquema (JSON), sem campos fixos no código.
// Fase 1: o esquema fica só no navegador, em modo demonstração; as tabelas (esquema e respostas separados) entram na Fase 2.
// Etapa 1: construtor de perguntas. Lógica se/então e coleta de respostas vêm nas etapas seguintes.
export type TipoPergunta = "texto" | "paragrafo" | "multipla" | "caixas" | "lista" | "escala" | "data";

export const TIPOS_PERGUNTA: readonly { valor: TipoPergunta; rotulo: string }[] = [
  { valor: "texto", rotulo: "Resposta curta" },
  { valor: "paragrafo", rotulo: "Parágrafo" },
  { valor: "multipla", rotulo: "Múltipla escolha" },
  { valor: "caixas", rotulo: "Caixas de seleção" },
  { valor: "lista", rotulo: "Lista suspensa" },
  { valor: "escala", rotulo: "Escala linear" },
  { valor: "data", rotulo: "Data" },
];

export const TIPOS_COM_OPCOES: readonly TipoPergunta[] = ["multipla", "caixas", "lista"];

export type Pergunta = {
  id: string;
  titulo: string;
  tipo: TipoPergunta;
  obrigatoria: boolean;
  descricao: string;
  opcoes: string[];
  // Escala linear: de 1 até escalaMax (2 a 10).
  escalaMax: number;
};

export type Questionario = { versao: 1; titulo: string; perguntas: Pergunta[] };

type StorageLike = Pick<Storage, "getItem" | "setItem">;
const CHAVE = "gemape-demo-questionario-despesas";
const TITULO_PADRAO = "Questionário de despesas";

export const questionarioVazio = (): Questionario => ({ versao: 1, titulo: TITULO_PADRAO, perguntas: [] });

const novoId = () => `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function novaPergunta(tipo: TipoPergunta = "multipla"): Pergunta {
  return {
    id: novoId(), titulo: "", tipo, obrigatoria: false, descricao: "",
    opcoes: TIPOS_COM_OPCOES.includes(tipo) ? ["Opção 1"] : [], escalaMax: 5,
  };
}

// Troca o tipo mantendo o enunciado; opções só existem nos tipos que as usam.
export function mudarTipo(pergunta: Pergunta, tipo: TipoPergunta): Pergunta {
  const comOpcoes = TIPOS_COM_OPCOES.includes(tipo);
  return { ...pergunta, tipo, opcoes: comOpcoes ? (pergunta.opcoes.length ? pergunta.opcoes : ["Opção 1"]) : [] };
}

export function duplicarPergunta(perguntas: Pergunta[], id: string): Pergunta[] {
  const indice = perguntas.findIndex((p) => p.id === id);
  const original = perguntas[indice];
  if (!original) return perguntas;
  const copia: Pergunta = { ...original, id: novoId(), opcoes: [...original.opcoes] };
  return [...perguntas.slice(0, indice + 1), copia, ...perguntas.slice(indice + 1)];
}

export function excluirPergunta(perguntas: Pergunta[], id: string): Pergunta[] {
  return perguntas.filter((p) => p.id !== id);
}

// Arrastar: a pergunta `origem` passa para a posição da `destino`.
export function moverPergunta(perguntas: Pergunta[], origem: string, destino: string): Pergunta[] {
  const de = perguntas.findIndex((p) => p.id === origem);
  const para = perguntas.findIndex((p) => p.id === destino);
  if (de < 0 || para < 0 || de === para) return perguntas;
  const lista = [...perguntas];
  const [item] = lista.splice(de, 1);
  if (item) lista.splice(para, 0, item);
  return lista;
}

export function atualizarPergunta(perguntas: Pergunta[], pergunta: Pergunta): Pergunta[] {
  return perguntas.map((p) => (p.id === pergunta.id ? pergunta : p));
}

// Problemas que impedem salvar; vazio quando está tudo certo.
export function validarQuestionario(q: Questionario): string[] {
  const erros: string[] = [];
  if (!q.titulo.trim()) erros.push("Informe o título do questionário.");
  q.perguntas.forEach((p, i) => {
    const n = i + 1;
    if (!p.titulo.trim()) erros.push(`Pergunta ${n}: informe o enunciado.`);
    if (TIPOS_COM_OPCOES.includes(p.tipo)) {
      const opcoes = p.opcoes.map((o) => o.trim());
      if (opcoes.length === 0 || opcoes.some((o) => !o)) erros.push(`Pergunta ${n}: preencha todas as opções.`);
      else if (new Set(opcoes.map((o) => o.toLocaleLowerCase("pt-BR"))).size !== opcoes.length) erros.push(`Pergunta ${n}: há opções repetidas.`);
    }
    if (p.tipo === "escala" && !(Number.isInteger(p.escalaMax) && p.escalaMax >= 2 && p.escalaMax <= 10)) erros.push(`Pergunta ${n}: a escala vai de 2 a 10.`);
  });
  return erros;
}

// Dado salvo ilegível nunca é sobrescrito: a tela abre vazia, mas gravar por cima apagaria o que sobrou.
function conferirIntegridade(storage: StorageLike): void {
  const bruto = storage.getItem(CHAVE);
  if (bruto === null) return;
  let ok = false;
  try { const lido = JSON.parse(bruto); ok = !!lido && Array.isArray(lido.perguntas); } catch { ok = false; }
  if (!ok) throw new Error("O questionário salvo neste navegador está ilegível; nada foi alterado.");
}

export function lerQuestionario(storage: StorageLike = localStorage): Questionario {
  try {
    const lido = JSON.parse(storage.getItem(CHAVE) ?? "null");
    if (!lido || !Array.isArray(lido.perguntas)) return questionarioVazio();
    return { versao: 1, titulo: String(lido.titulo ?? TITULO_PADRAO), perguntas: lido.perguntas };
  } catch {
    return questionarioVazio();
  }
}

export function salvarQuestionario(q: Questionario, storage: StorageLike = localStorage): Questionario {
  const erros = validarQuestionario(q);
  if (erros.length) throw new Error(erros[0]);
  conferirIntegridade(storage);
  const limpo: Questionario = {
    versao: 1,
    titulo: q.titulo.trim(),
    perguntas: q.perguntas.map((p) => ({ ...p, titulo: p.titulo.trim(), descricao: p.descricao.trim(), opcoes: p.opcoes.map((o) => o.trim()) })),
  };
  storage.setItem(CHAVE, JSON.stringify(limpo));
  return limpo;
}
