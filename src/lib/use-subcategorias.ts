import { useEffect, useState } from "react";

import {
  EVENTO_SUBCATEGORIAS,
  listarSubcategorias,
  type CategoriaProduto,
} from "@/lib/categorias-produto";

export function useSubcategorias(categoria: CategoriaProduto): string[] {
  const [lista, setLista] = useState(() => listarSubcategorias()[categoria]);
  useEffect(() => {
    const atualizar = () => setLista(listarSubcategorias()[categoria]);
    atualizar();
    window.addEventListener(EVENTO_SUBCATEGORIAS, atualizar);
    window.addEventListener("storage", atualizar);
    return () => {
      window.removeEventListener(EVENTO_SUBCATEGORIAS, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, [categoria]);
  return lista;
}
