// Quem mais está com o mesmo registro aberto. Só a regra de "quem ainda está presente"; a tela cuida do canal.
export const TTL_PRESENCA_MS = 15_000; // sem sinal de vida por este tempo, a pessoa saiu (aba fechada, rede caiu)
export const BATIMENTO_MS = 5_000;

export type Presenca = Map<string, { visto: number; nome: string }>;

/** Registra o sinal de vida de alguém (o próprio `meuId` nunca entra na lista). */
export function registrarSinal(mapa: Presenca, id: string, nome: string, meuId: string, agora: number): void {
  if (id !== meuId) mapa.set(id, { visto: agora, nome });
}

/** Quem ainda está presente (e tira da lista quem sumiu). */
export function presentes(mapa: Presenca, agora: number, ttl = TTL_PRESENCA_MS): string[] {
  const nomes: string[] = [];
  for (const [id, p] of mapa) {
    if (agora - p.visto > ttl) mapa.delete(id);
    else nomes.push(p.nome);
  }
  return nomes;
}

/** Frase do aviso: nenhum nome = sem aviso. */
export function frasePresenca(nomes: readonly string[]): string | null {
  const unicos = [...new Set(nomes.filter(Boolean))];
  if (nomes.length === 0) return null;
  if (unicos.length === 1 && nomes.length === 1) return `${unicos[0]} está com este registro aberto agora.`;
  return "Outro usuário está visualizando/editando este registro agora.";
}
