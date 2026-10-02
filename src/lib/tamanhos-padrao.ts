// Catálogo padrão de tamanhos e numerações (Cadastros > Gerais > Tamanhos e unidades) e a
// regra da sequência: o cadastro fica sempre em ordem, do menor para o maior.
// Ordem: Único, letras (PP até G4), numerações em ordem crescente e, por último, o que o
// sistema não reconhece (tamanhos digitados pelo usuário).

// Letras em ordem crescente de tamanho (PPP é o menor).
const ORDEM_LETRAS = ["PPP", "PP", "P", "M", "G", "GG", "XG", "XGG", "G1", "G2", "G3", "G4"];

const LETRAS_PADRAO = ["PP", "P", "M", "G", "GG", "XG", "XGG", "G1", "G2", "G3", "G4"];
// Luvas e anéis (6 a 12), calçados (33 a 48) e vestuário (pares de 50 a 60).
const NUMEROS_PADRAO = [
  ...[6, 7, 8, 9, 10, 11, 12],
  ...Array.from({ length: 16 }, (_, i) => 33 + i),
  ...[50, 52, 54, 56, 58, 60],
].map(String);

export const TAMANHOS_PADRAO: readonly string[] = ["Único", ...LETRAS_PADRAO, ...NUMEROS_PADRAO];

const semAcento = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "");

// Chave de ordenação: [grupo, valor]. Grupo 0 é "Único"; 1, letras; 2, números; 3, o resto.
function chaveOrdem(nome: string): [number, number] {
  const limpo = semAcento(nome).trim().toUpperCase();
  if (limpo === "UNICO") return [0, 0];
  const letra = ORDEM_LETRAS.indexOf(limpo);
  if (letra >= 0) return [1, letra];
  if (/^\d+([.,]\d+)?$/.test(limpo)) return [2, Number(limpo.replace(",", "."))];
  return [3, 0];
}

const maior = (a: [number, number], b: [number, number]) =>
  a[0] !== b[0] ? a[0] > b[0] : a[1] > b[1];

// Posição em que o tamanho entra para a lista continuar em sequência: antes do primeiro
// item maior que ele. O que não é reconhecido vai para o fim, depois de todos.
export function posicaoEmSequencia(lista: { nome: string }[], nome: string): number {
  const nova = chaveOrdem(nome);
  const i = lista.findIndex((item) => maior(chaveOrdem(item.nome), nova));
  return i < 0 ? lista.length : i;
}
