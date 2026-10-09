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

// Ensaia uma gravação numa cópia em memória do armazenamento, sem salvar nada de verdade.
// Mostra o erro de validação, se houver, e devolve true quando o formulário está válido.
export function validarAntes(ensaio: (storage: Pick<Storage, "getItem" | "setItem">) => unknown): boolean {
  const copia = new Map<string, string>();
  const memoria = {
    getItem: (chave: string) => copia.get(chave) ?? window.localStorage.getItem(chave),
    setItem: (chave: string, valor: string) => void copia.set(chave, valor),
  };
  try {
    ensaio(memoria);
    return true;
  } catch (erro) {
    toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar.");
    return false;
  }
}
