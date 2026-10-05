import { adicionarOpcao, autorizar, lerParametros, type Opcao } from "./parametros-base.ts";

type Storage = Parameters<typeof lerParametros>[0];

/**
 * Cadastra um tamanho novo em Gerais e já o associa à subcategoria, para o cadastro de EPI ou
 * uniforme poder escolhê-lo sem sair da tela. A subcategoria é conferida antes, para não deixar
 * um tamanho solto se ela não existir.
 */
export function criarTamanhoParaSubcategoria(nome: string, subcategoriaId: string, storage?: Storage): Opcao {
  if (!lerParametros(storage).subcategorias.some((s) => s.id === subcategoriaId)) {
    throw new Error("Subcategoria não encontrada.");
  }
  const criado = adicionarOpcao("tamanhos", nome, storage);
  autorizar(subcategoriaId, "tamanhos", [criado.id], storage);
  return criado;
}
