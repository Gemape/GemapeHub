// Regras do cadastro de empresas (especificação: razão social, CNPJ, endereço e status).
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

export type DadosEmpresa = {
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
  status: StatusEmpresa;
} & Record<CampoEndereco, string>;

export const soDigitos = (valor: string) => valor.replace(/\D/g, "");

export function formatarCnpj(valor: string): string {
  const d = soDigitos(valor);
  if (d.length !== 14) return valor.trim();
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

// Confere os dois dígitos verificadores do CNPJ.
export function cnpjValido(valor: string): boolean {
  const d = soDigitos(valor);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const digito = (base: string) => {
    let peso = base.length - 7;
    let soma = 0;
    for (const n of base) {
      soma += Number(n) * peso--;
      if (peso < 2) peso = 9;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const primeiro = digito(d.slice(0, 12));
  const segundo = digito(d.slice(0, 12) + primeiro);
  return d.endsWith(`${primeiro}${segundo}`);
}

export const statusDaEmpresa = (empresa: { status?: string | null }): StatusEmpresa =>
  empresa.status === "Inativa" ? "Inativa" : "Ativa";

// Endereço em uma linha para a tabela.
export function enderecoResumido(empresa: Partial<Record<CampoEndereco, string | null>>): string {
  const linha1 = [empresa.rua, empresa.numero].filter(Boolean).join(", ");
  const cidade = [empresa.cidade, empresa.estado].filter(Boolean).join("/");
  return [linha1, empresa.bairro, cidade, empresa.cep].filter(Boolean).join(" · ");
}

// Valida e normaliza antes de salvar. `outras` são as demais empresas, para barrar CNPJ repetido.
// Ao editar, um CNPJ que já estava salvo e não mudou é aceito mesmo sem dígitos válidos,
// para não travar a edição de cadastros antigos.
export function prepararEmpresa(
  valores: DadosEmpresa,
  outras: { id: string; cnpj: string | null }[],
  id?: string,
): DadosEmpresa {
  const limpo = Object.fromEntries(
    Object.entries(valores).map(([chave, valor]) => [chave, String(valor ?? "").trim()]),
  ) as DadosEmpresa;
  if (!limpo.razao_social) throw new Error("Informe a razão social.");
  if (!limpo.nome_fantasia) throw new Error("Informe o nome fantasia.");
  const cnpjSalvo = id ? (outras.find((e) => e.id === id)?.cnpj ?? undefined) : undefined;
  const cnpjInalterado = cnpjSalvo !== undefined && soDigitos(cnpjSalvo) === soDigitos(limpo.cnpj);
  if (!cnpjInalterado && !cnpjValido(limpo.cnpj)) {
    throw new Error("CNPJ inválido. Confira os 14 dígitos.");
  }
  if (outras.some((e) => e.id !== id && soDigitos(e.cnpj ?? "") === soDigitos(limpo.cnpj))) {
    throw new Error("Já existe uma empresa com este CNPJ.");
  }
  if (!STATUS_EMPRESA.includes(limpo.status)) throw new Error("Informe o status da empresa.");
  return { ...limpo, cnpj: cnpjInalterado ? (cnpjSalvo ?? limpo.cnpj) : formatarCnpj(limpo.cnpj) };
}

// Ativas primeiro, depois por nome.
export function ordenarEmpresas<T extends { nome_fantasia: string; status?: string | null }>(
  empresas: T[],
): T[] {
  return [...empresas].sort(
    (a, b) =>
      Number(statusDaEmpresa(a) === "Inativa") - Number(statusDaEmpresa(b) === "Inativa") ||
      a.nome_fantasia.localeCompare(b.nome_fantasia, "pt-BR"),
  );
}
