// Termos e fichas abrem na própria tela (pendência 3), não em aba nova: navegadores
// com bloqueio de pop-up recusam a aba aberta depois da gravação, e o termo sumia.
// `telaCheia` abre o visualizador ocupando a tela toda (extratos, para consultar com folga).
export type DocumentoAberto = { titulo: string; html: string; arquivo: string; telaCheia?: boolean };

let atual: DocumentoAberto | null = null;
const ouvintes = new Set<() => void>();

const avisar = () => ouvintes.forEach((ouvinte) => ouvinte());

/** Exibe o documento no visualizador da tela, com o HTML exatamente como foi montado. */
export function abrirDocumento(documento: DocumentoAberto) {
  atual = documento;
  avisar();
}

/** Abre direto a janela de impressão (onde se escolhe "Salvar como PDF") do documento, sem passar pelo visualizador: o PDF se gera uma vez só. */
export function imprimirDocumento(html: string) {
  const quadro = document.createElement("iframe");
  quadro.setAttribute("aria-hidden", "true");
  // Mesmo isolamento do visualizador: sem scripts do documento; só imprimir (allow-modals) e ler o quadro (allow-same-origin).
  quadro.setAttribute("sandbox", "allow-same-origin allow-modals");
  quadro.style.cssText = "position: fixed; right: 0; bottom: 0; width: 0; height: 0; border: 0;";
  // O quadro sai quando a impressão acaba; em navegador que não avisa, a rede de segurança é o prazo longo (a janela de impressão pode ficar aberta por minutos).
  const remover = () => quadro.remove();
  quadro.onload = () => {
    const janela = quadro.contentWindow;
    if (!janela) return remover();
    janela.addEventListener("afterprint", remover);
    janela.focus();
    janela.print();
  };
  quadro.srcdoc = html;
  document.body.appendChild(quadro);
  window.setTimeout(remover, 600000);
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
