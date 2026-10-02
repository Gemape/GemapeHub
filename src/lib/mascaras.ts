// Máscaras aplicadas enquanto se digita (CNPJ, telefone e CEP). Só mexem no que aparece no
// campo; a validação e o salvamento continuam em formatacao-cadastral.ts.
import type { FormEvent } from "react";

const digitos = (valor: string, maximo: number) => valor.replace(/\D/g, "").slice(0, maximo);

export function mascararCnpj(valor: string): string {
  const d = digitos(valor, 14);
  let saida = d.slice(0, 2);
  if (d.length > 2) saida += `.${d.slice(2, 5)}`;
  if (d.length > 5) saida += `.${d.slice(5, 8)}`;
  if (d.length > 8) saida += `/${d.slice(8, 12)}`;
  if (d.length > 12) saida += `-${d.slice(12)}`;
  return saida;
}

export function mascararCep(valor: string): string {
  const d = digitos(valor, 8);
  let saida = d.slice(0, 2);
  if (d.length > 2) saida += `.${d.slice(2, 5)}`;
  if (d.length > 5) saida += `-${d.slice(5)}`;
  return saida;
}

// Até 10 dígitos segue o fixo, (XX)XXXX.XXXX; o 11º dígito troca para o celular, (XX)X.XXXX.XXXX.
export function mascararTelefone(valor: string): string {
  const d = digitos(valor, 11);
  if (d.length === 0) return "";
  let saida = `(${d.slice(0, 2)}`;
  if (d.length <= 2) return saida;
  if (d.length === 11) {
    return `${saida})${d[2]}.${d.slice(3, 7)}.${d.slice(7)}`;
  }
  saida += `)${d.slice(2, 6)}`;
  if (d.length > 6) saida += `.${d.slice(6)}`;
  return saida;
}

export function mascaraDoCampo(nome: string): ((valor: string) => string) | undefined {
  if (nome === "cnpj") return mascararCnpj;
  if (nome === "cep") return mascararCep;
  if (nome === "telefone") return mascararTelefone;
  return undefined;
}

// Para o onInput de um campo não controlado: reescreve o texto do campo já com a máscara.
export function aoDigitarMascarado(nome: string) {
  const mascara = mascaraDoCampo(nome);
  if (!mascara) return undefined;
  return (e: FormEvent<HTMLInputElement>) => {
    const campo = e.currentTarget;
    const mascarado = mascara(campo.value);
    if (mascarado !== campo.value) campo.value = mascarado;
  };
}
