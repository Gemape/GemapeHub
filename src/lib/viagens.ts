// Módulo Viagens (decisão 176): cada resposta registrada do Questionário de Despesas é um lançamento na coleção única de
// despesas (modo demonstração, no navegador). Os campos que os indicadores e o relatório usam saem das respostas pelo número
// da pergunta de sistema; o que não foi respondido fica nulo.
import { ID_HABILITADOS as ID_PERGUNTA_HABILITADOS, ID_TECNICO_RESPONSAVEL } from "./questionario-despesas.ts";
import { valorNumerico } from "./questionario-respostas.ts";
import { PRAZO_PADRAO_DIAS } from "./prazo-viagens.ts";
import type { RespostaRegistrada } from "./respostas-despesas.ts";

export { ID_PERGUNTA_HABILITADOS };
export const ID_PERGUNTA_CLIENTE = "q-07";
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
  // Técnico dono da despesa: quem lançou, se é da Oficina; senão o técnico responsável informado (pergunta 14).
  responsavel: string | null;
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
  const responsavel = area === "Oficina" ? quemLanca!.nome : gestor ? (nomeEArea(resposta(r, ID_TECNICO_RESPONSAVEL))?.nome ?? null) : null;
  return {
    tipo: r.tipo,
    dataDespesa: dataIso(resposta(r, ID_PERGUNTA_DATA)),
    valor: valor !== null && /\d/.test(valor) ? valorNumerico(valor) : null,
    cliente: resposta(r, ID_PERGUNTA_CLIENTE),
    descricao: resposta(r, ID_PERGUNTA_DETALHAMENTO),
    tecnico: quemLanca?.nome ?? null,
    tecnicoArea: area,
    responsavel,
    conforme: avulso || responsavel === null ? null : !gestor,
  };
}

// ---- Indicadores do painel (dec 177) ----

export type PeriodoMes = { ano: number; mes: number };
export const periodoAtual = (agora = new Date()): PeriodoMes => ({ ano: agora.getFullYear(), mes: agora.getMonth() + 1 });
export const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"] as const;
export const rotuloPeriodo = (p: PeriodoMes): string => `${MESES[p.mes - 1] ?? ""} de ${p.ano}`;

// O lançamento pertence ao mês da data da despesa; sem ela, ao mês em que foi registrado.
const dataDoLancamento = (r: RespostaRegistrada): string => dadosDoLancamento(r).dataDespesa ?? r.data;
export const lancamentosDoPeriodo = (lista: readonly RespostaRegistrada[], p: PeriodoMes): RespostaRegistrada[] =>
  lista.filter((r) => dataDoLancamento(r).startsWith(`${p.ano}-${String(p.mes).padStart(2, "0")}-`));

// Dias de calendário entre duas datas "aaaa-mm-dd" (sem depender de fuso).
export const diasEntre = (de: string, ate: string): number => Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000);

// Índice de lançamento no prazo (dec 190): o lançamento é registrado até `prazoDias` dias depois da data da despesa.
// Sem data da despesa, vale o dia do registro; despesa com data futura ao registro não conta como no prazo.
export function lancadaNoPrazo(r: RespostaRegistrada, prazoDias: number = PRAZO_PADRAO_DIAS): boolean {
  const atraso = diasEntre(dadosDoLancamento(r).dataDespesa ?? r.data, r.data);
  return atraso >= 0 && atraso <= prazoDias;
}
export const indicePrazo = (noPrazo: number, total: number): number | null => (total > 0 ? (noPrazo / total) * 100 : null);

// Índice de conformidade de lançamento: lançadas pelo técnico / total do técnico (técnico + gestor) x 100; nulo sem lançamentos no índice.
export const indiceConformidade = (conformes: number, total: number): number | null => (total > 0 ? (conformes / total) * 100 : null);
export const formatarPercentual = (v: number | null): string => (v === null ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
export const formatarMoeda = (v: number): string => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export type IndicadoresGlobais = { quantidade: number; custoTotal: number; naoConformes: number; noIndice: number; icl: number | null; noPrazo: number; prazo: number | null };
export function indicadoresGlobais(lista: readonly RespostaRegistrada[], p: PeriodoMes, prazoDias: number = PRAZO_PADRAO_DIAS): IndicadoresGlobais {
  const lancamentos = lancamentosDoPeriodo(lista, p);
  const dados = lancamentos.map(dadosDoLancamento);
  const noPrazo = lancamentos.filter((r) => lancadaNoPrazo(r, prazoDias)).length;
  const noIndice = dados.filter((d) => d.conforme !== null);
  const conformes = noIndice.filter((d) => d.conforme).length;
  return {
    quantidade: dados.length,
    custoTotal: dados.reduce((soma, d) => soma + (d.valor ?? 0), 0),
    naoConformes: noIndice.length - conformes,
    noIndice: noIndice.length,
    icl: indiceConformidade(conformes, noIndice.length),
    noPrazo,
    prazo: indicePrazo(noPrazo, lancamentos.length),
  };
}

export type ResultadoTecnico = { nome: string; lancamentos: number; valorTotal: number; icl: number | null; prazo: number | null };
// Uma linha para cada técnico habilitado, mesmo sem lançamentos no mês.
export function resultadosTecnicos(lista: readonly RespostaRegistrada[], p: PeriodoMes, tecnicos: readonly string[], prazoDias: number = PRAZO_PADRAO_DIAS): ResultadoTecnico[] {
  const lancamentos = lancamentosDoPeriodo(lista, p).map((r) => ({ r, d: dadosDoLancamento(r) }));
  const dados = lancamentos.map(({ d }) => d);
  return tecnicos.map((nome) => {
    const dele = dados.filter((d) => d.responsavel === nome);
    const noPrazo = lancamentos.filter(({ r, d }) => d.responsavel === nome && lancadaNoPrazo(r, prazoDias)).length;
    const noIndice = dele.filter((d) => d.conforme !== null);
    return {
      nome,
      lancamentos: dele.length,
      valorTotal: dele.reduce((soma, d) => soma + (d.valor ?? 0), 0),
      icl: indiceConformidade(noIndice.filter((d) => d.conforme).length, noIndice.length),
      prazo: indicePrazo(noPrazo, dele.length),
    };
  });
}
