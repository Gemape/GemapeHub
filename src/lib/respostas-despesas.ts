// Respostas do Questionário de Despesas (dec 169). Fase 1: ficam só no navegador, em modo demonstração; a tabela de
// respostas (JSONB, com `empresa_id`) entra na Fase 2. Cada resposta guarda o título das perguntas da época.
import { hojeLocal } from "./empregados.ts";
import { ID_TIPO_DESPESA, tiposDeDespesa, type Estado } from "./questionario-despesas.ts";
import { perguntasVisiveis, textoDaResposta, validarRespostas, type Respostas } from "./questionario-respostas.ts";

type StorageLike = Pick<Storage, "getItem" | "setItem">;
const CHAVE = "gemape-demo-respostas-despesas";

export type ImagemGuardada = { nome: string; dataUrl: string };
export type ItemResposta = { perguntaId: string; titulo: string; resposta: string; imagens?: ImagemGuardada[] };
export type RespostaRegistrada = { id: string; tipo: string; data: string; hora: string; itens: ItemResposta[] };

const dois = (n: number) => String(n).padStart(2, "0");
// Hora local (Brasília para quem usa o sistema), nunca UTC.
export const horaLocal = (agora = new Date()): string => `${dois(agora.getHours())}:${dois(agora.getMinutes())}`;

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

// Valida tudo e grava a resposta de uma vez; se algo falha, nada é gravado. As mais novas ficam primeiro.
export function registrarResposta(e: Estado, respostas: Respostas, storage: StorageLike = localStorage, agora = new Date(), imagens: Record<string, ImagemGuardada[]> = {}): RespostaRegistrada {
  const tipo = tipoEscolhido(respostas);
  if (!tipo) throw new Error("Escolha o tipo de despesa.");
  if (!tiposDeDespesa(e).includes(tipo)) throw new Error("Esse tipo de despesa não existe mais no cadastro; recarregue o formulário.");
  const visiveis = perguntasVisiveis(e, tipo, respostas);
  const erros = validarRespostas(visiveis, respostas);
  const primeiro = visiveis.find((p) => erros[p.id]);
  if (primeiro) throw new Error(`${primeiro.titulo}: ${erros[primeiro.id]}`);
  conferirIntegridade(storage);
  const registro: RespostaRegistrada = {
    id: `r-${agora.getTime().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    tipo, data: hojeLocal(agora), hora: horaLocal(agora),
    itens: visiveis.filter((p) => comoTexto(respostas[p.id]) !== "").map((p) => {
      const fotos = p.tipo === "upload" ? (imagens[p.id] ?? []).filter((i) => i.dataUrl.startsWith("data:image/")) : [];
      return {
        perguntaId: p.id, titulo: p.titulo,
        // Data entra como dd/mm/aaaa, o formato que quem lê a conferência espera.
        resposta: p.tipo === "data" ? dataBr(comoTexto(respostas[p.id])) : textoDaResposta(p, respostas),
        ...(fotos.length ? { imagens: fotos.map((i) => ({ nome: i.nome, dataUrl: i.dataUrl })) } : {}),
      };
    }),
  };
  try {
    storage.setItem(CHAVE, JSON.stringify([registro, ...listarRespostas(storage)]));
  } catch {
    throw new Error("Não há espaço no navegador para guardar esta resposta com as imagens; exclua respostas antigas e tente de novo.");
  }
  return registro;
}

export function removerResposta(id: string, storage: StorageLike = localStorage): void {
  conferirIntegridade(storage);
  storage.setItem(CHAVE, JSON.stringify(listarRespostas(storage).filter((r) => r.id !== id)));
}

// Linha da lista de conferência: tipo, data, hora e o valor da despesa quando houver.
export function resumoDaResposta(r: RespostaRegistrada): string {
  const valor = r.itens.find((i) => /^valor/i.test(i.titulo));
  return [r.tipo, `${dataBr(r.data)} ${r.hora}`, valor ? `${valor.titulo}: ${valor.resposta}` : ""].filter(Boolean).join(" · ");
}
