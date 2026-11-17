// Validação ao sair do campo: devolve a mensagem do problema (ou null se está bom), com as mesmas regras do Salvar,
// para o operador descobrir o erro na hora e não só depois de preencher o formulário inteiro.
import { cpfValido, formatarCpf, matriculaValida, normalizarMatricula } from "./empregados.ts";
import { normalizarPlaca, placaRepetida, placaValida } from "./veiculos.ts";

const digitos = (v: string) => v.replace(/\D/g, "");

type Empregado = { id: string; cpf: string | null; matricula: string | null };

/** CPF: formato/dígitos e repetição em outro empregado. `anterior` é o empregado em edição (valor que não mudou não é conferido). */
export function validarCpfCampo(valor: string, outros: readonly Empregado[], anterior?: Empregado): string | null {
  if (!valor.trim()) return null; // obrigatório é cobrado no Salvar; aqui só o que foi digitado
  if (anterior && digitos(valor) === digitos(anterior.cpf ?? "")) return null;
  if (!cpfValido(formatarCpf(valor.trim()))) return "CPF inválido. Confira os 11 dígitos.";
  if (outros.some((o) => o.id !== anterior?.id && digitos(o.cpf ?? "") === digitos(valor))) return "Já existe um empregado com este CPF.";
  return null;
}

export function validarMatriculaCampo(valor: string, outros: readonly Empregado[], anterior?: Empregado): string | null {
  const m = normalizarMatricula(valor);
  if (!m) return null;
  if (anterior && m === normalizarMatricula(anterior.matricula ?? "")) return null;
  if (!matriculaValida(m)) return "Use o formato LxPx (livro e página), ex.: L3P25.";
  if (outros.some((o) => o.id !== anterior?.id && normalizarMatricula(o.matricula ?? "") === m)) return "Já existe um empregado com esta matrícula.";
  return null;
}

export function validarPlacaCampo(valor: string, veiculos: readonly { id: string; placa: string | null }[], anterior?: { id: string; placa: string | null }): string | null {
  if (!valor.trim()) return null;
  if (anterior && normalizarPlaca(valor) === normalizarPlaca(anterior.placa ?? "")) return null;
  if (!placaValida(valor)) return "Placa inválida. Use ABC-1234 ou ABC1D23.";
  if (placaRepetida(valor, [...veiculos], anterior?.id)) return "Já existe um veículo com esta placa.";
  return null;
}

/** Número de série (ou patrimônio) repetido em outro registro. */
export function validarSerieCampo(valor: string, outros: readonly { id: string; serie: string | null }[], ignorarId?: string): string | null {
  const v = valor.trim().toUpperCase();
  if (!v) return null;
  return outros.some((o) => o.id !== ignorarId && (o.serie ?? "").trim().toUpperCase() === v) ? "Já existe um registro com este número de série." : null;
}

// Campos de cadastros comuns (Clientes, Fornecedores, Empresas): vazio não é erro aqui; obrigatório é cobrado no Salvar.
export function validarCpfSimples(valor: string): string | null {
  if (!valor.trim()) return null;
  return cpfValido(formatarCpf(valor.trim())) ? null : "CPF inválido. Confira os 11 dígitos.";
}
export function validarCnpjCampo(valor: string): string | null {
  if (!valor.trim()) return null;
  return digitos(valor).length === 14 ? null : "CNPJ incompleto. Informe os 14 dígitos.";
}
export function validarCepCampo(valor: string): string | null {
  if (!valor.trim()) return null;
  return digitos(valor).length === 8 ? null : "CEP incompleto. Informe os 8 dígitos.";
}
export function validarTelefoneCampo(valor: string): string | null {
  if (!valor.trim()) return null;
  return [10, 11].includes(digitos(valor).length) ? null : "Telefone incompleto. Informe DDD e número (10 ou 11 dígitos).";
}
export function validarEmailCampo(valor: string): string | null {
  if (!valor.trim()) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim()) ? null : "E-mail inválido. Use o formato nome@empresa.com.br.";
}
