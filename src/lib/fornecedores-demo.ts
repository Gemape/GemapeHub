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

// O código é gerado em sequência de 5 dígitos (00001, 00002...) e não muda ao editar.
export type Fornecedor = FornecedorDados & { id: string; codigo: string };
type StorageLike = Pick<Storage, "getItem" | "setItem">;
const CHAVE = "gemape-demo-fornecedores";
// Último número já usado. Guardado à parte para um código excluído não ser reaproveitado.
const CHAVE_SEQUENCIA = "gemape-demo-fornecedores-sequencia";
const formatarCodigo = (n: number) => String(n).padStart(5, "0");
// Aceita também o formato antigo do preview (FOR-0001).
const numeroDoCodigo = (codigo: string | undefined) => Number(/^(?:FOR-)?(\d+)$/.exec(codigo ?? "")?.[1] ?? 0);
const soDigitos = (valor: string) => valor.replace(/\D/g, "");

export function listarFornecedores(storage: StorageLike = localStorage): Fornecedor[] {
  let dados: Fornecedor[];
  try {
    const lidos = JSON.parse(storage.getItem(CHAVE) ?? "[]");
    dados = Array.isArray(lidos) ? lidos as Fornecedor[] : [];
  } catch {
    return [];
  }
  // Fornecedores cadastrados antes do código recebem um, na ordem em que foram cadastrados.
  // Códigos no formato antigo (FOR-0001) passam para 5 dígitos, mantendo o número.
  if (dados.some((item) => !item.codigo || item.codigo !== formatarCodigo(numeroDoCodigo(item.codigo)))) {
    for (const item of dados) if (item.codigo) item.codigo = formatarCodigo(numeroDoCodigo(item.codigo));
    for (const item of dados) if (!item.codigo) item.codigo = formatarCodigo(reservarNumero(dados, storage));
    storage.setItem(CHAVE, JSON.stringify(dados));
  }
  return dados;
}

function ultimoNumero(fornecedores: Fornecedor[], storage: StorageLike): number {
  return Math.max(Number(storage.getItem(CHAVE_SEQUENCIA)) || 0, ...fornecedores.map((item) => numeroDoCodigo(item.codigo)));
}

function reservarNumero(fornecedores: Fornecedor[], storage: StorageLike): number {
  const numero = ultimoNumero(fornecedores, storage) + 1;
  storage.setItem(CHAVE_SEQUENCIA, String(numero));
  return numero;
}

// Código que o próximo fornecedor vai receber, para mostrar no formulário.
export function proximoCodigoFornecedor(storage: StorageLike = localStorage): string {
  return formatarCodigo(ultimoNumero(listarFornecedores(storage), storage) + 1);
}

export function salvarFornecedor(
  valores: FornecedorDados | (FornecedorDados & { id: string }),
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

  const indice = fornecedores.findIndex((item) => item.id === id);
  const existente = fornecedores[indice];
  const codigo = existente ? existente.codigo : formatarCodigo(reservarNumero(fornecedores, storage));
  const fornecedor: Fornecedor = { ...valores, id, codigo };
  if (indice >= 0) fornecedores[indice] = fornecedor;
  else fornecedores.push(fornecedor);
  storage.setItem(CHAVE, JSON.stringify(fornecedores));
  return fornecedor;
}

export function removerFornecedor(id: string, storage: StorageLike = localStorage): void {
  storage.setItem(CHAVE, JSON.stringify(listarFornecedores(storage).filter((item) => item.id !== id)));
}
