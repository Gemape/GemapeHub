// Tour de primeiro acesso: passos de cada módulo e a lembrança de quem já viu. Só dados e armazenamento; a tela desenha os balões.
export type PassoTour = { alvo: string; titulo: string; texto: string };

// O alvo é o atributo data-tour do botão ou campo na tela. Só entram no tour os passos cujo alvo existe na tela aberta.
const ENTREGA = (item: string): PassoTour[] => [
  { alvo: "empregado", titulo: "1. Pesquise o colaborador aqui", texto: "Digite parte do nome, a matrícula ou o CPF. O resumo dele aparece ao lado." },
  { alvo: "add-item", titulo: `2. Escolha o ${item}`, texto: `Clique para adicionar a linha e escolher o ${item}, o tamanho e a quantidade.` },
  { alvo: "registrar", titulo: "3. Registre e colete a assinatura", texto: "Registre a entrega e gere o Termo de Entrega para o colaborador assinar." },
];

export const TOURS: Record<string, PassoTour[]> = {
  epi: ENTREGA("EPI"),
  uniforme: ENTREGA("uniforme"),
};

export const chaveTour = (usuario: string, modulo: string) => `gemape-tour-visto:${usuario || "anonimo"}:${modulo}`;

type Armazenamento = Pick<Storage, "getItem" | "setItem">;

export function jaViuTour(storage: Armazenamento | null | undefined, usuario: string, modulo: string): boolean {
  try {
    return storage?.getItem(chaveTour(usuario, modulo)) === "1";
  } catch {
    return false;
  }
}

export function marcarTourVisto(storage: Armazenamento | null | undefined, usuario: string, modulo: string): void {
  try {
    storage?.setItem(chaveTour(usuario, modulo), "1");
  } catch {
    // sem armazenamento: o tour pode voltar numa próxima visita, sem prejuízo
  }
}

/** Passos cujo alvo existe na tela. O tour só começa com pelo menos 2 (senão não há o que mostrar em sequência). */
export function passosVisiveis(passos: readonly PassoTour[], existe: (alvo: string) => boolean): PassoTour[] {
  const achados = passos.filter((p) => existe(p.alvo));
  return achados.length >= 2 ? achados : [];
}
