// Direção da troca de tela: ao abrir algo a tela nova entra pela direita; ao voltar, entra pela esquerda. Cria o mapa mental de "para dentro / para fora".
export type DirecaoTela = "avancar" | "voltar";
// "Voltar" vale só por 1,5 s depois de marcado: a troca de tela acontece logo em seguida, e uma marca que ninguém usou (voltou para a mesma rota) expira sozinha.
const VALIDADE_MS = 1500;
let voltouEm = 0;
export const marcarDirecao = (d: DirecaoTela) => { voltouEm = d === "voltar" ? Date.now() : 0; };
export const direcaoDaTroca = (): DirecaoTela => (Date.now() - voltouEm < VALIDADE_MS ? "voltar" : "avancar");
