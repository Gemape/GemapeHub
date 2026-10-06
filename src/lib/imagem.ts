// Foto reduzida antes de guardar (decisão 60): lado maior até 1024 px e JPEG com qualidade
// 0,6, que costuma ficar entre 60 e 150 KB. Nunca amplia.
export function dimensoesReduzidas(largura: number, altura: number, maximo = 1024): { largura: number; altura: number } {
  const maior = Math.max(largura, altura);
  if (maior <= maximo) return { largura, altura };
  const fator = maximo / maior;
  return { largura: Math.round(largura * fator), altura: Math.round(altura * fator) };
}

const LIMITE_CARACTERES = 200_000;

// Lê o arquivo de imagem e devolve um data URL JPEG comprimido; se ainda passar de ~150 KB,
// reduz o tamanho e a qualidade até caber. Só roda no navegador.
export async function comprimirImagem(arquivo: File): Promise<string> {
  if (!arquivo.type.startsWith("image/")) throw new Error(`"${arquivo.name}" não é uma imagem.`);
  const bitmap = await createImageBitmap(arquivo);
  try {
    let lado = 1024;
    let qualidade = 0.6;
    for (let tentativa = 0; tentativa < 5; tentativa++) {
      const { largura, altura } = dimensoesReduzidas(bitmap.width, bitmap.height, lado);
      const canvas = document.createElement("canvas");
      canvas.width = largura;
      canvas.height = altura;
      const contexto = canvas.getContext("2d");
      if (!contexto) throw new Error("Não foi possível processar a imagem neste navegador.");
      contexto.fillStyle = "#ffffff";
      contexto.fillRect(0, 0, largura, altura);
      contexto.drawImage(bitmap, 0, 0, largura, altura);
      const resultado = canvas.toDataURL("image/jpeg", qualidade);
      if (resultado.length <= LIMITE_CARACTERES || tentativa === 4) return resultado;
      lado = Math.round(lado * 0.8);
      qualidade = Math.max(0.4, qualidade - 0.05);
    }
    throw new Error("Não foi possível reduzir a imagem.");
  } finally {
    bitmap.close();
  }
}
