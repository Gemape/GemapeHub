import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EVENTO_PORTADORES, lerPortadores, type PortadorCaixa } from "./portadores-caixa.ts";

/** Reage à gravação local e a mudanças feitas em outra aba, sem limitar o histórico. */
export function usePortadoresCaixa(): PortadorCaixa[] {
  const [registros, setRegistros] = useState<PortadorCaixa[]>([]);
  useEffect(() => {
    const atualizar = () => {
      try { setRegistros(lerPortadores()); }
      catch (erro) { toast.error(erro instanceof Error ? erro.message : "Histórico de portadores inválido."); }
    };
    atualizar();
    window.addEventListener(EVENTO_PORTADORES, atualizar);
    window.addEventListener("storage", atualizar);
    return () => {
      window.removeEventListener(EVENTO_PORTADORES, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, []);
  return registros;
}
