import { capitalizarCadastro, capitalizarNomePessoa, formatarCep, formatarCnpj, formatarTelefone, somenteDigitos, validarCep, validarCnpj, validarTelefone } from "./formatacao-cadastral.ts";

// Naturezas fixas usadas antes das categorias de Cadastros > Gerais (decisão especial 13),
// convertidas para as categorias equivalentes ao ler os fornecedores já salvos.
const NATUREZA_PARA_CATEGORIA: Record<string, string> = {
  EPI: "cat-epi",
  Uniforme: "cat-uniformes",
  Ferramentas: "cat-ferramentas",
  Veículos: "cat-veiculos",
};

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
  // Ids das categorias de Cadastros > Gerais (uma ou mais).
  categorias: string[];
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

// Dado salvo ilegível nunca é sobrescrito: a lista aparece vazia, mas gravar por cima apagaria o que sobrou.
function conferirIntegridade(storage: StorageLike): void {
  const bruto = storage.getItem(CHAVE);
  if (bruto === null) return;
  let ok = false;
  try { const lido: unknown = JSON.parse(bruto); ok = Array.isArray(lido) && lido.every((f) => !!f && typeof f === "object"); } catch { ok = false; }
  if (!ok) throw new Error("Os fornecedores salvos neste navegador estão ilegíveis; nada foi alterado.");
}

export function listarFornecedores(storage: StorageLike = localStorage): Fornecedor[] {
  let dados: Fornecedor[];
  try {
    const lidos = JSON.parse(storage.getItem(CHAVE) ?? "[]");
    dados = Array.isArray(lidos) ? (lidos as Fornecedor[]).filter((f) => !!f && typeof f === "object") : [];
  } catch {
    return [];
  }
  // Fornecedores salvos com as naturezas antigas passam a usar as categorias equivalentes.
  let migrou = false;
  for (const item of dados as (Fornecedor & { naturezas?: string[] })[]) {
    if (!Array.isArray(item.categorias)) {
      item.categorias = [
        ...new Set((item.naturezas ?? []).map((n) => NATUREZA_PARA_CATEGORIA[n]).filter(Boolean)),
      ] as string[];
      delete item.naturezas;
      migrou = true;
    }
  }
  if (migrou) storage.setItem(CHAVE, JSON.stringify(dados));
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
  conferirIntegridade(storage);
  const fornecedores = listarFornecedores(storage);
  const id = "id" in valores ? valores.id : crypto.randomUUID();
  const indice = fornecedores.findIndex((item) => item.id === id);
  const existente = fornecedores[indice];
  if ("id" in valores && !existente) throw new Error("Este fornecedor foi excluído; feche a janela e cadastre de novo, se for o caso.");
  // Só a razão social é obrigatória; o nome fantasia é opcional (decisão 55).
  if (!valores.razao_social.trim()) {
    throw new Error("Informe a razão social.");
  }
  if (!validarCnpj(valores.cnpj) && valores.cnpj !== existente?.cnpj) {
    throw new Error("Informe um CNPJ com 14 dígitos.");
  }
  if (valores.cep && !validarCep(valores.cep) && valores.cep !== existente?.cep) throw new Error("Informe um CEP com 8 dígitos.");
  if (valores.telefone && !validarTelefone(valores.telefone) && valores.telefone !== existente?.telefone) throw new Error("Informe um telefone com 10 ou 11 dígitos.");
  // Categoria não é mais pedida na tela (decisão 55); a já gravada é mantida.

  if (fornecedores.some((item) => item.id !== id && somenteDigitos(item.cnpj) === somenteDigitos(valores.cnpj))) {
    throw new Error("CNPJ já cadastrado.");
  }

  const codigo = existente ? existente.codigo : formatarCodigo(reservarNumero(fornecedores, storage));
  const fornecedor: Fornecedor = {
    ...valores,
    razao_social: capitalizarCadastro(valores.razao_social),
    nome_fantasia: capitalizarCadastro(valores.nome_fantasia),
    rua: capitalizarCadastro(valores.rua),
    bairro: capitalizarCadastro(valores.bairro),
    cidade: capitalizarCadastro(valores.cidade),
    pais: capitalizarCadastro(valores.pais),
    estado: valores.estado.toLocaleUpperCase("pt-BR"),
    contato: capitalizarNomePessoa(valores.contato),
    cnpj: formatarCnpj(valores.cnpj),
    cep: formatarCep(valores.cep),
    telefone: formatarTelefone(valores.telefone),
    categorias: [...new Set(valores.categorias)], id, codigo,
  };
  if (indice >= 0) fornecedores[indice] = fornecedor;
  else fornecedores.push(fornecedor);
  storage.setItem(CHAVE, JSON.stringify(fornecedores));
  return fornecedor;
}

export function removerFornecedor(id: string, storage: StorageLike = localStorage): void {
  conferirIntegridade(storage);
  storage.setItem(CHAVE, JSON.stringify(listarFornecedores(storage).filter((item) => item.id !== id)));
}
