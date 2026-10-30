// Módulo Viagens (decisão 176): cada resposta registrada do Questionário de Despesas é um lançamento na coleção única de
// despesas (modo demonstração, no navegador). Os campos que os indicadores e o relatório usam saem das respostas pelo número
// da pergunta de sistema; o que não foi respondido fica nulo.
import { ID_HABILITADOS as ID_PERGUNTA_HABILITADOS, ID_NOME_EMPREGADO, ID_TECNICO_RESPONSAVEL } from "./questionario-despesas.ts";
import { hojeLocal } from "./empregados.ts";
import { valorNumerico } from "./questionario-respostas.ts";
import { PRAZOS_PADRAO, type PrazosViagens } from "./prazo-viagens.ts";
import type { RespostaRegistrada } from "./respostas-despesas.ts";

export { ID_PERGUNTA_HABILITADOS };
export const ID_PERGUNTA_CLIENTE = "q-07";
// Dec 236: opção fixa do campo Clientes para viagem sem cliente específico; não conta em Clientes visitados.
export const SEM_CLIENTE_VINCULADO = "Sem cliente vinculado";
export const ID_PERGUNTA_DATA = "q-08";
export const ID_PERGUNTA_DETALHAMENTO = "q-09";
export const ID_PERGUNTA_VALOR = "q-11";
export const ID_PERGUNTA_PCM = "q-13";

export type DadosLancamento = {
  tipo: string;
  dataDespesa: string | null;
  valor: number | null;
  cliente: string | null;
  descricao: string | null;
  // Quem lançou (pergunta 04) e a área dela.
  tecnico: string | null;
  tecnicoArea: string | null;
  // Dono da despesa: quem lançou, se é da Oficina; senão o técnico responsável informado (pergunta 14); no Avulso (dec 220), o
  // empregado informado na pergunta 15, que não é um dos técnicos cadastrados.
  responsavel: string | null;
  // Despesa Avulso: o dono é um empregado fora dos técnicos monitorados (dec 220).
  avulso: boolean;
  // Índice de conformidade de lançamento (dec 177): verdadeiro quando o técnico lançou, falso quando o PCM ou o Administrativo
  // lançou por ele; nulo (fora do índice) quando é "Avulso – técnico não monitorado" ou não dá para saber o técnico.
  conforme: boolean | null;
};

const resposta = (r: RespostaRegistrada, id: string): string | null => {
  const texto = r.itens.find((i) => i.perguntaId === id)?.resposta?.trim();
  return texto ? texto : null;
};

// "dd/mm/aaaa" (como a resposta é guardada) volta para "aaaa-mm-dd".
const dataIso = (br: string | null): string | null => {
  const m = br ? /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br) : null;
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

// "Nome (Área)", como o habilitado é guardado nas respostas; se mais de um foi marcado, vale o primeiro.
const nomeEArea = (texto: string | null): { nome: string; area: string | null } | null => {
  if (!texto) return null;
  // Vale o primeiro habilitado e a última área entre parênteses do rótulo ("João (Jr) (PCM)" é João, PCM).
  const partes = /^(.+) \(([^()]*)\)\s*$/.exec(texto.split(/(?<=\)), /)[0] ?? texto);
  return partes ? { nome: partes[1]!.trim(), area: partes[2]!.trim() } : { nome: texto, area: null };
};

