// Parâmetros dos indicadores do módulo Equipamentos, como os de Viagens em Parâmetros > Veículos > Parâmetros Específicos: o que era número fixo no cálculo
// (jornada, metas e faixas de semáforo, prazos legais e de vistoria) passa a ser configurado em Parâmetros > Equipamentos > Parâmetros Específicos > Indicadores.
// Ficam só no navegador (modo demonstração); valor ausente, inválido ou armazenamento bloqueado voltam ao padrão.
type StorageLike = Pick<Storage, "getItem" | "setItem">;
const CHAVE = "gemape-demo-kpis-equipamento";

export type MetaPct = { verde: number; amarelo: number };
export const PERIODICIDADES_VISTORIA = ["Diária", "Semanal", "Quinzenal", "Mensal"] as const;
export type PeriodicidadeVistoria = (typeof PERIODICIDADES_VISTORIA)[number];
export const PERIODOS_PADRAO = [30, 90, 180, 365] as const;

export type ConfigKpisEquipamento = {
  periodoPadraoDias: number; // um de PERIODOS_PADRAO
  jornadaHoras: number; // horas por dia útil, base da disponibilidade
  disponibilidade: MetaPct;
  preventiva: MetaPct;
  aderencia: MetaPct;
  conformidade: MetaPct;
  custoFatorAmarelo: number; // custo por hora até esta vez a média da frota ainda é amarelo; acima, vermelho
  recargaExtintorMeses: number;
  inspecaoVasoMeses: number;
  prazoVistoriaDias: Record<PeriodicidadeVistoria, number>; // dias que a vistoria de cada periodicidade vale
  exigirSemOcorrenciaAberta: boolean; // requisito de empilhadeiras e máquinas (NR-11 e NR-12)
  prontoOcorrenciaAberta: boolean; // ocorrência aberta tira o equipamento de "pronto agora"
  prontoVistoriaNok: boolean; // vistoria com item NOK pendente tira o equipamento de "pronto agora"
};

export const CONFIG_KPIS_PADRAO: ConfigKpisEquipamento = {
  periodoPadraoDias: 90,
  jornadaHoras: 8,
  disponibilidade: { verde: 90, amarelo: 80 },
  preventiva: { verde: 70, amarelo: 50 },
  aderencia: { verde: 90, amarelo: 70 },
  conformidade: { verde: 100, amarelo: 80 },
  custoFatorAmarelo: 1.5,
  recargaExtintorMeses: 12,
  inspecaoVasoMeses: 12,
  prazoVistoriaDias: { "Diária": 1, "Semanal": 7, "Quinzenal": 15, "Mensal": 30 },
  exigirSemOcorrenciaAberta: true,
  prontoOcorrenciaAberta: true,
  prontoVistoriaNok: true,
};

const ehNumero = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const inteiro = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max;

// Texto do erro, ou null quando a configuração vale.
export function validarConfigKpis(c: ConfigKpisEquipamento): string | null {
  if (!(PERIODOS_PADRAO as readonly number[]).includes(c.periodoPadraoDias)) return "O período padrão é 30, 90, 180 dias ou 12 meses.";
  if (!inteiro(c.jornadaHoras, 1, 24)) return "A jornada é um número inteiro de horas por dia, de 1 a 24.";
  const metas: [string, MetaPct][] = [["Disponibilidade", c.disponibilidade], ["Razão preventiva/corretiva", c.preventiva], ["Aderência ao plano", c.aderencia], ["Conformidade legal", c.conformidade]];
  for (const [nome, m] of metas) {
    if (!inteiro(m.verde, 1, 100) || !inteiro(m.amarelo, 1, 100)) return `${nome}: os limites são números inteiros de 1 a 100.`;
    if (m.amarelo >= m.verde) return `${nome}: o limite do amarelo precisa ser menor que o do verde.`;
  }
  if (!ehNumero(c.custoFatorAmarelo) || c.custoFatorAmarelo < 1 || c.custoFatorAmarelo > 10) return "O fator do custo por hora vai de 1 a 10 vezes a média da frota.";
  if (!inteiro(c.recargaExtintorMeses, 1, 60)) return "A validade da recarga do extintor é um número inteiro de 1 a 60 meses.";
  if (!inteiro(c.inspecaoVasoMeses, 1, 60)) return "A validade da inspeção do vaso de pressão é um número inteiro de 1 a 60 meses.";
  for (const p of PERIODICIDADES_VISTORIA) if (!inteiro(c.prazoVistoriaDias[p], 1, 366)) return `O prazo da vistoria ${p.toLowerCase()} é um número inteiro de 1 a 366 dias.`;
  return null;
}

