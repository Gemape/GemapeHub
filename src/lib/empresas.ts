// Cadastro de Empresas: endereço e status (ativa ou inativa), conforme a especificação.
// Estas colunas ainda não existem no banco real: por ora só são gravadas no modo demonstração
// (docs/pendencias-fase2.md). Fora dele, a tela salva apenas os campos que o banco já tem.
export const STATUS_EMPRESA = ["Ativa", "Inativa"] as const;
export type StatusEmpresa = (typeof STATUS_EMPRESA)[number];

export const CAMPOS_ENDERECO_EMPRESA = [
  { nome: "rua", rotulo: "Rua/Av." },
  { nome: "numero", rotulo: "Nº" },
  { nome: "bairro", rotulo: "Bairro" },
  { nome: "cep", rotulo: "CEP" },
  { nome: "cidade", rotulo: "Cidade" },
  { nome: "estado", rotulo: "Estado" },
] as const;
export type CampoEndereco = (typeof CAMPOS_ENDERECO_EMPRESA)[number]["nome"];

export const statusDaEmpresa = (empresa: { status?: string | null }): StatusEmpresa =>
  empresa.status === "Inativa" ? "Inativa" : "Ativa";

// Endereço em uma linha para a tabela.
export function enderecoResumido(empresa: Partial<Record<CampoEndereco, string | null>>): string {
  const linha1 = [empresa.rua, empresa.numero].filter(Boolean).join(", ");
  const cidade = [empresa.cidade, empresa.estado].filter(Boolean).join("/");
  return [linha1, empresa.bairro, cidade, empresa.cep].filter(Boolean).join(" · ");
}

// Valores do formulário prontos para gravar.
export function valoresDaEmpresa(
  f: { get: (chave: string) => unknown },
  comEnderecoEStatus: boolean,
): Record<string, string> {
  const texto = (chave: string) => String(f.get(chave) ?? "").trim();
  const valores: Record<string, string> = {
    nome_fantasia: texto("nome_fantasia"),
    razao_social: texto("razao_social"),
    cnpj: texto("cnpj"),
  };
  if (comEnderecoEStatus) {
    for (const { nome } of CAMPOS_ENDERECO_EMPRESA) valores[nome] = texto(nome);
    valores["status"] = statusDaEmpresa({ status: texto("status") });
  }
  return valores;
}
