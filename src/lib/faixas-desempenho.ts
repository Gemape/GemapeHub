// Faixas de desempenho dos índices do módulo Viagens (dec 192): verde de 90% a 100%, amarelo de 70% a 89,9% e vermelho
// abaixo de 70%, valendo para o índice de conformidade de lançamento e para o índice de lançamento no prazo.
export type Faixa = "verde" | "amarelo" | "vermelho";

export const LIMITE_VERDE = 90;
export const LIMITE_AMARELO = 70;

export type DescricaoFaixa = { faixa: Faixa; cor: string; intervalo: string; classificacao: string; significado: string };
export const FAIXAS: readonly DescricaoFaixa[] = [
  { faixa: "verde", cor: "Verde", intervalo: "90% a 100%", classificacao: "Excelente / No prazo", significado: "O técnico cumpre as regras perfeitamente ou com falhas mínimas e aceitáveis (ex.: esquecer apenas 1 nota em 10)." },
  { faixa: "amarelo", cor: "Amarelo", intervalo: "70% a 89,9%", classificacao: "Atenção / Alerta", significado: "O técnico está gerando retrabalho para o gestor ou atrasando o fluxo financeiro com frequência moderada. Requer feedback rápido." },
  { faixa: "vermelho", cor: "Vermelho", intervalo: "Abaixo de 70%", classificacao: "Crítico / Inaceitável", significado: "O técnico ignora os prazos ou repassa a obrigação de lançar para o gestor de forma crônica. Requer ação corretiva imediata." },
];

// Sem índice (sem lançamentos), não há faixa. O valor é comparado como mostrado na tela: 89,95% aparece como 90% e é verde.
export function faixaDoIndice(indice: number | null): DescricaoFaixa | null {
  if (indice === null || Number.isNaN(indice)) return null;
  const arredondado = Math.round(indice * 10) / 10;
  const faixa: Faixa = arredondado >= LIMITE_VERDE ? "verde" : arredondado >= LIMITE_AMARELO ? "amarelo" : "vermelho";
  return FAIXAS.find((f) => f.faixa === faixa)!;
}
