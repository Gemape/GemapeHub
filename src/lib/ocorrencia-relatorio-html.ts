// Relatório em PDF de uma ocorrência de veículo (decisão 309), aberto no visualizador do sistema no padrão dos extratos (extrato-html.ts): os dados da
// ocorrência, a tratativa e as renovações de prazo. Só monta o texto; os nomes (veículo, condutor, responsável) vêm prontos da tela. Todo texto passa por escaparHtml.
import { montarExtratoHtml, type Celula, type TabelaExtrato } from "./extrato-html.ts";

export type DadosRelatorioOcorrencia = {
  codigo: string;
  empresa: string;
  veiculo: string;
  tipo: string;
  status: string;
  cadastradaEm: string;
  ocorridoEm: string;
  local: string;
  condutor: string;
  danos: string;
  descricao: string;
  fotos: number;
  tratativa: null | {
    registradaEm: string;
    atualizadaEm: string;
    encerradaEm: string | null;
    responsavel: string;
    custoEmpresa: string;
    descricaoEmpresa: string;
    descricaoTerceiros: string;
    pagamentoTerceiros: string;
    seguradora: string;
  };
  renovacoes: { em: string; passo: string; autorizadoPor: string; registradoPor: string }[];
};

const linha = (campo: string, valor: string): Celula[] => [campo, valor || "—"];

export function montarOcorrenciaHtml(d: DadosRelatorioOcorrencia, geradoEm: Date = new Date()): string {
  const t = d.tratativa;
  const tabelas: TabelaExtrato[] = [
    {
      titulo: "Dados da ocorrência", vazio: "", colunas: [{ titulo: "Campo" }, { titulo: "Informação" }],
      linhas: [
        linha("Veículo", d.veiculo), linha("Tipo", d.tipo), linha("Ocorrido em", d.ocorridoEm), linha("Local", d.local), linha("Condutor", d.condutor),
        linha("Danos", d.danos), linha("Descrição", d.descricao), linha("Cadastrada em", d.cadastradaEm), linha("Fotos anexadas", String(d.fotos)),
      ],
    },
    {
      titulo: "Tratativa", vazio: "Ainda sem tratativa registrada.", colunas: [{ titulo: "Campo" }, { titulo: "Informação" }],
      linhas: !t ? [] : [
        linha("Responsável", t.responsavel), linha("Registrada em", t.registradaEm), linha("Última atualização", t.atualizadaEm), linha("Encerrada em", t.encerradaEm ?? ""),
        linha("Custo para a empresa", t.custoEmpresa), linha("Veículo da empresa", t.descricaoEmpresa), linha("Veículo de terceiros", t.descricaoTerceiros),
        linha("Pagamento feito por terceiros", t.pagamentoTerceiros), linha("Uso de seguradora", t.seguradora),
      ],
    },
    {
      titulo: "Renovações de prazo", vazio: "O prazo da tratativa não foi renovado.",
      colunas: [{ titulo: "Renovado em" }, { titulo: "Prazo" }, { titulo: "Autorizado por" }, { titulo: "Registrado por" }],
      linhas: d.renovacoes.map((r): Celula[] => [r.em, r.passo, r.autorizadoPor, r.registradoPor]),
    },
  ];
  return montarExtratoHtml({
    titulo: "Relatório da ocorrência",
    assunto: `${d.codigo} · ${d.veiculo}`,
    empresa: d.empresa,
    geradoEm,
    resumo: [["Status", d.status, d.status === "Encerrada" ? "verde" : d.status === "Em tratativa" ? "amarelo" : "vermelho"], ["Tipo", d.tipo], ["Custo para a empresa", t?.custoEmpresa ?? "—"]],
    tabelas,
  });
}
