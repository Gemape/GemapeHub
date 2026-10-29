// Supervisores que validam a renovação do prazo da tratativa de uma ocorrência de veículo (decisões 309 e 315). Os supervisores são usuários do sistema, escolhidos em
// Parâmetros > Veículos > Parâmetros Específicos; sem escolha salva, valem os usuários do perfil Administrador. Toda renovação pede a senha de login do supervisor
// que autoriza, escolhido numa lista.
// Fase 1: fica só no navegador, em modo demonstração, e a demonstração não tem senhas de verdade: a senha de login de todos os usuários é a de demonstração.
// Na Fase 2 a verificação passa a ser a do login do Supabase (`signInWithPassword` com o e-mail do supervisor), no lugar de `verificarSenhaDemonstracao`.
type StorageLike = Pick<Storage, "getItem" | "setItem">;
const CHAVE = "gemape-demo-supervisores-ocorrencias";
export const SENHA_DEMONSTRACAO = "demo";

export type UsuarioDoSistema = { id: string; nome: string; perfil: string };

// null = nada salvo (valem os administradores).
export function lerSupervisoresSalvos(storage?: StorageLike): string[] | null {
  try {
    const bruto = (storage ?? localStorage).getItem(CHAVE);
    if (bruto === null) return null;
    const lido: unknown = JSON.parse(bruto);
    return Array.isArray(lido) ? lido.filter((x): x is string => typeof x === "string") : null;
  } catch {
    return null;
  }
}

export function salvarSupervisores(ids: string[], storage?: StorageLike): void {
  try {
    (storage ?? localStorage).setItem(CHAVE, JSON.stringify([...new Set(ids)]));
  } catch {
    throw new Error("Não foi possível guardar os supervisores neste navegador.");
  }
}

// Usuários habilitados como supervisor: os escolhidos (que ainda existem) ou, sem escolha salva, os administradores.
export function supervisoresEfetivos(usuarios: UsuarioDoSistema[], storage?: StorageLike): UsuarioDoSistema[] {
  const salvos = lerSupervisoresSalvos(storage);
  return salvos === null ? usuarios.filter((u) => u.perfil === "admin") : usuarios.filter((u) => salvos.includes(u.id));
}

export const verificarSenhaDemonstracao = (_usuarioId: string, senha: string): boolean => senha === SENHA_DEMONSTRACAO;

// Quem autoriza a renovação (decisão 315): sempre o supervisor escolhido na lista, com a senha de login dele conferida, mesmo que quem está renovando já seja um
// supervisor (nesse caso a tela já deixa o próprio nome escolhido, mas a senha é pedida do mesmo jeito).
export function autorizarRenovacao(
  entrada: { supervisorId: string; senha: string },
  supervisores: UsuarioDoSistema[],
  verificarSenha: (usuarioId: string, senha: string) => boolean = verificarSenhaDemonstracao,
): UsuarioDoSistema {
  const supervisor = supervisores.find((s) => s.id === entrada.supervisorId);
  if (!supervisor) throw new Error("Escolha o supervisor que autoriza a renovação.");
  if (!entrada.senha) throw new Error("Digite a senha de login do supervisor.");
  if (!verificarSenha(supervisor.id, entrada.senha)) throw new Error("Senha incorreta. A renovação não foi autorizada.");
  return supervisor;
}
