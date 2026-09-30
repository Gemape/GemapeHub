import { useEffect, useState } from "react";

import { EVENTO_FICHAS, lerFichas, type FichaEpi } from "@/lib/fichas-epi";

// Lê as fichas de EPI e atualiza a tela quando mudam (nesta aba ou em outra).
export function useFichasEpi(): FichaEpi[] {
  const [fichas, setFichas] = useState<FichaEpi[]>(() => lerFichas());
  useEffect(() => {
    const atualizar = () => setFichas(lerFichas());
    atualizar();
    window.addEventListener(EVENTO_FICHAS, atualizar);
    window.addEventListener("storage", atualizar);
    return () => {
      window.removeEventListener(EVENTO_FICHAS, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, []);
  return fichas;
}
