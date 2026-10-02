// Cadastro de Empresas: endereço e status (ativa ou inativa), conforme a especificação.
// Estas colunas ainda não existem no banco real: por ora só são gravadas no modo demonstração
// (docs/pendencias-fase2.md). Fora dele, a tela salva apenas os campos que o banco já tem.
import { capitalizarCadastro, formatarCep, formatarCnpj, validarCep, validarCnpj } from "./formatacao-cadastral.ts";
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
  return [linha1, empresa.bairro, cidade, empresa.cep ? formatarCep(empresa.cep) : null].filter(Boolean).join(" · ");
}

// Valores do formulário prontos para gravar.
export function valoresDaEmpresa(
  f: { get: (chave: string) => unknown },
  comEnderecoEStatus: boolean,
  anterior?: { cnpj?: string | null; cep?: string | null },
): Record<string, string> {
  const texto = (chave: string) => String(f.get(chave) ?? "").trim();
  if (!validarCnpj(texto("cnpj")) && texto("cnpj") !== anterior?.cnpj) throw new Error("Informe um CNPJ com 14 dígitos.");
  if (comEnderecoEStatus && texto("cep") && !validarCep(texto("cep")) && texto("cep") !== anterior?.cep) throw new Error("Informe um CEP com 8 dígitos.");
  const valores: Record<string, string> = {
    nome_fantasia: capitalizarCadastro(texto("nome_fantasia")),
    razao_social: capitalizarCadastro(texto("razao_social")),
    cnpj: formatarCnpj(texto("cnpj")),
  };
  if (comEnderecoEStatus) {
    for (const { nome } of CAMPOS_ENDERECO_EMPRESA) {
      valores[nome] = nome === "cep" ? formatarCep(texto(nome)) : nome === "estado" ? texto(nome).toLocaleUpperCase("pt-BR") : nome === "numero" ? texto(nome) : capitalizarCadastro(texto(nome));
    }
    valores["status"] = statusDaEmpresa({ status: texto("status") });
  }
  return valores;
}

// Empresa inativa (decisão 40) sai das listas em que se escolhe a empresa de um registro novo.
// O histórico, os relatórios e os filtros continuam mostrando todas.
type EmpresaEscolha = { id: string; status?: string | null };

export const empresaEstaAtiva = (empresa: { status?: string | null }): boolean => statusDaEmpresa(empresa) === "Ativa";

/** Empresas para escolher; `manter` traz de volta a que um registro em edição já usa, ainda que inativa. */
export function empresasParaEscolha<T extends EmpresaEscolha>(empresas: T[], manter: (string | null | undefined)[] = []): T[] {
  return empresas.filter((e) => empresaEstaAtiva(e) || manter.includes(e.id));
}

/** Empresa que já vem escolhida: a do cabeçalho, se estiver ativa; senão a primeira ativa. */
export function empresaPadraoParaEscolha<T extends EmpresaEscolha>(empresas: T[], empresaId: string): string {
  const ativas = empresasParaEscolha(empresas);
  return ativas.find((e) => e.id === empresaId)?.id ?? ativas[0]?.id ?? "";
}
