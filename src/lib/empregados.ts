// Regras do cadastro de empregados (especificação rev1 + decisão especial 12).
import { capitalizarNomePessoa } from "./formatacao-cadastral.ts";

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

// Máscara de digitação: mostra o CPF no padrão xxx.xxx.xxx-xx enquanto a pessoa digita.
export function mascararCpf(valor: string): string {
  const d = digitos(valor).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
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

type Existente = {
  id: string;
  cpf: string | null;
  matricula: string | null;
  ativo?: boolean;
  data_demissao?: string | null;
};

// Data de hoje no fuso local, no formato das colunas de data (AAAA-MM-DD).
export function hojeLocal(agora = new Date()): string {
  const d = (n: number) => String(n).padStart(2, "0");
  return `${agora.getFullYear()}-${d(agora.getMonth() + 1)}-${d(agora.getDate())}`;
}

// Decisão do responsável (30/09/2026): o empregado continua ativo até a data de demissão
// chegar. A partir dessa data, a demissão está vencida.
export const demissaoVencida = (e: { data_demissao?: string | null }, hoje = hojeLocal()) =>
  !!e.data_demissao && e.data_demissao <= hoje;

// Valida e prepara os valores para salvar. Na edição, CPF e matrícula antigos que não seguem
// o padrão podem continuar como estão, sem reformatar. Com demissão vencida, o empregado
// fica inativo; com demissão futura, continua ativo até a data. Um empregado inativado à
// mão (sem data de demissão) continua inativo.
export function prepararEmpregado(
  dados: DadosEmpregado,
  outros: Existente[],
  anterior?: Existente,
  hoje = hojeLocal(),
): Record<string, string | boolean | null> {
  const nome = capitalizarNomePessoa(dados.nome);
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
    ativo: !demissaoVencida(dados, hoje) && !(anterior?.ativo === false && !anterior.data_demissao),
  };
}

export const empregadoAtivo = (
  e: { ativo: boolean; data_demissao: string | null },
  hoje = hojeLocal(),
) => e.ativo && !demissaoVencida(e, hoje);

const dataBr = (iso: string) => iso.split("-").reverse().join("/");

export type OperacaoEmpregado = "entrega" | "baixa" | "devolucao" | "movimentacao" | "encerramento";

// Movimentação para empregado com demissão vencida é bloqueada: vale a data de hoje e
// também a data da movimentação, se for posterior (não dá para lançar hoje uma entrega
// datada depois da demissão). Exceção (decisão do responsável, 30/09/2026): o termo de
// encerramento, a devolução na saída, é liberado, porque é o que fecha o ciclo do empregado.
// Devolve a mensagem para o usuário, ou null quando a movimentação pode seguir.
export function bloqueioPorDemissao(
  e: { nome: string; data_demissao: string | null } | null | undefined,
  operacao: OperacaoEmpregado,
  dataMovimentacao = "",
  hoje = hojeLocal(),
): string | null {
  if (operacao === "encerramento") return null;
  const referencia = dataMovimentacao > hoje ? dataMovimentacao : hoje;
  if (!e?.data_demissao || !demissaoVencida(e, referencia)) return null;
  return `${e.nome} foi demitido(a) em ${dataBr(e.data_demissao)}. Não é possível registrar entrega, devolução ou baixa para este empregado. A devolução na saída é feita pelo Termo de Encerramento de ferramentas.`;
}

// Ativos no bloco de cima, demitidos no de baixo, cada um em ordem de nome.
export function separarEmpregados<
  T extends { nome: string; ativo: boolean; data_demissao: string | null },
>(lista: T[], hoje = hojeLocal()): { ativos: T[]; inativos: T[] } {
  const ordenar = (a: T, b: T) => a.nome.localeCompare(b.nome, "pt-BR");
  const inativo = (e: T) => !empregadoAtivo(e, hoje);
  return {
    ativos: lista.filter((e) => !inativo(e)).sort(ordenar),
    inativos: lista.filter(inativo).sort(ordenar),
  };
}
