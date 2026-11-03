import { useEffect, useRef } from "react";

// Foco do teclado ao trocar de tela dentro de um módulo (decisão 333): ao abrir uma lista o foco vai para o botão de voltar; ao voltar ao painel, para o botão que abriu a lista.
// `tela` é a tela de agora e `inicial`, a do painel. Cada botão que abre uma lista se registra com `botaoDaTela(tela)`; o de voltar leva `voltarRef`.
export function useFocoDaTela<T extends string>(tela: T, inicial: T) {
  const voltarRef = useRef<HTMLButtonElement>(null);
  const botoes = useRef<Partial<Record<T, HTMLButtonElement | null>>>({});
  const anterior = useRef(tela);
  useEffect(() => {
    if (anterior.current === tela) return;
    (tela === inicial ? botoes.current[anterior.current] : voltarRef.current)?.focus();
    anterior.current = tela;
  }, [tela, inicial]);
  const botaoDaTela = (t: T) => (el: HTMLButtonElement | null) => {
    botoes.current[t] = el;
  };
  return { voltarRef, botaoDaTela };
}
