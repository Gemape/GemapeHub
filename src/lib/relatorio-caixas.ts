// Relatório das caixas de ferramentas (todas ou só as escolhidas) (Ferramentas > Módulo > Número da caixa), no padrão dos relatórios do sistema (folha A4 com cabeçalho, quadros de resumo e tabelas
// de cabeçalho azul). A pessoa escolhe antes, por caixas de seleção, quais seções entram. Só monta o texto: quem lê os dados e abre o visualizador é a tela.
import { montarExtratoHtml, type TabelaExtrato } from "./extrato-html.ts";

export const SECOES_RELATORIO_CAIXAS = [
  "Resumo das caixas",
  "Ferramentas de cada caixa",
  "Histórico de movimentações de cada caixa",
  "Ocorrências de cada caixa",
] as const;

export type CaixaParaRelatorio = {
  codigo: string;
  empresa: string;
  portador: string;
  ferramentas: { codigo: string; nome: string; marcaModelo: string; empresa: string; quantidade: number; comEmpregado: number; baixado: number; disponivel: number; estado: string }[];
  historico: { data: string; tipo: string; ferramenta: string; quantidade: number; empregado: string; observacao: string }[];
  ocorrencias: { data: string; hora: string; ferramenta: string; empregado: string; responsavel: string; descricao: string }[];
};

const soma = (lista: number[]) => lista.reduce((t, n) => t + n, 0);

export function montarRelatorioCaixasHtml(d: { caixas: CaixaParaRelatorio[]; secoes: readonly number[]; empresa: string; parcial?: boolean; geradoEm?: Date | string }): string {
  const tem = (n: number) => d.secoes.includes(n);
  const doTodas = (pegar: (c: CaixaParaRelatorio) => number) => soma(d.caixas.map(pegar));
  const tabelas: TabelaExtrato[] = [];

  if (tem(0)) {
    tabelas.push({
      titulo: SECOES_RELATORIO_CAIXAS[0],
      colunas: [
        { titulo: "Caixa" }, { titulo: "Empresa" }, { titulo: "Portador" }, { titulo: "Ferramentas", direita: true }, { titulo: "Qtd na caixa", direita: true },
        { titulo: "Com empregado", direita: true }, { titulo: "Baixado", direita: true }, { titulo: "Disponível", direita: true }, { titulo: "Movimentações", direita: true }, { titulo: "Ocorrências", direita: true },
      ],
      linhas: d.caixas.map((c) => [
        c.codigo, c.empresa, c.portador || "—", String(c.ferramentas.length), String(soma(c.ferramentas.map((f) => f.quantidade))),
        String(soma(c.ferramentas.map((f) => f.comEmpregado))), String(soma(c.ferramentas.map((f) => f.baixado))), String(soma(c.ferramentas.map((f) => f.disponivel))),
        String(c.historico.length), String(c.ocorrencias.length),
      ]),
      vazio: "Nenhuma caixa.",
    });
  }
  if (tem(1)) {
    for (const c of d.caixas) {
      tabelas.push({
        titulo: `${c.codigo} — ${c.empresa}${c.portador ? ` — Portador: ${c.portador}` : ""}`,
        colunas: [
          { titulo: "Código" }, { titulo: "Nome" }, { titulo: "Marca/Modelo" }, { titulo: "Empresa" }, { titulo: "Qtd na caixa", direita: true },
          { titulo: "Com empregado", direita: true }, { titulo: "Baixado", direita: true }, { titulo: "Disponível", direita: true }, { titulo: "Estado" },
        ],
        linhas: c.ferramentas.map((f) => [f.codigo, f.nome, f.marcaModelo, f.empresa, String(f.quantidade), String(f.comEmpregado), String(f.baixado), String(f.disponivel), f.estado]),
        vazio: "Caixa vazia.",
      });
    }
  }
  if (tem(2)) {
    for (const c of d.caixas) {
      tabelas.push({
        titulo: `Histórico de movimentações — ${c.codigo}`,
        colunas: [{ titulo: "Data" }, { titulo: "Tipo" }, { titulo: "Ferramenta" }, { titulo: "Qtd", direita: true }, { titulo: "Empregado" }, { titulo: "Observação" }],
        linhas: c.historico.map((m) => [m.data, m.tipo, m.ferramenta, String(m.quantidade), m.empregado, m.observacao || "—"]),
        vazio: "Nenhuma movimentação das ferramentas desta caixa.",
      });
    }
  }
  if (tem(3)) {
    for (const c of d.caixas) {
      tabelas.push({
        titulo: `Ocorrências — ${c.codigo}`,
        colunas: [{ titulo: "Data" }, { titulo: "Hora" }, { titulo: "Ferramenta" }, { titulo: "Empregado" }, { titulo: "Responsável" }, { titulo: "Descrição" }],
        linhas: c.ocorrencias.map((o) => [o.data, o.hora, o.ferramenta, o.empregado, o.responsavel, o.descricao]),
        vazio: "Nenhuma ocorrência desta caixa.",
      });
    }
  }

  return montarExtratoHtml({
    titulo: "Relatório de caixas de ferramentas",
    assunto: d.parcial ? "Caixas selecionadas" : "Todas as caixas",
    subtitulo: `${d.caixas.length} ${d.caixas.length === 1 ? "caixa" : "caixas"}`,
    empresa: d.empresa,
    resumo: [
      ["Caixas", String(d.caixas.length)],
      ["Ferramentas na caixa", String(doTodas((c) => soma(c.ferramentas.map((f) => f.quantidade))))],
      ["Com empregado", String(doTodas((c) => soma(c.ferramentas.map((f) => f.comEmpregado))))],
      ["Baixado", String(doTodas((c) => soma(c.ferramentas.map((f) => f.baixado))))],
      ["Disponível", String(doTodas((c) => soma(c.ferramentas.map((f) => f.disponivel))))],
      ["Ocorrências", String(doTodas((c) => c.ocorrencias.length))],
    ],
    tabelas,
    ...(d.geradoEm ? { geradoEm: d.geradoEm } : {}),
  });
}
