// Tamanhos de ferramentas da planilha do responsável (decisão 117): por grupo de ferramenta, na ordem da planilha.
// "Chave Fenda" é o grupo Chave de fenda e "Alenn" é o grupo Chave Allen, que já existem em Grupos de ferramentas.
export const TAMANHOS_FERRAMENTAS_PADRAO: readonly { grupo: string; tamanhos: readonly string[] }[] = [
  { grupo: "Chave L", tamanhos: ["8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "3/8"] },
  {
    grupo: "Chave boca",
    tamanhos: ["06-07", "08-09", "10-11", "12-13", "14-15", "16-17", "18-19", "20-22", "21-23", "24-26", "25-28", "27-32", "3/4 X 5/8", "11/32 X 3/8", "1/4 X 15/64"],
  },
  {
    grupo: "Chave estria",
    tamanhos: ["06-07", "08-09", "10-11", "12-13", "14-15", "16-17", "18-19", "20-22", "21-23", "24-26", "25-28", "27-32", "30-32", "3/8 X 7/16", "5/8 X 11/16", "5/16 X 1/4"],
  },
  { grupo: "Meia lua", tamanhos: ["06-07", "11-13", "14-16", "15-17", "7/16 X 1/2", "9/16 X 5/8", "5/8 X 3/4", "11/16 X 13/16"] },
  { grupo: "Combinada", tamanhos: ["6", "7", "8", "9", "10", "11", "12", "13", "14", "17", "19", "22"] },
  { grupo: "Canhão", tamanhos: ["6", "7", "8", "9", "10"] },
  {
    grupo: "Alicates",
    tamanhos: ["Expansor abrir 7-9", "Corte", "Universal", "Terminal elétrico", "Pressão", "Bico", "Expansor fechar 7-9", "Amperímetro", "Desencapador"],
  },
  { grupo: "Lima", tamanhos: ["Redonda", "Chata"] },
  { grupo: "Chave", tamanhos: ["Corrente", "Giclê"] },
  { grupo: "Chave Philips", tamanhos: [] },
  {
    grupo: "Chave de fenda",
    tamanhos: ['1/8" x 3" (3x75 mm)', '3/16" x 4" (5x100 mm)', '1/4" x 4" (6,5x100 mm)', '1/4" x 6" (6,5x150 mm)', '5/16" x 6" (8x150 mm)', '3/8" x 8" (10x200 mm)'],
  },
  { grupo: "Torx", tamanhos: ["T10", "T15", "T20", "T27", "T30", "T40", "T45", "T50"] },
  { grupo: "Chave Allen", tamanhos: ["1,5", "2", "2,5", "3", "4", "5", "6", "8", "10"] },
  { grupo: "Canhão Torx", tamanhos: [] },
  { grupo: "Cachimbo", tamanhos: ["Alongador", "1/2", "13", "17", "19", "22", "24"] },
];

// Grupos que não têm tamanho (decisão 134): não aparecem em Tamanhos por ferramenta e o campo Tamanho do cadastro não oferece opções para eles.
export const GRUPOS_SEM_TAMANHO: readonly string[] = ["Diversos", "Luva"];
export const grupoTemTamanhos = (nome: string): boolean => !GRUPOS_SEM_TAMANHO.some((g) => g.localeCompare(nome.trim(), "pt-BR", { sensitivity: "base" }) === 0);