const metaDe = (bruto: unknown, padrao: MetaPct): MetaPct => {
  const o = bruto && typeof bruto === "object" ? (bruto as Record<string, unknown>) : {};
  return { verde: ehNumero(o["verde"]) ? o["verde"] : padrao.verde, amarelo: ehNumero(o["amarelo"]) ? o["amarelo"] : padrao.amarelo };
};

export function lerConfigKpis(storage?: StorageLike): ConfigKpisEquipamento {
  try {
    const bruto = (storage ?? localStorage).getItem(CHAVE);
    const obj: unknown = bruto === null ? null : JSON.parse(bruto);
    const o = obj && typeof obj === "object" ? (obj as Record<string, unknown>) : {};
    const prazos = o["prazoVistoriaDias"] && typeof o["prazoVistoriaDias"] === "object" ? (o["prazoVistoriaDias"] as Record<string, unknown>) : {};
    const lida: ConfigKpisEquipamento = {
      periodoPadraoDias: ehNumero(o["periodoPadraoDias"]) ? o["periodoPadraoDias"] : CONFIG_KPIS_PADRAO.periodoPadraoDias,
      jornadaHoras: ehNumero(o["jornadaHoras"]) ? o["jornadaHoras"] : CONFIG_KPIS_PADRAO.jornadaHoras,
      disponibilidade: metaDe(o["disponibilidade"], CONFIG_KPIS_PADRAO.disponibilidade),
      preventiva: metaDe(o["preventiva"], CONFIG_KPIS_PADRAO.preventiva),
      aderencia: metaDe(o["aderencia"], CONFIG_KPIS_PADRAO.aderencia),
      conformidade: metaDe(o["conformidade"], CONFIG_KPIS_PADRAO.conformidade),
      custoFatorAmarelo: ehNumero(o["custoFatorAmarelo"]) ? o["custoFatorAmarelo"] : CONFIG_KPIS_PADRAO.custoFatorAmarelo,
      recargaExtintorMeses: ehNumero(o["recargaExtintorMeses"]) ? o["recargaExtintorMeses"] : CONFIG_KPIS_PADRAO.recargaExtintorMeses,
      inspecaoVasoMeses: ehNumero(o["inspecaoVasoMeses"]) ? o["inspecaoVasoMeses"] : CONFIG_KPIS_PADRAO.inspecaoVasoMeses,
      prazoVistoriaDias: Object.fromEntries(PERIODICIDADES_VISTORIA.map((p) => [p, ehNumero(prazos[p]) ? prazos[p] : CONFIG_KPIS_PADRAO.prazoVistoriaDias[p]])) as Record<PeriodicidadeVistoria, number>,
      exigirSemOcorrenciaAberta: typeof o["exigirSemOcorrenciaAberta"] === "boolean" ? o["exigirSemOcorrenciaAberta"] : CONFIG_KPIS_PADRAO.exigirSemOcorrenciaAberta,
      prontoOcorrenciaAberta: typeof o["prontoOcorrenciaAberta"] === "boolean" ? o["prontoOcorrenciaAberta"] : CONFIG_KPIS_PADRAO.prontoOcorrenciaAberta,
      prontoVistoriaNok: typeof o["prontoVistoriaNok"] === "boolean" ? o["prontoVistoriaNok"] : CONFIG_KPIS_PADRAO.prontoVistoriaNok,
    };
    return validarConfigKpis(lida) === null ? lida : CONFIG_KPIS_PADRAO;
  } catch {
    return CONFIG_KPIS_PADRAO;
  }
}

export function salvarConfigKpis(c: ConfigKpisEquipamento, storage?: StorageLike): void {
  const erro = validarConfigKpis(c);
  if (erro) throw new Error(erro);
  (storage ?? localStorage).setItem(CHAVE, JSON.stringify(c));
  if (typeof window !== "undefined") window.dispatchEvent(new Event("gemape-kpis-equipamento"));
}
export const CHAVE_CONFIG_KPIS = CHAVE;
