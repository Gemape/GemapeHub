// Aviso flutuante com botão [Desfazer]: fica na tela de 5 a 8 segundos para o operador corrigir um clique errado sem chamar o suporte.
import { toast } from "sonner";

import { mensagemHumana } from "./erros-humanos.ts";

export const DURACAO_DESFAZER_MS = 7000; // dentro dos 5 a 8 s pedidos

/**
 * Mostra `mensagem` com o botão Desfazer. Ao clicar, roda `desfazer` e avisa o resultado.
 * `desfazer` deve devolver o sistema ao estado de antes; se falhar, o operador vê o porquê em português.
 */
export function avisarComDesfazer(mensagem: string, opcoesOuDesfazer: { descricao?: string; duracaoMs?: number } | (() => Promise<void> | void), desfazerOuNada?: () => Promise<void> | void): void {
  const opcoes = typeof opcoesOuDesfazer === "function" ? {} : opcoesOuDesfazer;
  const desfazer = typeof opcoesOuDesfazer === "function" ? opcoesOuDesfazer : desfazerOuNada ?? (() => undefined);
  let usado = false; // um clique só: desfazer duas vezes duplicaria o ajuste (ex.: entrada de estoque repetida)
  toast.success(mensagem, {
    ...(opcoes.descricao ? { description: opcoes.descricao } : {}),
    duration: opcoes.duracaoMs ?? DURACAO_DESFAZER_MS,
    action: {
      label: "Desfazer",
      onClick: () => {
        if (usado) return;
        usado = true;
        void (async () => {
          try {
            await desfazer();
            toast.success("Desfeito");
          } catch (erro) {
            usado = false; // falhou: pode tentar de novo
            toast.error("Não foi possível desfazer", { description: mensagemHumana(erro) });
          }
        })();
      },
    },
  });
}
