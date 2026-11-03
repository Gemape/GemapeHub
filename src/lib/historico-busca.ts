// Busca por palavra-chave e período (início e fim) no Histórico do empregado de EPI. A palavra ignora maiúsculas e acentos e todas as palavras digitadas
// precisam aparecer, em qualquer ordem. O período inclui o dia de início e o de fim. Início depois do fim não tem resultado: a tela avisa.

export type FiltroHistorico = { palavra: string; dataInicio: string; dataFim: string };

const norm = (t: string) => t.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[̀-ͯ]/g, "");

export const periodoInvalido = (dataInicio: string, dataFim: string): boolean => !!dataInicio && !!dataFim && dataInicio > dataFim;

export function filtrarHistoricoPorBuscaEPeriodo<T extends { data_movimentacao: string; texto: string }>(linhas: T[], f: FiltroHistorico): T[] {
  if (periodoInvalido(f.dataInicio, f.dataFim)) return [];
  const palavras = norm(f.palavra).split(/\s+/).filter(Boolean);
  return linhas.filter((l) => {
    const dia = l.data_movimentacao.slice(0, 10);
    if (f.dataInicio && dia < f.dataInicio) return false;
    if (f.dataFim && dia > f.dataFim) return false;
    const texto = norm(l.texto);
    return palavras.every((p) => texto.includes(p));
  });
}
