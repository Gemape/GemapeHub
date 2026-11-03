import { useEffect, useState } from "react";

import { EVENTO_ORDENS, lerOrdens, type OrdemServicoEpi } from "@/lib/ordens-servico-epi";

// Lê as ordens de serviço de EPI e atualiza a tela quando mudam (nesta aba ou em outra).
export function useOrdensServicoEpi(): OrdemServicoEpi[] {
  const [ordens, setOrdens] = useState<OrdemServicoEpi[]>(() => lerOrdens());
  useEffect(() => {
    const atualizar = () => setOrdens(lerOrdens());
    atualizar();
    window.addEventListener(EVENTO_ORDENS, atualizar);
    window.addEventListener("storage", atualizar);
    return () => {
      window.removeEventListener(EVENTO_ORDENS, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, []);
  return ordens;
}
