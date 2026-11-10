// Formulário de Cadastrar ferramenta guardado ao ir cadastrar um parâmetro (marca, tamanho, unidade) em Parâmetros Específicos.
// O botão "Voltar para Cadastrar ferramenta" de lá marca a volta; só então o formulário reabre. Quem sai por outro caminho não encontra um formulário antigo.
export const CHAVE_RASCUNHO = "gemape-rascunho-ferramenta";

export type RascunhoFerramenta = { editandoId: string | null; sigla: string; campos: Record<string, unknown>; voltou?: boolean };

type Armazem = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const padrao = (): Armazem | null => {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
};

export function guardarRascunho(r: RascunhoFerramenta, armazem: Armazem | null = padrao()): void {
  try {
    armazem?.setItem(CHAVE_RASCUNHO, JSON.stringify({ ...r, voltou: false }));
  } catch {
    /* sem armazenamento: volta com o formulário em branco */
  }
}

/** Chamado pelo botão de volta: libera o rascunho para a volta ao formulário. */
export function marcarVoltaDoRascunho(armazem: Armazem | null = padrao()): void {
  try {
    const bruto = armazem?.getItem(CHAVE_RASCUNHO);
    if (bruto) armazem?.setItem(CHAVE_RASCUNHO, JSON.stringify({ ...(JSON.parse(bruto) as RascunhoFerramenta), voltou: true }));
  } catch {
    /* ignora */
  }
}

/** O rascunho só é devolvido depois de marcada a volta. */
export function lerRascunho(armazem: Armazem | null = padrao()): RascunhoFerramenta | null {
  try {
    const bruto = armazem?.getItem(CHAVE_RASCUNHO);
    const r = bruto ? (JSON.parse(bruto) as RascunhoFerramenta) : null;
    return r?.voltou ? r : null;
  } catch {
    return null;
  }
}

export function limparRascunho(armazem: Armazem | null = padrao()): void {
  try {
    armazem?.removeItem(CHAVE_RASCUNHO);
  } catch {
    /* ignora */
  }
}
