import { useEffect, useState } from "react";

import { lerParametrosCompraEpi, type ParametrosCompraEpi } from "@/lib/epi-parametros";

// Parâmetros da sugestão de compra do EPI (decisão 330) sempre em dia: lê de novo quando a pessoa volta à aba ou quando outra aba do navegador salva (evento storage).
export function useParametrosCompraEpi(): ParametrosCompraEpi {
  const [parametros, setParametros] = useState(lerParametrosCompraEpi);
  useEffect(() => {
    const atualizar = () =>
      setParametros((atual) => {
        const novo = lerParametrosCompraEpi();
        return JSON.stringify(novo) === JSON.stringify(atual) ? atual : novo;
      });
    window.addEventListener("focus", atualizar);
    window.addEventListener("storage", atualizar);
    return () => {
      window.removeEventListener("focus", atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, []);
  return parametros;
}
