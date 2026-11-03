// Faixas de desempenho dos índices do módulo Viagens (decs 192 e 199): por padrão, verde de 90% a 100%, amarelo de 70% a
// 89,9% e vermelho abaixo de 70%, valendo para o índice de conformidade de lançamento e para o de lançamento no prazo.
// Os limites e os textos se definem em Parâmetros > Veículos > Parâmetros Específicos; ficam só no navegador (modo demonstração).
export type Faixa = "verde" | "amarelo" | "vermelho";
type StorageLike = Pick<Storage, "getItem" | "setItem">;
// Duas configurações independentes (decisão 350): as faixas dos indicadores de Viagens (Parâmetros > Viagens > Parâmetros Específicos) e as dos indicadores de Veículos (Parâmetros > Veículos >
// Parâmetros Específicos). Enquanto Veículos não tem a sua gravada, vale uma cópia da de Viagens; depois de salvar, as duas seguem separadas.
export type DominioFaixas = "viagens" | "veiculos";
const CHAVES: Record<DominioFaixas, string> = { viagens: "gemape-demo-faixas-desempenho", veiculos: "gemape-demo-faixas-desempenho-veiculos" };

export type TextosFaixa = { classificacao: string; significado: string };
export type ConfigFaixas = { limiteVerde: number; limiteAmarelo: number; verde: TextosFaixa; amarelo: TextosFaixa; vermelho: TextosFaixa };

export const FAIXAS_PADRAO: ConfigFaixas = {
  limiteVerde: 90,
  limiteAmarelo: 70,
  verde: { classificacao: "Excelente / No prazo", significado: "O técnico cumpre as regras perfeitamente ou com falhas mínimas e aceitáveis (ex.: esquecer apenas 1 nota em 10)." },
  amarelo: { classificacao: "Atenção / Alerta", significado: "O técnico está gerando retrabalho para o gestor ou atrasando o fluxo financeiro com frequência moderada. Requer feedback rápido." },
  vermelho: { classificacao: "Crítico / Inaceitável", significado: "O técnico ignora os prazos ou repassa a obrigação de lançar para o gestor de forma crônica. Requer ação corretiva imediata." },
};
export const LIMITE_VERDE = FAIXAS_PADRAO.limiteVerde;
export const LIMITE_AMARELO = FAIXAS_PADRAO.limiteAmarelo;
const TAMANHO_CLASSIFICACAO = 60;
const TAMANHO_SIGNIFICADO = 300;

export type DescricaoFaixa = { faixa: Faixa; cor: string; intervalo: string; classificacao: string; significado: string };
const virgula = (n: number): string => String(n).replace(".", ",");
export function descricoesFaixas(c: ConfigFaixas = FAIXAS_PADRAO): DescricaoFaixa[] {
  const topoAmarelo = Math.round((c.limiteVerde - 0.1) * 10) / 10;
  return [
    { faixa: "verde", cor: "Verde", intervalo: `${c.limiteVerde}% a 100%`, ...c.verde },
    { faixa: "amarelo", cor: "Amarelo", intervalo: `${c.limiteAmarelo}% a ${virgula(topoAmarelo)}%`, ...c.amarelo },
    { faixa: "vermelho", cor: "Vermelho", intervalo: `Abaixo de ${c.limiteAmarelo}%`, ...c.vermelho },
  ];
}
export const FAIXAS: readonly DescricaoFaixa[] = descricoesFaixas();

// Texto do erro, ou null quando a configuração vale: limites inteiros, de 1 a 100, com o do amarelo abaixo do verde.
export function validarFaixas(c: ConfigFaixas): string | null {
  const inteiro = (n: number) => Number.isInteger(n) && n >= 1 && n <= 100;
  if (!inteiro(c.limiteVerde) || !inteiro(c.limiteAmarelo)) return "Os limites das faixas são números inteiros de 1 a 100.";
  if (c.limiteAmarelo >= c.limiteVerde) return "O limite do amarelo precisa ser menor que o do verde.";
  for (const f of [c.verde, c.amarelo, c.vermelho]) {
    if (!f.classificacao.trim() || !f.significado.trim()) return "Preencha a classificação e o significado de cada faixa.";
    if (f.classificacao.length > TAMANHO_CLASSIFICACAO) return `A classificação aceita até ${TAMANHO_CLASSIFICACAO} caracteres.`;
    if (f.significado.length > TAMANHO_SIGNIFICADO) return `O significado aceita até ${TAMANHO_SIGNIFICADO} caracteres.`;
  }
  return null;
}

