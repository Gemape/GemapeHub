// Preenchimento do Questionário de Despesas: máscaras, condição se/então e validação das respostas (dec 169).
// Etapa 2: só a tela "Testar questionário"; as respostas não são gravadas (o módulo Viagens vem depois).
import { inicioDaProximaSecao } from "./questionario-secoes.ts";
import { DESTINO_PROXIMA_SECAO, aceitaDestino, destinosDoTipo, idDoDestino, opcaoRespondida, DESTINO_ENCERRAR } from "./questionario-destinos.ts";
import { ID_DATA_DESPESA, ID_DETALHAMENTO, ID_HABILITADOS, ID_JUSTIFICATIVA, ID_LITROS, ID_VALOR_DESPESA, ID_PCM_RESPONDE, ID_TECNICO_RESPONSAVEL, MAX_ARQUIVOS, TIPOS_COM_CLASSIFICACAO, questionarioDoTipo, type Estado, type FormatoCurta, type Pergunta } from "./questionario-despesas.ts";

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

// Área de quem lança, lida do rótulo "Nome (Área)" da resposta à pergunta de habilitados.
export function areaDeQuemLanca(respostas: Respostas): string | null {
  const r = respostas[ID_HABILITADOS];
  const texto = Array.isArray(r) ? r[0] : r;
  return texto ? (/ \(([^()]*)\)\s*$/.exec(texto)?.[1]?.trim() ?? null) : null;
}
// "Técnico responsável pela despesa" só aparece quando quem lança é do PCM ou do Administrativo (dec 177).
export const lancadoPorGestor = (respostas: Respostas): boolean => {
  const area = areaDeQuemLanca(respostas);
  return area === "PCM" || area === "Administrativo";
};

// Dec 223: do abastecimento registrado em Veículos vêm só a data e o valor, que preenchem Data da despesa e Valor da despesa do card.
export function respostasDoAbastecimento(abastecimento: { id?: string; data: string; valor?: number | null | undefined; litros?: number | null | undefined }): Respostas {
  const patch: Respostas = { [ID_DATA_DESPESA]: abastecimento.data };
  if (abastecimento.id) patch[chaveAbastecimento] = abastecimento.id;
  if (typeof abastecimento.valor === "number" && abastecimento.valor > 0) patch[ID_VALOR_DESPESA] = mascaraDecimal2(String(Math.round(abastecimento.valor * 100)));
  if (typeof abastecimento.litros === "number" && abastecimento.litros > 0) patch[ID_LITROS] = mascaraDecimal2(String(Math.round(abastecimento.litros * 100)));
  return patch;
}

// Dec 224: a despesa de abastecimento guarda o id do registro de Veículos e, ao encerrar, puxa data e valor dele (o que mudou lá vale aqui).
export const chaveAbastecimento = "abastecimento:id";
export function sincronizarAbastecimento(respostas: Respostas, lista: { id: string; data: string; valor?: number | null | undefined; litros?: number | null | undefined }[]): Respostas {
  const id = respostas[chaveAbastecimento];
  if (typeof id !== "string" || id === "") return respostas;
  const a = lista.find((x) => x.id === id);
  if (!a) throw new Error("O abastecimento ligado a esta despesa foi excluído de Veículos; escolha outro ou registre um novo.");
  const novo = { ...respostas, ...respostasDoAbastecimento(a) };
  if (!(typeof a.valor === "number" && a.valor > 0)) delete novo[ID_VALOR_DESPESA];
  return novo;
}