export function dadosDoLancamento(r: RespostaRegistrada): DadosLancamento {
  const valor = resposta(r, ID_PERGUNTA_VALOR);
  const quemLanca = nomeEArea(resposta(r, ID_PERGUNTA_HABILITADOS));
  const area = quemLanca?.area ?? null;
  const avulso = (resposta(r, ID_PERGUNTA_PCM) ?? "").startsWith("Avulso");
  const gestor = area === "PCM" || area === "Administrativo";
  const empregadoAvulso = avulso && gestor ? resposta(r, ID_NOME_EMPREGADO) : null;
  const responsavel = area === "Oficina" ? quemLanca!.nome : gestor ? (empregadoAvulso ?? nomeEArea(resposta(r, ID_TECNICO_RESPONSAVEL))?.nome ?? null) : null;
  return {
    tipo: r.tipo,
    dataDespesa: dataIso(resposta(r, ID_PERGUNTA_DATA)),
    valor: valor !== null && /\d/.test(valor) ? valorNumerico(valor) : null,
    cliente: resposta(r, ID_PERGUNTA_CLIENTE),
    descricao: resposta(r, ID_PERGUNTA_DETALHAMENTO),
    tecnico: quemLanca?.nome ?? null,
    tecnicoArea: area,
    responsavel,
    avulso: empregadoAvulso !== null,
    conforme: avulso || responsavel === null ? null : !gestor,
  };
}

// ---- Indicadores do painel (dec 177) ----

export type PeriodoMes = { ano: number; mes: number };
// Mês de hoje no horário de Brasília (nunca o fuso do dispositivo).
export const periodoAtual = (agora = new Date()): PeriodoMes => {
  const [ano, mes] = hojeLocal(agora).split("-").map(Number) as [number, number];
  return { ano, mes };
};
export const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"] as const;
export const rotuloPeriodo = (p: PeriodoMes): string => `${MESES[p.mes - 1] ?? ""} de ${p.ano}`;

// O lançamento pertence ao mês da data da despesa; sem ela, ao mês em que foi registrado.
const dataDoLancamento = (r: RespostaRegistrada): string => dadosDoLancamento(r).dataDespesa ?? r.data;
export const lancamentosDoPeriodo = (lista: readonly RespostaRegistrada[], p: PeriodoMes): RespostaRegistrada[] =>
  lista.filter((r) => dataDoLancamento(r).startsWith(`${p.ano}-${String(p.mes).padStart(2, "0")}-`));

// Dias de calendário entre duas datas "aaaa-mm-dd" (sem depender de fuso).
export const diasEntre = (de: string, ate: string): number => Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000);

// Índice de lançamento no prazo (decs 190, 193 e 199): o lançamento é registrado até N dias depois da data da despesa, com N o
// prazo do técnico mecânico. Só entram no índice as despesas lançadas pela Oficina (o PCM e o Administrativo lançam por
// ele e já pesam no índice de conformidade) e só se o indicador se aplica ao mecânico em Parâmetros. Sem data da despesa,
// vale o dia do registro; despesa com data futura ao registro não conta como no prazo. Um número vale para todas.
const prazoMecanico = (prazos: PrazosViagens | number): number => (typeof prazos === "number" ? prazos : prazos.mecanico);
export function medidoNoPrazo(r: RespostaRegistrada, prazos: PrazosViagens | number = PRAZOS_PADRAO): boolean {
  if (typeof prazos === "number") return true;
  const area = dadosDoLancamento(r).tecnicoArea;
  return prazos.mecanicoAplica !== false && area !== "PCM" && area !== "Administrativo";
}
export function lancadaNoPrazo(r: RespostaRegistrada, prazos: PrazosViagens | number = PRAZOS_PADRAO): boolean {
  const atraso = diasEntre(dadosDoLancamento(r).dataDespesa ?? r.data, r.data);
  return atraso >= 0 && atraso <= prazoMecanico(prazos);
}
export const indicePrazo = (noPrazo: number, total: number): number | null => (total > 0 ? (noPrazo / total) * 100 : null);

