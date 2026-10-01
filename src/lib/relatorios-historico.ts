import type { Empregado, Movimentacao } from './hooks-gemape';

const TAMANHO_PAGINA = 500;

export type FiltrosRelatorio = {
  modulo?: string | undefined;
  empresaId?: string | undefined;
  empregadoId?: string | undefined;
  de?: string | undefined;
  ate?: string | undefined;
};

/** Busca páginas até a primeira incompleta, respeitando o limite de resposta do Supabase. */
export async function lerMovimentacoesRelatorio(
  cliente: { from: (tabela: string) => any },
  filtros: FiltrosRelatorio,
): Promise<Movimentacao[]> {
  const todas: Movimentacao[] = [];
  for (let inicio = 0;; inicio += TAMANHO_PAGINA) {
    let q = cliente.from('movimentacoes').select('*');
    if (filtros.modulo) q = q.eq('modulo', filtros.modulo);
    if (filtros.empresaId) q = q.eq('empresa_id', filtros.empresaId);
    if (filtros.empregadoId) q = q.eq('empregado_id', filtros.empregadoId);
    if (filtros.de) q = q.gte('data_movimentacao', filtros.de);
    if (filtros.ate) q = q.lte('data_movimentacao', filtros.ate);
    const { data, error } = await q.order('data_movimentacao', { ascending: false })
      .order('created_at', { ascending: false }).order('id', { ascending: false })
      .range(inicio, inicio + TAMANHO_PAGINA - 1);
    if (error) throw error;
    const pagina = (data ?? []) as Movimentacao[];
    todas.push(...pagina);
    if (pagina.length < TAMANHO_PAGINA) return todas;
  }
}

export async function lerEmpregadosRelatorio(cliente: { from: (tabela: string) => any }, empresaId: string): Promise<Empregado[]> {
  const todos: Empregado[] = [];
  for (let inicio = 0;; inicio += TAMANHO_PAGINA) {
    let q = cliente.from('empregados').select('*');
    if (empresaId !== 'todas') q = q.eq('empresa_id', empresaId);
    const { data, error } = await q.order('nome').order('id').range(inicio, inicio + TAMANHO_PAGINA - 1);
    if (error) throw error;
    const pagina = (data ?? []) as Empregado[];
    todos.push(...pagina);
    if (pagina.length < TAMANHO_PAGINA) return todos;
  }
}
