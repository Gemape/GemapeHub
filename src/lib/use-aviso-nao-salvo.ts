import { useBlocker } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

export const MENSAGEM_NAO_SALVO = "Você tem alterações não salvas. Deseja sair mesmo assim?";

/**
 * Aviso de alterações não salvas num formulário aberto (`ativo`). Pergunta antes de: trocar de menu (rota), fechar ou recarregar a aba do navegador
 * e fechar a janela do formulário (use `aoMudarAberto` no `onOpenChange`). Ligue `aoAlterar` ao `onInput`/`onChange` do <form>; `limpar` ao salvar.
 */
export function useAvisoNaoSalvo(ativo: boolean) {
  const [sujo, setSujo] = useState(false);
  useEffect(() => { if (!ativo) setSujo(false); }, [ativo]);
  const valendo = ativo && sujo;
  useBlocker({
    shouldBlockFn: () => valendo && !window.confirm(MENSAGEM_NAO_SALVO),
    enableBeforeUnload: () => valendo, // o navegador mostra o aviso próprio (texto fixo, por segurança)
    disabled: !valendo,
  });
  const aoAlterar = useCallback(() => setSujo(true), []);
  const limpar = useCallback(() => setSujo(false), []);
  /** Para o `onOpenChange` do diálogo: fechar com alterações pede confirmação. */
  const aoMudarAberto = useCallback(
    (mudar: (aberto: boolean) => void) => (aberto: boolean) => {
      if (!aberto && valendo && !window.confirm(MENSAGEM_NAO_SALVO)) return;
      if (!aberto) setSujo(false);
      mudar(aberto);
    },
    [valendo],
  );
  return { sujo, aoAlterar, limpar, aoMudarAberto };
}