// Dec 226: no card Manutenção do veículo de trabalho, a Nova manutenção de Veículos devolve data, detalhamento (serviços) e custo total.
export const chaveManutencao = "manutencao:id";
export function respostasDaManutencao(manutencao: { id?: string; data: string; custoTotal?: number | null | undefined }, detalhamento: string): Respostas {
  const patch: Respostas = { [ID_DATA_DESPESA]: manutencao.data };
  if (manutencao.id) patch[chaveManutencao] = manutencao.id;
  if (detalhamento.trim()) patch[ID_DETALHAMENTO] = detalhamento.trim();
  if (typeof manutencao.custoTotal === "number" && manutencao.custoTotal > 0) patch[ID_VALOR_DESPESA] = mascaraDecimal2(String(Math.round(manutencao.custoTotal * 100)));
  return patch;
}
// Ao gravar, a despesa ligada puxa de novo data e custo total da manutenção (o detalhamento fica como foi digitado).
export function sincronizarManutencao(respostas: Respostas, lista: { id: string; data: string; custoTotal?: number | null | undefined }[]): Respostas {
  const id = respostas[chaveManutencao];
  if (typeof id !== "string" || id === "") return respostas;
  const m = lista.find((x) => x.id === id);
  if (!m) throw new Error("A manutenção ligada a esta despesa foi excluída de Veículos; escolha outra ou registre uma nova.");
  const { [ID_DETALHAMENTO]: _d, ...dados } = respostasDaManutencao(m, "");
  const novo = { ...respostas, ...dados };
  if (!(typeof m.custoTotal === "number" && m.custoTotal > 0)) delete novo[ID_VALOR_DESPESA];
  return novo;
}

// Dec 221: a justificativa da ausência do documento só abre depois de uma tentativa de encerrar sem anexo (marca `pedida`) e some se o anexo entrar.
export const chaveJustificativaPedida = `${ID_JUSTIFICATIVA}:pedida`;
const semArquivos = (r: Resposta | undefined): boolean => !Array.isArray(r) || r.length === 0;
export function justificativaAberta(e: Estado, tipo: string, respostas: Respostas): boolean {
  if (respostas[chaveJustificativaPedida] !== "1") return false;
  const ids = questionarioDoTipo(e, tipo);
  if (!ids.includes(ID_JUSTIFICATIVA)) return false;
  return e.perguntas.filter((p) => p.tipo === "upload" && ids.includes(p.id)).every((p) => semArquivos(respostas[p.id]));
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
  const todos = questionarioDoTipo(e, tipo);
  const destinos = destinosDoTipo(e, tipo);
  // Ramificação (dec 178): salto = pergunta de destino ainda não alcançada; as do meio ficam de fora.
  let salto: string | null = null;
  for (const id of todos) {
    if (salto !== null) {
      if (todos.indexOf(id) < todos.indexOf(salto)) continue;
      salto = null;
    }
    const p = e.perguntas.find((x) => x.id === id);
    const regra = e.regras[tipo]?.[id];
    if (!p) continue;
    if (regra && !mostradas.has(regra.origem)) continue;
    // Pergunta que depende de outra (município x UF) só aparece com a de origem visível.
    if (p.dependeDe && !mostradas.has(p.dependeDe)) continue;
    if (id === ID_TECNICO_RESPONSAVEL && !lancadoPorGestor(respostas)) continue;
    if (id === ID_JUSTIFICATIVA && !justificativaAberta(e, tipo, respostas)) continue;
    // Dec 218: nos tipos com classificação, "PCM responde" é só de quem lança pelo PCM ou Administrativo.
    if (id === ID_PCM_RESPONDE && TIPOS_COM_CLASSIFICACAO.includes(tipo) && !lancadoPorGestor(respostas)) continue;
    if (!visivel(e, tipo, id, respostas)) continue;
    mostradas.add(id);
    lista.push(p);
    const destino = aceitaDestino(p) ? destinos[id]?.[opcaoRespondida(respostas[id]) ?? ""] : undefined;
    if (destino === DESTINO_ENCERRAR) break;
    if (destino === DESTINO_PROXIMA_SECAO) {
      const inicio = inicioDaProximaSecao(e, tipo, id);
      if (inicio === null) break;
      salto = inicio;
      continue;
    }
    const alvo = destino ? idDoDestino(destino) : null;
    if (alvo !== null && todos.includes(alvo) && todos.indexOf(alvo) > todos.indexOf(id)) salto = alvo;
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
  // Com o campo de justificativa aberto, a falta do documento não impede encerrar se ele for preenchido (dec 221).
  // Com o campo aberto, o erro vai para ele (obrigatório) e não para o documento.
  const justificada = visiveis.some((p) => p.id === ID_JUSTIFICATIVA);
  for (const p of visiveis) {
    const r = respostas[p.id];
    if (vazio(r)) {
      if (p.tipo === "upload" && justificada) continue;
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
