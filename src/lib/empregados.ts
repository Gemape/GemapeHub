// Regras do cadastro de empregados (especificação rev1 + decisão especial 12).

const digitos = (v: string) => v.replace(/\D/g, "");

export function cpfValido(cpf: string): boolean {
  const d = digitos(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const verificador = (tamanho: number) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(d[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return verificador(9) === Number(d[9]) && verificador(10) === Number(d[10]);
}

export function formatarCpf(cpf: string): string {
  const d = digitos(cpf);
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : cpf;
}

// Matrícula interna LxPx: livro x, página x (ex.: L3P25). Guarda em maiúsculas, sem espaços.
export const normalizarMatricula = (m: string) => m.toUpperCase().replace(/\s+/g, "");
export const matriculaValida = (m: string) => /^L\d+P\d+$/.test(normalizarMatricula(m));

export const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

export type DadosEmpregado = {
  nome: string;
  cpf: string;
  matricula: string;
  empresa_id: string;
  email: string;
  data_admissao: string;
  data_demissao: string;
};

type Existente = { id: string; cpf: string | null; matricula: string | null; ativo?: boolean };

// Valida e prepara os valores para salvar. Na edição, CPF e matrícula antigos que não seguem
// o padrão podem continuar como estão, sem reformatar. Com data de demissão, o empregado
// fica inativo; um empregado já inativo sem data continua inativo.
export function prepararEmpregado(
  dados: DadosEmpregado,
  outros: Existente[],
  anterior?: Existente,
): Record<string, string | boolean | null> {
  const nome = dados.nome.trim().replace(/\s+/g, " ");
  let cpf = formatarCpf(dados.cpf.trim());
  let matricula = normalizarMatricula(dados.matricula);
  const email = dados.email.trim().toLowerCase();
  if (!nome) throw new Error("Informe o nome completo.");
  const cpfMantido = anterior && digitos(cpf) === digitos(anterior.cpf ?? "");
  if (!cpfMantido && !cpfValido(cpf)) throw new Error("CPF inválido.");
  if (cpfMantido) cpf = anterior.cpf ?? cpf;
  const matriculaMantida = anterior && matricula === normalizarMatricula(anterior.matricula ?? "");
  if (matriculaMantida) matricula = anterior.matricula ?? matricula;
  if (matricula && !matriculaMantida && !matriculaValida(matricula)) {
    throw new Error("Matrícula no formato LxPx (livro e página), ex.: L3P25.");
  }
  if (!dados.empresa_id) throw new Error("Selecione a empresa.");
  if (email && !emailValido(email)) throw new Error("E-mail inválido.");
  if (dados.data_admissao && dados.data_demissao && dados.data_demissao < dados.data_admissao) {
    throw new Error("A data de demissão não pode ser anterior à admissão.");
  }
  // Valor que não mudou na edição não é conferido de novo (dados antigos podem repetir).
  const outrosSemEste = outros.filter((o) => o.id !== anterior?.id);
  if (!cpfMantido && outrosSemEste.some((o) => digitos(o.cpf ?? "") === digitos(cpf))) {
    throw new Error("Já existe um empregado com este CPF.");
  }
  if (
    matricula &&
    !matriculaMantida &&
    outrosSemEste.some((o) => normalizarMatricula(o.matricula ?? "") === matricula)
  ) {
    throw new Error("Já existe um empregado com esta matrícula.");
  }
  return {
    nome,
    cpf,
    matricula: matricula || null,
    empresa_id: dados.empresa_id,
    email: email || null,
    data_admissao: dados.data_admissao || null,
    data_demissao: dados.data_demissao || null,
    ativo: !dados.data_demissao && anterior?.ativo !== false,
  };
}

// Ativos no bloco de cima, demitidos no de baixo, cada um em ordem de nome.
export const empregadoAtivo = (e: { ativo: boolean; data_demissao: string | null }) =>
  e.ativo && !e.data_demissao;

export function separarEmpregados<
  T extends { nome: string; ativo: boolean; data_demissao: string | null },
>(lista: T[]): { ativos: T[]; inativos: T[] } {
  const ordenar = (a: T, b: T) => a.nome.localeCompare(b.nome, "pt-BR");
  const inativo = (e: T) => !empregadoAtivo(e);
  return {
    ativos: lista.filter((e) => !inativo(e)).sort(ordenar),
    inativos: lista.filter(inativo).sort(ordenar),
  };
}
