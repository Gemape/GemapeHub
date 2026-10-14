// Capitalização na entrada dos formulários (decisão 84): o campo se corrige ao sair dele (blur) e ao Enter, sem mexer
// no texto enquanto o usuário digita. Cada campo escolhe o modo: "texto" (primeira letra maiúscula), "nome" (nome de pessoa) ou "minusculas" (e-mail).
import { capitalizarNomePessoa, capitalizarTexto } from "./formatacao-cadastral.ts";

export type ModoCapitalizacao = "texto" | "nome" | "minusculas";

export const formatarPorModo = (valor: string, modo: ModoCapitalizacao): string =>
  modo === "nome" ? capitalizarNomePessoa(valor) : modo === "minusculas" ? valor.toLocaleLowerCase("pt-BR") : capitalizarTexto(valor);

/** Troca o valor do campo pelo formatado e avisa o React (campo controlado ou não) com um evento "input". */
export function aplicarNoCampo(campo: HTMLInputElement | HTMLTextAreaElement, modo: ModoCapitalizacao): void {
  const formatado = formatarPorModo(campo.value, modo);
  if (formatado === campo.value) return;
  const prototipo = campo instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototipo, "value")?.set?.call(campo, formatado);
  campo.dispatchEvent(new Event("input", { bubbles: true }));
}
