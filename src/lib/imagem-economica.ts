// Reduz a imagem no navegador antes de guardar (formato econômico, dec 168): WebP, lado maior até 1280 px, qualidade 0,7.
import { dimensoesReduzidas } from "./questionario-respostas.ts";
import { IMAGEM_ECONOMICA } from "./questionario-despesas.ts";

// `dataUrl` é a imagem já reduzida, guardada na resposta para ser vista na lista de respostas registradas.
export type ImagemReduzida = { nome: string; bytesAntes: number; bytesDepois: number; dataUrl: string };

const comoDataUrl = (blob: Blob) => new Promise<string>((ok, falha) => {
  const leitor = new FileReader();
  leitor.onload = () => ok(String(leitor.result));
  leitor.onerror = () => falha(new Error("não foi possível ler a imagem"));
  leitor.readAsDataURL(blob);
});

export async function reduzirImagem(arquivo: File): Promise<ImagemReduzida> {
  if (!arquivo.type.startsWith("image/")) throw new Error(`${arquivo.name}: só imagens são aceitas.`);
  const bitmap = await createImageBitmap(arquivo).catch(() => { throw new Error(`${arquivo.name}: não foi possível ler esta imagem; tente outro arquivo.`); });
  const { largura, altura } = dimensoesReduzidas(bitmap.width, bitmap.height, IMAGEM_ECONOMICA.larguraMaxPx);
  const tela = document.createElement("canvas");
  tela.width = largura;
  tela.height = altura;
  const contexto = tela.getContext("2d");
  if (!contexto) throw new Error(`${arquivo.name}: não foi possível reduzir a imagem.`);
  contexto.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close();
  const blob = await new Promise<Blob | null>((ok) => tela.toBlob(ok, IMAGEM_ECONOMICA.formato, IMAGEM_ECONOMICA.qualidade));
  if (!blob) throw new Error(`${arquivo.name}: não foi possível reduzir a imagem.`);
  // Se a redução ficou maior que o original (imagem já pequena), vale o original.
  const final = blob.size <= arquivo.size ? blob : arquivo;
  const dataUrl = await comoDataUrl(final).catch(() => { throw new Error(`${arquivo.name}: não foi possível reduzir a imagem.`); });
  return { nome: arquivo.name, bytesAntes: arquivo.size, bytesDepois: final.size, dataUrl };
}
