// Arrastar e soltar em qualquer parte da tela: a tela que sabe receber o arquivo (fotos de avaria, nota fiscal XML) se cadastra aqui enquanto está aberta.
// Solto o arquivo, vale o último cadastrado que o aceita; se ninguém aceita, imagem e PDF abrem no visualizador (só para conferir) e o resto é recusado com aviso.

export type Receptor = { id: number; rotulo: string; aceita: (arquivo: File) => boolean; receber: (arquivos: File[]) => void };

const receptores: Receptor[] = [];
let proximo = 1;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

export const assinarReceptores = (f: () => void) => { ouvintes.add(f); return () => { ouvintes.delete(f); }; };

/** Cadastra um receptor e devolve a função que o remove (chame ao desmontar a tela). */
export function registrarReceptor(r: Omit<Receptor, "id">): () => void {
  const completo = { ...r, id: proximo++ };
  receptores.push(completo);
  avisar();
  return () => {
    const i = receptores.findIndex((x) => x.id === completo.id);
    if (i >= 0) receptores.splice(i, 1);
    avisar();
  };
}

/** O receptor mais recente que aceita TODOS os arquivos soltos; null se não houver. */
export function receptorPara(arquivos: readonly File[]): Receptor | null {
  for (let i = receptores.length - 1; i >= 0; i--) {
    const r = receptores[i] as Receptor;
    if (arquivos.length > 0 && arquivos.every(r.aceita)) return r;
  }
  return null;
}

export const ultimoRotulo = (): string | null => receptores[receptores.length - 1]?.rotulo ?? null;

export const ehImagem = (a: { type: string; name: string }): boolean => a.type.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp)$/i.test(a.name);
export const ehPdf = (a: { type: string; name: string }): boolean => a.type === "application/pdf" || /\.pdf$/i.test(a.name);
export const ehXml = (a: { type: string; name: string }): boolean => /xml/.test(a.type) || /\.xml$/i.test(a.name);

/** O que fazer com o que foi solto: entregar ao receptor, só visualizar ou recusar. */
export function destinoDoSolto(arquivos: readonly File[]): { tipo: "receptor"; receptor: Receptor } | { tipo: "visualizar"; arquivo: File } | { tipo: "recusar"; motivo: string } {
  if (arquivos.length === 0) return { tipo: "recusar", motivo: "Nenhum arquivo foi solto." };
  const r = receptorPara(arquivos);
  if (r) return { tipo: "receptor", receptor: r };
  const primeiro = arquivos[0] as File;
  if (arquivos.length === 1 && (ehImagem(primeiro) || ehPdf(primeiro))) return { tipo: "visualizar", arquivo: primeiro };
  return { tipo: "recusar", motivo: "Esta tela não recebe esse tipo de arquivo. Abra a tela do registro e solte lá." };
}
