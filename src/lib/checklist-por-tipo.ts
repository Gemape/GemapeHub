// Itens check list separados por tipo de veículo (decisão 113). Cada grupo aparece em cada tipo a que está
// ligado; os de "todos os tipos" ficam numa seção própria e os sem tipo (ou com tipo que já não existe em
// Gerais) em "Sem tipo de veículo". As seções seguem a ordem dos tipos em Gerais e só aparecem se tiverem grupo.
import { TODOS_OS_TIPOS } from "./parametros-base.ts";

export type SecaoPorTipo<T> = { chave: string; titulo: string; itens: T[] };

export function separarPorTipoVeiculo<T extends { tiposVeiculo: string[] }>(itens: T[], tipos: { id: string; nome: string }[]): SecaoPorTipo<T>[] {
  const secoes: SecaoPorTipo<T>[] = [];
  for (const tipo of tipos) {
    const doTipo = itens.filter((i) => !i.tiposVeiculo.includes(TODOS_OS_TIPOS) && i.tiposVeiculo.includes(tipo.id));
    if (doTipo.length > 0) secoes.push({ chave: tipo.id, titulo: tipo.nome, itens: doTipo });
  }
  const todos = itens.filter((i) => i.tiposVeiculo.includes(TODOS_OS_TIPOS));
  if (todos.length > 0) secoes.push({ chave: TODOS_OS_TIPOS, titulo: "Todos os tipos de veículo", itens: todos });
  const semTipo = itens.filter((i) => !i.tiposVeiculo.includes(TODOS_OS_TIPOS) && !tipos.some((t) => i.tiposVeiculo.includes(t.id)));
  if (semTipo.length > 0) secoes.push({ chave: "sem-tipo", titulo: "Sem tipo de veículo (não aparece em check list)", itens: semTipo });
  return secoes;
}
