import { useEffect, useState } from "react";

import {
  EVENTO_SUBCATEGORIAS,
  listarCategorias,
  type CategoriaProduto,
  type ListaCategoria,
} from "@/lib/categorias-produto";

// Catálogo e seleção de uma categoria, atualizados quando outra tela ou aba muda a lista.
export function useCategoria(categoria: CategoriaProduto): ListaCategoria {
  const [lista, setLista] = useState(() => listarCategorias()[categoria]);
  useEffect(() => {
    const atualizar = () => setLista(listarCategorias()[categoria]);
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

// Subcategorias que aparecem nos formulários.
export function useSubcategorias(categoria: CategoriaProduto): string[] {
  return useCategoria(categoria).selecionadas;
}
