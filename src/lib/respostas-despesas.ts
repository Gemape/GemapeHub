// Respostas do Questionário de Despesas (dec 169). Fase 1: ficam só no navegador, em modo demonstração; a tabela de
// respostas (JSONB, com `empresa_id`) entra na Fase 2. Cada resposta guarda o título das perguntas da época.
import { horaBrasilia, hojeLocal } from "./empregados.ts";
import { ID_JUSTIFICATIVA, ID_TIPO_DESPESA, tiposDeDespesa, type Estado } from "./questionario-despesas.ts";
import { listarRelatorios, relatorioPorDespesa } from "./relatorios-viagens.ts";
import { questionarioPublicado } from "./questionario-destinos.ts";
import { chaveJustificativaPedida, chaveOutro, perguntasVisiveis, textoDaResposta, validarRespostas, type Respostas } from "./questionario-respostas.ts";

type StorageLike = Pick<Storage, "getItem" | "setItem">;
const CHAVE = "gemape-demo-respostas-despesas";

export type ImagemGuardada = { nome: string; dataUrl: string };
export type ItemResposta = { perguntaId: string; titulo: string; resposta: string; imagens?: ImagemGuardada[] };
// `valores` guarda o que foi respondido (já sem as perguntas escondidas) para a despesa poder ser editada depois (dec 211).
export type RespostaRegistrada = { id: string; tipo: string; data: string; hora: string; itens: ItemResposta[]; valores?: Respostas };

// Hora local (Brasília para quem usa o sistema), nunca UTC.
export const horaLocal = (agora = new Date()): string => horaBrasilia(agora);

// A pergunta 3 define o tipo de despesa: a primeira opção marcada.
export function tipoEscolhido(respostas: Respostas): string {
  const r = respostas[ID_TIPO_DESPESA];
  return (Array.isArray(r) ? r[0] : r) ?? "";
}

const dataBr = (iso: string) => iso.split("-").reverse().join("/");
const comoTexto = (r: string | string[] | undefined): string => (Array.isArray(r) ? r.join(", ") : (r ?? "")).trim();

export function listarRespostas(storage: StorageLike = localStorage): RespostaRegistrada[] {
  try {
    const lidas = JSON.parse(storage.getItem(CHAVE) ?? "[]");
    // Itens que não são respostas (dado estragado) ficam de fora da lista, sem derrubar a tela.
    return Array.isArray(lidas) ? (lidas as RespostaRegistrada[]).filter((r) => !!r && typeof r === "object" && Array.isArray(r.itens)) : [];
  } catch {
    return [];
  }
}

// Dado salvo ilegível nunca é sobrescrito.
function conferirIntegridade(storage: StorageLike): void {
  const bruto = storage.getItem(CHAVE);
  if (bruto === null) return;
  let ok = false;
  try { ok = Array.isArray(JSON.parse(bruto)); } catch { ok = false; }
  if (!ok) throw new Error("As respostas salvas neste navegador estão ilegíveis; nada foi alterado.");
}

// Confere o tipo e as respostas e monta os itens do registro; nada é gravado aqui.
function montarItens(e: Estado, respostas: Respostas, imagens: Record<string, ImagemGuardada[]>): { tipo: string; itens: ItemResposta[]; valores: Respostas } {
  const tipo = tipoEscolhido(respostas);
  if (!tipo) throw new Error("Escolha o tipo de despesa.");
  if (!tiposDeDespesa(e).includes(tipo)) throw new Error("Esse tipo de despesa não existe mais no cadastro; recarregue o formulário.");
  if (!questionarioPublicado(e, tipo)) throw new Error("Este questionário tem ação requerida e ainda não foi publicado; corrija as ramificações em Parâmetros.");
  const visiveis = perguntasVisiveis(e, tipo, respostas);
  const erros = validarRespostas(visiveis, respostas);
  const primeiro = visiveis.find((p) => erros[p.id]);
  if (primeiro) throw new Error(`${primeiro.titulo}: ${erros[primeiro.id]}`);
  const itens = visiveis.filter((p) => comoTexto(respostas[p.id]) !== "").map((p) => {
    const fotos = p.tipo === "upload" ? (imagens[p.id] ?? []).filter((i) => i.dataUrl.startsWith("data:image/")) : [];
    return {
      perguntaId: p.id, titulo: p.titulo,
      // Data entra como dd/mm/aaaa, o formato que quem lê a conferência espera.
      resposta: p.tipo === "data" ? dataBr(comoTexto(respostas[p.id])) : textoDaResposta(p, respostas),
      ...(fotos.length ? { imagens: fotos.map((i) => ({ nome: i.nome, dataUrl: i.dataUrl })) } : {}),
    };
  });
  const valores: Respostas = {};
  for (const p of visiveis) {
    const r = respostas[p.id];
    if (r !== undefined) valores[p.id] = r;
    const outro = respostas[chaveOutro(p.id)];
    if (outro !== undefined) valores[chaveOutro(p.id)] = outro;
  }
  return { tipo, itens, valores };
}

