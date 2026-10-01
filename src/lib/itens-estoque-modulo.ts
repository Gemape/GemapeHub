import type { Item } from './hooks-gemape';

type ModuloEstoque = 'epi' | 'uniforme' | 'ferramenta';
const TABELA: Record<ModuloEstoque, string> = { epi: 'epis', uniforme: 'uniformes', ferramenta: 'ferramentas' };
const PAGINA = 50;

/** O quadro do módulo consulta todos os itens, sem o corte do seletor de cadastro. */
export async function lerItensEstoque(
  cliente: { from: (tabela: string) => any },
  modulo: ModuloEstoque,
  empresaId: string,
): Promise<Item[]> {
  const todos: Item[] = [];
  for (let inicio = 0;; inicio += PAGINA) {
    let q = cliente.from(TABELA[modulo]).select('*');
    if (empresaId !== 'todas') q = q.eq('empresa_id', empresaId);
    const { data, error } = await q.order('nome').order('id').range(inicio, inicio + PAGINA - 1);
    if (error) throw error;
    const pagina = (data ?? []) as Item[];
    todos.push(...pagina);
    if (pagina.length < PAGINA) return todos;
  }
}
