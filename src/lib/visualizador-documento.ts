// Termos e fichas abrem na própria tela (pendência 3), não em aba nova: navegadores
// com bloqueio de pop-up recusam a aba aberta depois da gravação, e o termo sumia.
export type DocumentoAberto = { titulo: string; html: string; arquivo: string };

let atual: DocumentoAberto | null = null;
const ouvintes = new Set<() => void>();

const avisar = () => ouvintes.forEach((ouvinte) => ouvinte());

/** Exibe o documento no visualizador da tela, com o HTML exatamente como foi montado. */
export function abrirDocumento(documento: DocumentoAberto) {
  atual = documento;
  avisar();
}

export function fecharDocumento() {
  atual = null;
  avisar();
}

export const documentoAberto = () => atual;

export function assinarDocumento(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

/** "Termo de Entrega de EPI", "Ana Souza", "2026-09-30" → termo-de-entrega-de-epi-ana-souza-2026-09-30.html */
export function nomeArquivoDocumento(...partes: (string | null | undefined)[]): string {
  const nome = partes
    .filter(Boolean)
    .join(" ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${nome || "documento"}.html`;
}
