// Descrição do veículo, montada sozinha (decisão 49): placa, subcategoria, marca, modelo, ano,
// cor e combustível, nesta ordem, separados por " · ". O que não foi informado fica de fora.
import { formatarPlaca } from "./veiculos.ts";

export type DadosDescricaoVeiculo = {
  placa?: string | null;
  subcategoria?: string | null;
  marca?: string | null;
  modelo?: string | null;
  ano?: number | string | null;
  cor?: string | null;
  combustivel?: string | null;
};

export function descricaoVeiculo(v: DadosDescricaoVeiculo): string {
  return [formatarPlaca(v.placa), v.subcategoria, v.marca, v.modelo, v.ano, v.cor, v.combustivel]
    .map((parte) => String(parte ?? "").trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .join(" · ");
}

// Aquisição (data, custo e nota fiscal): tudo opcional, mas o que vier precisa ser válido.
export function validarAquisicao(
  entrada: { data?: string; custo?: string; notaFiscal?: string },
  hoje: string,
): { erro?: string; data: string | null; custo: number | null; notaFiscal: string | null } {
  const data = (entrada.data ?? "").trim();
  const custoTexto = (entrada.custo ?? "").trim().replace(",", ".");
  const notaFiscal = (entrada.notaFiscal ?? "").trim().replace(/\s+/g, " ");
  const dataReal = (d: string) => {
    const t = Date.parse(`${d}T00:00:00Z`);
    return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === d;
  };
  if (data && (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !dataReal(data))) {
    return { erro: "Data de aquisição inválida.", data: null, custo: null, notaFiscal: null };
  }
  if (data && data > hoje) {
    return { erro: "A data de aquisição não pode ser futura.", data: null, custo: null, notaFiscal: null };
  }
  const custoOk = !custoTexto || (/^\d{1,12}(\.\d{1,2})?$/.test(custoTexto));
  const custo = custoTexto && custoOk ? Number(custoTexto) : null;
  if (!custoOk) {
    return { erro: "Custo inválido. Informe um valor de 0 em diante.", data: null, custo: null, notaFiscal: null };
  }
  return {
    data: data || null,
    custo: custo === null ? null : Math.round(custo * 100) / 100,
    notaFiscal: notaFiscal || null,
  };
}
