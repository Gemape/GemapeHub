import { useCallback, useEffect, useState } from "react";

// Número que muda quando algo é salvo na tela (`mudou`) ou quando outra aba mexe no armazenamento do navegador; as telas de Parâmetros >
// Equipamentos releem os dados salvos sempre que ele muda.
export function useVersaoArmazenamento(): [number, () => void] {
  const [versao, setVersao] = useState(0);
  const mudou = useCallback(() => setVersao((v) => v + 1), []);
  useEffect(() => {
    window.addEventListener("storage", mudou);
    return () => window.removeEventListener("storage", mudou);
  }, [mudou]);
  return [versao, mudou];
}