// Índice de fechamento do relatório no prazo (dec 199): o relatório de despesas é gerado até N dias depois do lançamento de cada despesa, com N o prazo do PCM
// em Parâmetros. Entram as despesas já finalizadas em relatório e as ainda abertas cujo prazo já passou (contam como fora do prazo); as abertas dentro do
// prazo ainda não entram. O dia do lançamento é o do registro (`r.data`) e o do fechamento, o da criação do relatório (horário de Brasília).
export type FechamentoNoPrazo = { noPrazo: number; medidos: number; indice: number | null };
export function fechamentoDoRelatorio(
  lista: readonly RespostaRegistrada[], p: PeriodoMes, prazos: PrazosViagens, criadoEmDe: ReadonlyMap<string, string>, hoje = hojeLocal(), responsavel?: string,
): FechamentoNoPrazo {
  if (prazos.pcmAplica === false) return { noPrazo: 0, medidos: 0, indice: null };
  let noPrazo = 0;
  let medidos = 0;
  for (const r of lancamentosDoPeriodo(lista, p)) {
    if (responsavel !== undefined && dadosDoLancamento(r).responsavel !== responsavel) continue;
    const criado = criadoEmDe.get(r.id);
    const dias = diasEntre(r.data, criado ? hojeLocal(new Date(criado)) : hoje);
    if (criado) {
      medidos += 1;
      if (dias <= prazos.pcm) noPrazo += 1;
    } else if (dias > prazos.pcm) {
      medidos += 1;
    }
  }
  return { noPrazo, medidos, indice: indicePrazo(noPrazo, medidos) };
}

// Índice de conformidade de lançamento: lançadas pelo técnico / total do técnico (técnico + gestor) x 100; nulo sem lançamentos no índice.
export const indiceConformidade = (conformes: number, total: number): number | null => (total > 0 ? (conformes / total) * 100 : null);
export const formatarPercentual = (v: number | null): string => (v === null ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
export const formatarMoeda = (v: number): string => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// `medidosNoPrazo` é o total que entra no índice de prazo (as despesas lançadas pela Oficina).
export type IndicadoresGlobais = { quantidade: number; custoTotal: number; naoConformes: number; noIndice: number; icl: number | null; noPrazo: number; medidosNoPrazo: number; prazo: number | null };
export function indicadoresGlobais(lista: readonly RespostaRegistrada[], p: PeriodoMes, prazos: PrazosViagens | number = PRAZOS_PADRAO): IndicadoresGlobais {
  const lancamentos = lancamentosDoPeriodo(lista, p);
  const dados = lancamentos.map(dadosDoLancamento);
  const medidos = lancamentos.filter((r) => medidoNoPrazo(r, prazos));
  const noPrazo = medidos.filter((r) => lancadaNoPrazo(r, prazos)).length;
  const noIndice = dados.filter((d) => d.conforme !== null);
  const conformes = noIndice.filter((d) => d.conforme).length;
  return {
    quantidade: dados.length,
    custoTotal: dados.reduce((soma, d) => soma + (d.valor ?? 0), 0),
    naoConformes: noIndice.length - conformes,
    noIndice: noIndice.length,
    icl: indiceConformidade(conformes, noIndice.length),
    noPrazo,
    medidosNoPrazo: medidos.length,
    prazo: indicePrazo(noPrazo, medidos.length),
  };
}

export type ResultadoTecnico = { nome: string; lancamentos: number; valorTotal: number; icl: number | null; prazo: number | null };
// Uma linha para cada técnico habilitado, mesmo sem lançamentos no mês.
export function resultadosTecnicos(lista: readonly RespostaRegistrada[], p: PeriodoMes, tecnicos: readonly string[], prazos: PrazosViagens | number = PRAZOS_PADRAO): ResultadoTecnico[] {
  const lancamentos = lancamentosDoPeriodo(lista, p).map((r) => ({ r, d: dadosDoLancamento(r) }));
  const dados = lancamentos.map(({ d }) => d);
  return tecnicos.map((nome) => {
    const dele = dados.filter((d) => d.responsavel === nome);
    const medidos = lancamentos.filter(({ r, d }) => d.responsavel === nome && medidoNoPrazo(r, prazos));
    const noPrazo = medidos.filter(({ r }) => lancadaNoPrazo(r, prazos)).length;
    const noIndice = dele.filter((d) => d.conforme !== null);
    return {
      nome,
      lancamentos: dele.length,
      valorTotal: dele.reduce((soma, d) => soma + (d.valor ?? 0), 0),
      icl: indiceConformidade(noIndice.filter((d) => d.conforme).length, noIndice.length),
      prazo: indicePrazo(noPrazo, medidos.length),
    };
  });
}
