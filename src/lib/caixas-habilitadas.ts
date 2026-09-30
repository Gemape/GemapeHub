// Caixas de ferramentas numeradas de 01 a 100 (Caixas e Portador, etapa 1). A habilitação
// fica em Cadastros > Gerais; o código segue sigla + numeração, de CX-0001 a CX-0100,
// numa sequência única para as três empresas.
export const TOTAL_CAIXAS = 100;

type CaixaNumerada = {
  id: string;
  nome?: string | null;
  codigo?: string | null;
  codigo_num?: number | null;
};

const valido = (n: unknown): n is number =>
  Number.isInteger(n) && (n as number) >= 1 && (n as number) <= TOTAL_CAIXAS;

export const codigoCaixa = (numero: number) => `CX-${String(numero).padStart(4, "0")}`;

/** Número mostrado nas listas: 01 a 100. */
export const rotuloNumeroCaixa = (numero: number) => String(numero).padStart(2, "0");

/** Número da caixa (1 a 100), lido de codigo_num ou, em caixas antigas, do código. */
export function numeroDaCaixa(caixa: Pick<CaixaNumerada, "codigo" | "codigo_num">): number | null {
  if (valido(caixa.codigo_num)) return caixa.codigo_num;
  const doCodigo = /^CX-(\d{4})$/.exec(caixa.codigo ?? "");
  const numero = doCodigo ? Number(doCodigo[1]) : null;
  return valido(numero) ? numero : null;
}

/** Confere a lista de caixas habilitadas: números de 1 a 100 e nenhuma caixa cadastrada fora dela. */
export function validarHabilitacao(numeros: number[], cadastradas: CaixaNumerada[]): string | null {
  if (numeros.some((n) => !valido(n))) return "As caixas são numeradas de 1 a 100.";
  const habilitadas = new Set(numeros);
  for (const caixa of cadastradas) {
    const numero = numeroDaCaixa(caixa);
    if (numero !== null && !habilitadas.has(numero)) {
      return `A caixa ${codigoCaixa(numero)} (${caixa.nome ?? "sem nome"}) está cadastrada e não pode ser desabilitada. Exclua a caixa antes.`;
    }
  }
  return null;
}

const usados = (cadastradas: CaixaNumerada[], idAtual?: string) =>
  new Set(
    cadastradas
      .filter((c) => c.id !== idAtual)
      .map(numeroDaCaixa)
      .filter((n): n is number => n !== null),
  );

/** Números habilitados ainda sem caixa (na edição, inclui o da própria caixa). */
export function numerosDisponiveis(
  habilitadas: number[],
  cadastradas: CaixaNumerada[],
  idAtual?: string,
): number[] {
  const ocupados = usados(cadastradas, idAtual);
  return [...new Set(habilitadas)].filter((n) => !ocupados.has(n)).sort((a, b) => a - b);
}

export function validarNumeroCaixa(
  numero: number | null,
  habilitadas: number[],
  cadastradas: CaixaNumerada[],
  idAtual?: string,
): string | null {
  if (!valido(numero)) return "Selecione o número da caixa.";
  if (!habilitadas.includes(numero)) {
    return `A caixa ${codigoCaixa(numero)} não está habilitada em Cadastros > Gerais > Caixas.`;
  }
  if (usados(cadastradas, idAtual).has(numero)) return `Já existe a caixa ${codigoCaixa(numero)}.`;
  return null;
}

/** Caixas que podem ser escolhidas: número habilitado, em ordem de número. */
export function caixasHabilitadas<T extends CaixaNumerada>(
  caixas: T[],
  habilitadas: number[],
): T[] {
  const permitidas = new Set(habilitadas);
  return caixas
    .filter((c) => {
      const numero = numeroDaCaixa(c);
      return numero !== null && permitidas.has(numero);
    })
    .sort((a, b) => (numeroDaCaixa(a) ?? 0) - (numeroDaCaixa(b) ?? 0));
}
