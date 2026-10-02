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
  let d = valor.replace(/\D/g, "");
  // Colado com DDI (55) ou com zero do DDD: o prefixo sai só quando sobram dígitos.
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  else if (d.length > 11 && d.startsWith("0")) d = d.slice(1);
  d = d.slice(0, 11);
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

const contaDigitos = (texto: string) => texto.replace(/\D/g, "").length;

// Aplica a máscara e acha onde fica o cursor: logo depois do mesmo dígito em que estava, para
// editar no meio do campo não jogar o cursor para o fim. Se o backspace só apagou pontuação
// (mesma quantidade de dígitos que antes), apaga também o dígito anterior, senão a máscara
// repõe a pontuação e o campo não deixa apagar.
export function reaplicarMascara(
  mascara: (valor: string) => string,
  valor: string,
  cursor: number,
  apagouParaTras: boolean,
  anterior = "",
): { texto: string; cursor: number } {
  let bruto = valor;
  let antes = contaDigitos(valor.slice(0, cursor));
  if (apagouParaTras && antes > 0 && contaDigitos(valor) === contaDigitos(anterior)) {
    let visto = 0;
    let indice = -1;
    for (let i = 0; i < valor.length; i += 1) {
      if (/\d/.test(valor[i]!)) {
        visto += 1;
        if (visto === antes) {
          indice = i;
          break;
        }
      }
    }
    if (indice >= 0) bruto = valor.slice(0, indice) + valor.slice(indice + 1);
    antes -= 1;
  }
  const texto = mascara(bruto);
  if (antes <= 0) return { texto, cursor: 0 };
  let visto = 0;
  for (let i = 0; i < texto.length; i += 1) {
    if (/\d/.test(texto[i]!)) {
      visto += 1;
      if (visto === antes) return { texto, cursor: i + 1 };
    }
  }
  return { texto, cursor: texto.length };
}

// Último texto de cada campo, para saber se o backspace só apagou pontuação.
const ultimoTexto = new WeakMap<HTMLInputElement, string>();

// Para o onInput de um campo não controlado: reescreve o texto do campo já com a máscara.
export function aoDigitarMascarado(nome: string) {
  const mascara = mascaraDoCampo(nome);
  if (!mascara) return undefined;
  return (e: FormEvent<HTMLInputElement>) => {
    const campo = e.currentTarget;
    const anterior = ultimoTexto.get(campo) ?? campo.defaultValue;
    const apagou = (e.nativeEvent as InputEvent).inputType === "deleteContentBackward";
    const { texto, cursor } = reaplicarMascara(
      mascara,
      campo.value,
      campo.selectionStart ?? campo.value.length,
      apagou,
      anterior,
    );
    if (texto !== campo.value) campo.value = texto;
    if (typeof document !== "undefined" && document.activeElement === campo) {
      campo.setSelectionRange(cursor, cursor);
    }
    ultimoTexto.set(campo, texto);
  };
}