const textosDe = (bruto: unknown, padrao: TextosFaixa): TextosFaixa => {
  const o = bruto && typeof bruto === "object" ? (bruto as Record<string, unknown>) : {};
  const c = o["classificacao"];
  const s = o["significado"];
  return {
    classificacao: typeof c === "string" && c.trim() && c.length <= TAMANHO_CLASSIFICACAO ? c : padrao.classificacao,
    significado: typeof s === "string" && s.trim() && s.length <= TAMANHO_SIGNIFICADO ? s : padrao.significado,
  };
};

// Valor ausente, inválido ou armazenamento bloqueado voltam ao padrão.
export function lerFaixas(storage?: StorageLike, dominio: DominioFaixas = "viagens"): ConfigFaixas {
  try {
    const armazenamento = storage ?? localStorage;
    const bruto = armazenamento.getItem(CHAVES[dominio]) ?? (dominio === "veiculos" ? armazenamento.getItem(CHAVES.viagens) : null);
    const obj: unknown = bruto === null ? null : JSON.parse(bruto);
    const o = obj && typeof obj === "object" ? (obj as Record<string, unknown>) : {};
    const lida: ConfigFaixas = {
      limiteVerde: typeof o["limiteVerde"] === "number" ? o["limiteVerde"] : FAIXAS_PADRAO.limiteVerde,
      limiteAmarelo: typeof o["limiteAmarelo"] === "number" ? o["limiteAmarelo"] : FAIXAS_PADRAO.limiteAmarelo,
      verde: textosDe(o["verde"], FAIXAS_PADRAO.verde),
      amarelo: textosDe(o["amarelo"], FAIXAS_PADRAO.amarelo),
      vermelho: textosDe(o["vermelho"], FAIXAS_PADRAO.vermelho),
    };
    return validarFaixas(lida) === null ? lida : FAIXAS_PADRAO;
  } catch {
    return FAIXAS_PADRAO;
  }
}

export function salvarFaixas(c: ConfigFaixas, storage?: StorageLike, dominio: DominioFaixas = "viagens"): void {
  const erro = validarFaixas(c);
  if (erro) throw new Error(erro);
  const limpo = (t: TextosFaixa): TextosFaixa => ({ classificacao: t.classificacao.trim(), significado: t.significado.trim() });
  try {
    (storage ?? localStorage).setItem(CHAVES[dominio], JSON.stringify({ ...c, verde: limpo(c.verde), amarelo: limpo(c.amarelo), vermelho: limpo(c.vermelho) }));
  } catch {
    throw new Error("Não foi possível guardar as faixas neste navegador.");
  }
}

// Sem índice (sem lançamentos), não há faixa. O valor é comparado como mostrado na tela: 89,95% aparece como 90% e é verde.
export function faixaDoIndice(indice: number | null, config: ConfigFaixas = lerFaixas()): DescricaoFaixa | null {
  if (indice === null || Number.isNaN(indice)) return null;
  const arredondado = Math.round(indice * 10) / 10;
  const faixa: Faixa = arredondado >= config.limiteVerde ? "verde" : arredondado >= config.limiteAmarelo ? "amarelo" : "vermelho";
  return descricoesFaixas(config).find((f) => f.faixa === faixa)!;
}

// Os indicadores de Veículos (Frota, Check list, Manutenção e Ocorrências) usam as faixas de Parâmetros > Veículos > Parâmetros Específicos; os de Viagens, as de Viagens (o padrão de `faixaDoIndice`).
export const lerFaixasDeVeiculos = (storage?: StorageLike): ConfigFaixas => lerFaixas(storage, "veiculos");
export const faixaDoIndiceDeVeiculos = (indice: number | null): DescricaoFaixa | null => faixaDoIndice(indice, lerFaixasDeVeiculos());
