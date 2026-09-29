import { useEffect, useState } from "react";
import { toast } from "sonner";

import { EVENTO_PARAMETROS, lerParametros, type ParametrosBase } from "@/lib/parametros-base";

// Lê os Cadastros Gerais e atualiza a tela quando mudam (nesta aba ou em outra).
export function useParametrosBase(): ParametrosBase {
  const [dados, setDados] = useState(() => lerParametros());
  useEffect(() => {
    const atualizar = () => setDados(lerParametros());
    atualizar();
    window.addEventListener(EVENTO_PARAMETROS, atualizar);
    window.addEventListener("storage", atualizar);
    return () => {
      window.removeEventListener(EVENTO_PARAMETROS, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, []);
  return dados;
}

// Executa uma alteração e mostra o erro de validação, se houver. Devolve true se deu certo.
export function executar(acao: () => unknown, sucesso?: string): boolean {
  try {
    acao();
    if (sucesso) toast.success(sucesso);
    return true;
  } catch (erro) {
    toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar.");
    return false;
  }
}
