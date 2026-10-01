export type Modulo = "epi" | "uniforme" | "ferramenta" | "veiculo";

export const MODULO_LABEL: Record<Modulo, string> = {
  epi: "EPI",
  uniforme: "Uniforme",
  ferramenta: "Ferramenta",
  veiculo: "Veículo",
};

export const TIPOS_MOVIMENTACAO = ["Entrada", "Saida", "Devolucao", "Transferencia"] as const;

export const TIPO_MOVIMENTACAO_LABEL: Record<string, string> = {
  Entrada: "Entrada",
  Saida: "Saída",
  Devolucao: "Devolução",
  Transferencia: "Transferência",
  Vistoria: "Vistoria",
};

export const MOTIVOS_BAIXA = [
  "Fornecimento ao Empregado",
  "Desligamento",
  "Desgaste Natural",
  "Quebra",
  "Desaparecimento",
  "Perda",
  "Mau Uso",
] as const;

export const ESTADOS_ITEM = ["Novo", "Usado"] as const;

// Só dados iniciais de Cadastros > Gerais (parametros-base.ts): as telas leem as listas de Gerais.
export const CATEGORIAS_EPI = [
  "Capacete",
  "Luva",
  "Óculos",
  "Botina",
  "Colete",
  "Máscara",
  "Protetor Auricular",
  "Cinto de Segurança",
  "Outros",
] as const;

export const CATEGORIAS_UNIFORME = ["Camisa", "Calça", "Jaqueta", "Outros"] as const;

export const TIPOS_VEICULO = ["Carro", "Moto", "Caminhão", "Utilitário", "Van", "Outros"] as const;

export const COMBUSTIVEIS_VEICULO = [
  "Gasolina",
  "Etanol",
  "Diesel",
  "Flex",
  "Elétrico",
  "Híbrido",
] as const;

export const ONUS_BAIXA = ["Da Empresa", "Do Empregado"] as const;
export const TIPOS_VISTORIA = [
  "Inicial (Entrega da caixa)",
  "Periodica",
  "Reposicao",
  "Final (Desligamento)",
] as const;
export const TIPOS_VISTORIA_LABEL: Record<string, string> = {
  "Inicial (Entrega da caixa)": "Inicial (Entrega da caixa)",
  "Periodica": "Periódica",
  "Reposicao": "Reposição",
  "Final (Desligamento)": "Final (Desligamento)",
};

export const TIPOS_OCORRENCIA = [
  "Comunicada pelo empregado a empresa",
  "Identificada em vistoria periodica",
] as const;
export const TIPOS_OCORRENCIA_LABEL: Record<string, string> = {
  "Comunicada pelo empregado a empresa": "Comunicada pelo empregado à empresa",
  "Identificada em vistoria periodica": "Identificada em vistoria periódica",
};

export const CONDUCOES_OCORRENCIA = [
  "Onus integral da empresa",
  "Onus integral do empregado",
  "Onus parcial da empresa e parcial do empregado",
] as const;
export const CONDUCOES_OCORRENCIA_LABEL: Record<string, string> = {
  "Onus integral da empresa": "Ônus integral da empresa",
  "Onus integral do empregado": "Ônus integral do empregado",
  "Onus parcial da empresa e parcial do empregado": "Ônus parcial da empresa e parcial do empregado",
};

export const STATUS_EPI = ["Ativo", "Inativo"] as const;
export const STATUS_UNIFORME = ["Ativo", "Inativo"] as const;
export const STATUS_FERRAMENTA = ["Ativo", "Manutencao", "Inativo"] as const;
export const STATUS_FERRAMENTA_LABEL: Record<string, string> = {
  Ativo: "Ativo",
  Manutencao: "Em Manutenção",
  Inativo: "Inativo",
};

export const STATUS_VEICULO = ["Ativo", "Manutencao", "Inativo"] as const;
export const STATUS_CAIXA = ["Ativa", "Inativa", "Manutencao"] as const;
export const STATUS_CAIXA_LABEL: Record<string, string> = {
  Ativa: "Ativa",
  Inativa: "Inativa",
  Manutencao: "Em Manutenção",
};

export const STATUS_VEICULO_LABEL: Record<string, string> = {
  Ativo: "Ativo",
  Manutencao: "Em Manutenção",
  Inativo: "Inativo",
};

/** Nível de alerta de reposição, por dias de cobertura de estoque. */
export type NivelAlerta = "critico" | "alto" | "medio" | "baixo" | "atencao" | "ok";

export const NIVEL_ALERTA_INFO: Record<NivelAlerta, { label: string; classe: string }> = {
  critico: { label: "< 30 dias", classe: "bg-destructive text-destructive-foreground" },
  alto: { label: "< 60 dias", classe: "bg-accent text-accent-foreground" },
  medio: { label: "< 90 dias", classe: "bg-warning text-warning-foreground" },
  baixo: { label: "< 120 dias", classe: "bg-info text-info-foreground" },
  atencao: { label: "< 180 dias", classe: "bg-secondary text-secondary-foreground" },
  ok: { label: "> 180 dias", classe: "bg-success text-success-foreground" },
};

export function nivelPorCobertura(dias: number | null): NivelAlerta {
  if (dias === null) return "ok";
  if (dias < 30) return "critico";
  if (dias < 60) return "alto";
  if (dias < 90) return "medio";
  if (dias < 120) return "baixo";
  if (dias < 180) return "atencao";
  return "ok";
}

/**
 * Cobertura em dias = estoque atual / consumo médio diário.
 * Consumo médio diário = total de saídas no período / dias do período.
 * Retorna null quando não há consumo registrado (cobertura indeterminada).
 */
export function coberturaEmDias(
  estoqueAtual: number,
  totalSaidas: number,
  diasPeriodo: number,
): number | null {
  if (diasPeriodo < 7) return null;
  if (totalSaidas <= 0 || diasPeriodo <= 0) return null;
  const consumoDiario = totalSaidas / diasPeriodo;
  if (consumoDiario <= 0) return null;
  return Math.round(estoqueAtual / consumoDiario);
}

export function formatarMoeda(valor: number | null | undefined): string {
  return (valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function valorTotalEmEstoque(
  itens: { estoque_atual?: number | null; preco_unitario?: number | null }[],
): number {
  const centavos = itens.reduce(
    (soma, item) => soma + Math.round((item.estoque_atual ?? 0) * (item.preco_unitario ?? 0) * 100),
    0,
  );
  return centavos / 100;
}

export function formatarData(data: string | null | undefined): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.slice(0, 10).split("-");
  if (!ano || !mes || !dia) return "—";
  return `${dia}/${mes}/${ano}`;
}

export function exportarCsv(nomeArquivo: string, linhas: Record<string, unknown>[]): void {
  if (linhas.length === 0) return;
  const colunas = Object.keys(linhas[0]!);
  const escapar = (v: unknown) => {
    let text = String(v ?? "");
    if (/^[\s]*[=+@-]|^[\t\r\n]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  const conteudo = [
    colunas.join(";"),
    ...linhas.map((l) => colunas.map((c) => escapar(l[c])).join(";")),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + conteudo], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${nomeArquivo}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// Texto do usuário dentro do HTML dos termos impressos.
export const escaparHtml = (v: unknown) =>
  String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
