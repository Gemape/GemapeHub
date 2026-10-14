// Leitura completa de uma consulta do Supabase: o servidor corta em 1000 linhas por chamada, então lê de bloco em bloco.
const BLOCO = 500;

/**
 * Cada página monta a consulta de novo (o construtor do Supabase acumula a ordem se for reaproveitado).
 * `ordenar` precisa terminar com um desempate estável, como o id.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function lerTodas<T>(montar: () => any, ordenar: (q: any) => any): Promise<T[]> {
  const todas: T[] = [];
  for (let inicio = 0; ; inicio += BLOCO) {
    const { data, error } = await ordenar(montar()).range(inicio, inicio + BLOCO - 1);
    if (error) throw error;
    const lote = (data ?? []) as T[];
    todas.push(...lote);
    if (lote.length < BLOCO) return todas;
  }
}
