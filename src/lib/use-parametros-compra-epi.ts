import { useEffect, useState } from "react";

import { lerParametrosCompraEpi, type ModuloDeCompra, type ParametrosCompraEpi } from "@/lib/epi-parametros";

// Parâmetros da sugestão de compra do EPI (decisão 330) sempre em dia: lê de novo quando a pessoa volta à aba ou quando outra aba do navegador salva (evento storage).
export function useParametrosCompraEpi(modulo: ModuloDeCompra = "epi"): ParametrosCompraEpi {
  const [parametros, setParametros] = useState(() => lerParametrosCompraEpi(undefined, modulo));
  useEffect(() => {
    const atualizar = () =>
      setParametros((atual) => {
        const novo = lerParametrosCompraEpi(undefined, modulo);
        return JSON.stringify(novo) === JSON.stringify(atual) ? atual : novo;
      });
    atualizar(); // o módulo pode ter mudado com o componente montado: não deixa valer o do outro módulo
    window.addEventListener("focus", atualizar);
    window.addEventListener("storage", atualizar);
    return () => {
      window.removeEventListener("focus", atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, [modulo]);
  return parametros;
}
