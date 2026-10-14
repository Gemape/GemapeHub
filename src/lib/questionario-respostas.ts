// Preenchimento do Questionário de Despesas: máscaras, condição se/então e validação das respostas (dec 169).
// Etapa 2: só a tela "Testar questionário"; as respostas não são gravadas (o módulo Viagens vem depois).
import { MAX_ARQUIVOS, questionarioDoTipo, type Estado, type FormatoCurta, type Pergunta } from "./questionario-despesas.ts";

// Resposta: texto, lista de textos (caixas, habilitados) ou nomes dos arquivos escolhidos (upload).
export type Resposta = string | string[];
export type Respostas = Record<string, Resposta>;

const soDigitos = (texto: string) => texto.replace(/\D/g, "");
const milhares = (n: string) => n.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

// Número com duas casas: digita-se só os algarismos e a vírgula entra sozinha (1 -> 0,01; 12345 -> 123,45).
export function mascaraDecimal2(texto: string): string {
  const d = soDigitos(texto).replace(/^0+(?=\d)/, "");
  if (!d) return "";
  const cheio = d.padStart(3, "0");
  return `${milhares(cheio.slice(0, -2))},${cheio.slice(-2)}`;
}

export const mascaraMoeda = (texto: string): string => {
  const m = mascaraDecimal2(texto);
  return m ? `R$ ${m}` : "";
};

export const mascaraInteiro = (texto: string): string => soDigitos(texto);

export function aplicarFormato(texto: string, formato: FormatoCurta): string {
  if (formato === "moeda") return mascaraMoeda(texto);
  if (formato === "decimal2") return mascaraDecimal2(texto);
  if (formato === "inteiro") return mascaraInteiro(texto);
  return texto;
}

// Número que a resposta formatada representa (para somar depois): "R$ 1.234,56" -> 1234.56.
export const valorNumerico = (texto: string): number => Number(texto.replace(/[^\d,]/g, "").replace(",", "."));

// Opção "Outro" de uma pergunta de escolha: ao marcar, quem responde descreve o que é (dec 174).
export const OPCAO_OUTRO = "Outro";
export const chaveOutro = (perguntaId: string): string => `${perguntaId}:outro`;
export function marcouOutro(p: Pergunta, respostas: Respostas): boolean {
  if (!(p.tipo === "multipla" || p.tipo === "caixas" || p.tipo === "lista") || p.fonte !== "propria" || p.habilitados) return false;
  const r = respostas[p.id];
  return Array.isArray(r) ? r.includes(OPCAO_OUTRO) : r === OPCAO_OUTRO;
}
// Texto da resposta para registrar: a opção Outro leva a descrição ("Outro: motorista de aplicativo").
export function textoDaResposta(p: Pergunta, respostas: Respostas): string {
  const r = respostas[p.id];
  if (r === undefined) return "";
  const descricao = marcouOutro(p, respostas) ? String(respostas[chaveOutro(p.id)] ?? "").trim() : "";
  const rotulo = (o: string) => (o === OPCAO_OUTRO && descricao ? `${OPCAO_OUTRO}: ${descricao}` : o);
  return (Array.isArray(r) ? r.map(rotulo).join(", ") : rotulo(r)).trim();
}

export function visivel(e: Estado, tipo: string, id: string, respostas: Respostas): boolean {
  const regra = e.regras[tipo]?.[id];
  if (!regra) return true;
  const dado = respostas[regra.origem];
  const marcado = Array.isArray(dado) ? dado.includes(regra.valor) : dado === regra.valor;
  return regra.operador === "igual" ? marcado : !marcado;
}

// Perguntas do questionário do tipo que aparecem com as respostas dadas até agora (a condição de uma pergunta oculta não vale).
export function perguntasVisiveis(e: Estado, tipo: string, respostas: Respostas): Pergunta[] {
  const mostradas = new Set<string>();
  const lista: Pergunta[] = [];
  for (const id of questionarioDoTipo(e, tipo)) {
    const p = e.perguntas.find((x) => x.id === id);
    const regra = e.regras[tipo]?.[id];
    if (!p) continue;
    if (regra && !mostradas.has(regra.origem)) continue;
    // Pergunta que depende de outra (município x UF) só aparece com a de origem visível.
    if (p.dependeDe && !mostradas.has(p.dependeDe)) continue;
    if (!visivel(e, tipo, id, respostas)) continue;
    mostradas.add(id);
    lista.push(p);
  }
  return lista;
}

// Data de verdade (não aceita 30/02): confere indo e voltando pelo calendário.
function dataValida(iso: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return false;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getFullYear() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]);
}

const vazio = (r: Resposta | undefined) => r === undefined || (Array.isArray(r) ? r.length === 0 : r.trim() === "");

// Erros por pergunta visível; vazio quando o questionário pode ser enviado.
export function validarRespostas(visiveis: Pergunta[], respostas: Respostas): Record<string, string> {
  const erros: Record<string, string> = {};
  for (const p of visiveis) {
    const r = respostas[p.id];
    if (vazio(r)) {
      if (p.obrigatoria) erros[p.id] = p.tipo === "upload" ? "Anexe ao menos uma imagem." : "Resposta obrigatória.";
      continue;
    }
    const texto = typeof r === "string" ? r : "";
    const marcadas = Array.isArray(r) ? r : [texto];
    const lista = (p.tipo === "multipla" || p.tipo === "caixas" || p.tipo === "lista") && p.fonte === "propria" && !p.habilitados ? p.opcoes : null;
    if (lista && marcadas.some((m) => !lista.includes(m))) erros[p.id] = "Escolha uma das opções da lista.";
    else if (marcouOutro(p, respostas) && vazio(respostas[chaveOutro(p.id)])) erros[p.id] = "Descreva o outro.";
    else if (p.tipo === "hora" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(texto)) erros[p.id] = "Informe o horário no formato hh:mm.";
    else if (p.tipo === "data" && !dataValida(texto)) erros[p.id] = "Informe uma data válida.";
    else if (p.tipo === "curta" && (p.formato === "moeda" || p.formato === "decimal2") && !/^(R\$ )?\d{1,3}(\.\d{3})*,\d{2}$/.test(texto)) erros[p.id] = "Informe um número com duas casas decimais.";
    else if (p.tipo === "curta" && p.formato === "inteiro" && !/^\d+$/.test(texto)) erros[p.id] = "Informe um número inteiro.";
    else if (p.tipo === "upload" && Array.isArray(r) && r.length > MAX_ARQUIVOS) erros[p.id] = `No máximo ${MAX_ARQUIVOS} imagens.`;
    else if ((p.tipo === "multipla" || p.tipo === "lista" || (p.tipo === "caixas" && !p.multiplas)) && Array.isArray(r) && r.length > 1) erros[p.id] = "Escolha apenas uma opção.";
  }
  return erros;
}

// Imagem econômica: reduz o lado maior para `larguraMaxPx` mantendo a proporção (nunca amplia).
export function dimensoesReduzidas(largura: number, altura: number, maximo: number): { largura: number; altura: number } {
  const maior = Math.max(largura, altura);
  if (maior <= maximo) return { largura, altura };
  const fator = maximo / maior;
  return { largura: Math.round(largura * fator), altura: Math.round(altura * fator) };
}
