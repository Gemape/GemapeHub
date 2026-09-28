export const NATUREZAS_FORNECEDOR = ["EPI", "Uniforme", "Ferramentas", "Veículos"] as const;
export type NaturezaFornecedor = (typeof NATUREZAS_FORNECEDOR)[number];

export type FornecedorDados = {
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  rua: string;
  numero: string;
  bairro: string;
  cep: string;
  cidade: string;
  estado: string;
  pais: string;
  inscricao_estadual: string;
  telefone: string;
  contato: string;
  observacoes: string;
  naturezas: NaturezaFornecedor[];
};

export type Fornecedor = FornecedorDados & { id: string };
type StorageLike = Pick<Storage, "getItem" | "setItem">;
const CHAVE = "gemape-demo-fornecedores";
const soDigitos = (valor: string) => valor.replace(/\D/g, "");

export function listarFornecedores(storage: StorageLike = localStorage): Fornecedor[] {
  try {
    const dados = JSON.parse(storage.getItem(CHAVE) ?? "[]");
    return Array.isArray(dados) ? dados as Fornecedor[] : [];
  } catch {
    return [];
  }
}

export function salvarFornecedor(
  valores: FornecedorDados | Fornecedor,
  storage: StorageLike = localStorage,
): Fornecedor {
  if (!valores.razao_social.trim() || !valores.nome_fantasia.trim()) {
    throw new Error("Informe razão social e nome fantasia.");
  }
  if (soDigitos(valores.cnpj).length !== 14) {
    throw new Error("Informe um CNPJ com 14 dígitos.");
  }
  if (valores.naturezas.length === 0) {
    throw new Error("Selecione pelo menos uma natureza.");
  }

  const fornecedores = listarFornecedores(storage);
  const id = "id" in valores ? valores.id : crypto.randomUUID();
  if (fornecedores.some((item) => item.id !== id && soDigitos(item.cnpj) === soDigitos(valores.cnpj))) {
    throw new Error("CNPJ já cadastrado.");
  }

  const fornecedor = { ...valores, id };
  const indice = fornecedores.findIndex((item) => item.id === id);
  if (indice >= 0) fornecedores[indice] = fornecedor;
  else fornecedores.push(fornecedor);
  storage.setItem(CHAVE, JSON.stringify(fornecedores));
  return fornecedor;
}

export function removerFornecedor(id: string, storage: StorageLike = localStorage): void {
  storage.setItem(CHAVE, JSON.stringify(listarFornecedores(storage).filter((item) => item.id !== id)));
}
