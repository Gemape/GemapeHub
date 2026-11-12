import { useCallback, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { assinarConfig, comRegistro, fotografiaConfig, lerConfig, salvarConfig, type Config } from "@/lib/configuracoes-demo";
import { usuarioAtivo } from "@/lib/permissoes-demo";

// Configuração de teste guardada no navegador. `mudar(fn, "Ação", "detalhe")` grava e, se vier uma ação, anota na auditoria em nome do usuário ativo.
export function useConfig() {
  useSyncExternalStore(assinarConfig, () => fotografiaConfig(localStorage), () => "");
  const config = lerConfig(localStorage);
  const mudar = useCallback((fn: (c: Config) => Config, acao?: string, detalhe = "", critica = true) => {
    let novo = fn(lerConfig(localStorage));
    if (acao) novo = comRegistro(novo, usuarioAtivo(localStorage).nome, acao, detalhe, critica);
    if (!salvarConfig(localStorage, novo)) toast.error("O navegador não conseguiu gravar a mudança (armazenamento cheio ou bloqueado)");
  }, []);
  return { config, mudar };
}