// Valida tudo e grava a resposta de uma vez; se algo falha, nada é gravado. As mais novas ficam primeiro.
export function registrarResposta(e: Estado, respostas: Respostas, storage: StorageLike = localStorage, agora = new Date(), imagens: Record<string, ImagemGuardada[]> = {}): RespostaRegistrada {
  const { tipo, itens, valores } = montarItens(e, respostas, imagens);
  conferirIntegridade(storage);
  const registro: RespostaRegistrada = {
    id: `r-${agora.getTime().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    tipo, data: hojeLocal(agora), hora: horaLocal(agora), itens, valores,
  };
  try {
    storage.setItem(CHAVE, JSON.stringify([registro, ...listarRespostas(storage)]));
  } catch {
    throw new Error("Não há espaço no navegador para guardar esta resposta com as imagens; exclua respostas antigas e tente de novo.");
  }
  return registro;
}

// Despesa que já entrou num relatório (Finalizada) não se exclui nem se edita: o relatório salvo perderia a linha ou ficaria diferente.
export const despesaEmRelatorio = (id: string, storage: StorageLike = localStorage): boolean => relatorioPorDespesa(listarRelatorios(storage)).has(id);

// Edição (dec 211): mesmas conferências do registro; a despesa mantém o id, a data e a hora do lançamento e ocupa o mesmo lugar na lista.
export function atualizarResposta(
  e: Estado, id: string, respostas: Respostas, storage: StorageLike = localStorage, imagens: Record<string, ImagemGuardada[]> = {},
): RespostaRegistrada {
  const lista = listarRespostas(storage);
  const atual = lista.find((r) => r.id === id);
  if (!atual) throw new Error("Esta despesa não existe mais; recarregue a lista.");
  if (despesaEmRelatorio(id, storage)) throw new Error("Esta despesa já está num relatório de viagens (Finalizada) e não pode ser editada.");
  const { tipo, itens, valores } = montarItens(e, respostas, imagens);
  conferirIntegridade(storage);
  const registro: RespostaRegistrada = { id: atual.id, tipo, data: atual.data, hora: atual.hora, itens, valores };
  try {
    storage.setItem(CHAVE, JSON.stringify(lista.map((r) => (r.id === id ? registro : r))));
  } catch {
    throw new Error("Não há espaço no navegador para guardar esta resposta com as imagens; exclua respostas antigas e tente de novo.");
  }
  return registro;
}

// Respostas para reabrir a despesa no formulário. Registro novo traz `valores`; o antigo é refeito a partir do texto registrado.
export function respostasParaEdicao(e: Estado, r: RespostaRegistrada): Respostas {
  // Despesa encerrada com justificativa reabre com a justificativa à mostra.
  if (r.valores) return { ...r.valores, ...(r.valores[ID_JUSTIFICATIVA] !== undefined ? { [chaveJustificativaPedida]: "1" } : {}) };
  const respostas: Respostas = { [ID_TIPO_DESPESA]: [r.tipo] };
  for (const i of r.itens) {
    const p = e.perguntas.find((x) => x.id === i.perguntaId);
    if (!p || p.id === ID_TIPO_DESPESA) continue;
    const texto = i.resposta;
    if (p.tipo === "upload") { respostas[p.id] = (i.imagens ?? []).map((f) => f.nome); continue; }
    if (p.tipo === "data") { respostas[p.id] = texto.split("/").reverse().join("-"); continue; }
    if (p.tipo === "multipla" || p.tipo === "caixas" || p.tipo === "lista") {
      const outro = /^Outro: (.*)$/.exec(texto);
      if (outro && p.opcoes.includes("Outro")) { respostas[p.id] = p.tipo === "caixas" ? ["Outro"] : "Outro"; respostas[chaveOutro(p.id)] = outro[1] ?? ""; continue; }
      respostas[p.id] = p.tipo === "caixas" ? (p.multiplas ? texto.split(", ") : [texto]) : texto;
      continue;
    }
    respostas[p.id] = texto;
  }
  return respostas;
}

export function removerResposta(id: string, storage: StorageLike = localStorage): void {
  conferirIntegridade(storage);
  // Despesa que já entrou num relatório (Finalizada) não se exclui: o relatório salvo perderia a linha ao ser baixado de novo.
  if (despesaEmRelatorio(id, storage)) throw new Error("Esta despesa já está num relatório de viagens (Finalizada) e não pode ser excluída.");
  storage.setItem(CHAVE, JSON.stringify(listarRespostas(storage).filter((r) => r.id !== id)));
}

// Linha da lista de conferência: tipo, data, hora e o valor da despesa quando houver.
export function resumoDaResposta(r: RespostaRegistrada): string {
  const valor = r.itens.find((i) => /^valor/i.test(i.titulo));
  return [r.tipo, `${dataBr(r.data)} ${r.hora}`, valor ? `${valor.titulo}: ${valor.resposta}` : ""].filter(Boolean).join(" · ");
}
