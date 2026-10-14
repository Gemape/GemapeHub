// Módulo Viagens (decisão 176): cada resposta registrada do Questionário de Despesas é um lançamento na coleção única de
// despesas (modo demonstração, no navegador). Os campos que os indicadores e o relatório usam saem das respostas pelo número
// da pergunta de sistema; o que não foi respondido fica nulo.
import { valorNumerico } from "./questionario-respostas.ts";
import type { RespostaRegistrada } from "./respostas-despesas.ts";

export const ID_PERGUNTA_HABILITADOS = "q-04";
export const ID_PERGUNTA_CLIENTE = "q-07";
export const ID_PERGUNTA_DATA = "q-08";
export const ID_PERGUNTA_DETALHAMENTO = "q-09";
export const ID_PERGUNTA_VALOR = "q-11";

export type DadosLancamento = {
  tipo: string;
  dataDespesa: string | null;
  valor: number | null;
  cliente: string | null;
  descricao: string | null;
  tecnico: string | null;
  tecnicoArea: string | null;
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

export function dadosDoLancamento(r: RespostaRegistrada): DadosLancamento {
  const valor = resposta(r, ID_PERGUNTA_VALOR);
  const habilitado = resposta(r, ID_PERGUNTA_HABILITADOS);
  // O habilitado é guardado como "Nome (Área)"; se mais de um foi marcado, vale o primeiro.
  const partes = habilitado ? /^(.+?) \(([^()]*)\)/.exec(habilitado) : null;
  return {
    tipo: r.tipo,
    dataDespesa: dataIso(resposta(r, ID_PERGUNTA_DATA)),
    valor: valor !== null && /\d/.test(valor) ? valorNumerico(valor) : null,
    cliente: resposta(r, ID_PERGUNTA_CLIENTE),
    descricao: resposta(r, ID_PERGUNTA_DETALHAMENTO),
    tecnico: partes ? partes[1]!.trim() : habilitado,
    tecnicoArea: partes ? partes[2]!.trim() : null,
  };
}
