import { combinaBusca } from "./parametros-base.ts";

// Busca de ações no Cadastrar nova manutenção (decisão 195): sem diferenciar maiúsculas e acento, aceita parte da
// palavra. O grupo que combina mostra todas as suas ações; senão, só as ações que combinam. Sem termo, mostra tudo.
export function filtrarAcoesManutencao<G extends { nome: string; subitens: { nome: string }[] }>(
  grupos: G[],
  termo: string,
): { grupo: G; subitens: G["subitens"] }[] {
  if (!termo.trim()) return grupos.map((grupo) => ({ grupo, subitens: grupo.subitens }));
  const achados: { grupo: G; subitens: G["subitens"] }[] = [];
  for (const grupo of grupos) {
    if (combinaBusca(termo, grupo.nome)) {
      achados.push({ grupo, subitens: grupo.subitens });
      continue;
    }
    const subitens = grupo.subitens.filter((s) => combinaBusca(termo, grupo.nome, s.nome));
    if (subitens.length > 0) achados.push({ grupo, subitens });
  }
  return achados;
}
