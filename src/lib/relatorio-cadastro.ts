// Relatório dos Cadastros (Clientes, Fornecedores, Empregados e Empresas), com os campos escolhidos por caixas de marcação (decisão 377). Usa o padrão de relatório do sistema
// (relatorio-padrao.ts): cabeçalho com logomarca, quadro de resumo, tabela de cabeçalho azul e rodapé "Emitido em".
import { montarRelatorioTabelaHtml } from "./relatorio-padrao.ts";

export type CampoRelatorio<T> = {
  id: string;
  rotulo: string;
  valor: (linha: T) => string | null | undefined;
  // Marcado de início ao abrir a janela; os campos longos (observações, segundo telefone) começam desmarcados.
  padrao?: boolean;
  direita?: boolean;
};

export const camposPadrao = <T>(campos: readonly CampoRelatorio<T>[]): string[] => campos.filter((c) => c.padrao !== false).map((c) => c.id);

// A ordem das colunas é a da lista de campos, e não a em que as caixas foram marcadas. Sem nenhum campo válido, o relatório não é gerado.
export function montarRelatorioCadastroHtml<T>(d: {
  titulo: string;
  campos: readonly CampoRelatorio<T>[];
  escolhidos: readonly string[];
  linhas: readonly T[];
  subtitulos?: (string | null | undefined)[];
  empresa?: string | null | undefined;
  geradoEm?: Date | string;
}): string {
  const campos = d.campos.filter((c) => d.escolhidos.includes(c.id));
  if (campos.length === 0) throw new Error("Marque pelo menos um campo para o relatório.");
  return montarRelatorioTabelaHtml({
    titulo: d.titulo,
    subtitulos: d.subtitulos ?? [],
    empresa: d.empresa,
    resumo: [["Registros", String(d.linhas.length)], ["Campos", String(campos.length)]],
    colunas: campos.map((c) => ({ titulo: c.rotulo, ...(c.direita ? { direita: true } : {}) })),
    linhas: d.linhas.map((l) => campos.map((c) => c.valor(l) || "—")),
    vazio: "Nenhum registro para o relatório.",
    ...(campos.length > 6 ? { paisagem: true } : {}),
    ...(d.geradoEm ? { geradoEm: d.geradoEm } : {}),
  });
}
