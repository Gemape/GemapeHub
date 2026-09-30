// Termos de Uniformes e de Vistoria (pendência 2): conferem as linhas antes de
// gravar tudo de uma vez, como o Termo de Responsabilidade de ferramentas.
// Mesmo valor de TODAS em empresa-context.tsx (que não pode ser importado aqui, nos testes).
const NENHUM_EMPREGADO = "todas";

type LinhaTermo = { item_id: string; quantidade: number };

/** Soma a quantidade por item, ou devolve a mensagem de erro da primeira linha inválida. */
function somarLinhas(
  linhas: LinhaTermo[],
  nomes: { vazio: string; semItem: string; quantidade: string },
): Map<string, number> | string {
  if (linhas.length === 0) return nomes.vazio;
  const pedidas = new Map<string, number>();
  for (const linha of linhas) {
    if (!linha.item_id) return nomes.semItem;
    if (!Number.isInteger(linha.quantidade) || linha.quantidade < 1) return nomes.quantidade;
    pedidas.set(linha.item_id, (pedidas.get(linha.item_id) ?? 0) + linha.quantidade);
  }
  return pedidas;
}

/** Entrega ou baixa de uniformes: não sai mais do que o estoque disponível de cada item. */
export function validarSaidaDeUniformes(
  linhas: LinhaTermo[],
  itens: { id: string; nome: string; estoque_atual: number | null }[],
  acao: "entrega" | "baixa",
): string | null {
  const pedidas = somarLinhas(linhas, {
    vazio: "Adicione pelo menos um uniforme.",
    semItem: "Selecione o uniforme de cada linha.",
    quantidade: "A quantidade de cada uniforme deve ser um número inteiro maior que zero.",
  });
  if (typeof pedidas === "string") return pedidas;
  for (const [itemId, quantidade] of pedidas) {
    const item = itens.find((i) => i.id === itemId);
    const estoque = item?.estoque_atual ?? 0;
    if (quantidade > estoque) {
      return `A ${acao} de ${quantidade} unidade(s) de ${item?.nome ?? "um uniforme"} passa do estoque disponível (${estoque}).`;
    }
  }
  return null;
}

/** Vistoria só registra o estado das ferramentas; o estoque não muda, então não é conferido. */
export function validarTermoVistoria(linhas: LinhaTermo[]): string | null {
  const pedidas = somarLinhas(linhas, {
    vazio: "Adicione pelo menos uma ferramenta para vistoria.",
    semItem: "Selecione a ferramenta de cada linha.",
    quantidade: "A quantidade de cada ferramenta deve ser um número inteiro maior que zero.",
  });
  return typeof pedidas === "string" ? pedidas : null;
}

/** "Nenhum / Empresa" (ou nada escolhido) grava o termo sem empregado. */
export function empregadoDoTermo(empregadoId: string): string | null {
  return empregadoId && empregadoId !== NENHUM_EMPREGADO ? empregadoId : null;
}
