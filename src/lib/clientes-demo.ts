// Cadastro de Clientes (Parâmetros > Clientes), atendidos pelos empregados em viagens e saídas externas.
// Fase 1: fica só no navegador, em modo demonstração; a tabela `clientes` entra na Fase 2.
import { cpfValido, emailValido, formatarCpf } from "./empregados.ts";
import { capitalizarCadastro, capitalizarNomePessoa, formatarCnpj, formatarTelefone, somenteDigitos, validarCnpj, validarTelefone } from "./formatacao-cadastral.ts";

export type ClienteDados = {
  nome: string;
  cpf: string;
  cnpj: string;
  endereco: string;
  contato: string;
  telefone: string;
  telefone2: string;
  email: string;
  observacao: string;
};

// O código é gerado em sequência de 5 dígitos (00001, 00002...) e não muda ao editar.
export type Cliente = ClienteDados & { id: string; codigo: string };
type StorageLike = Pick<Storage, "getItem" | "setItem">;
const CHAVE = "gemape-demo-clientes";
// Último número já usado. Guardado à parte para um código excluído não ser reaproveitado.
const CHAVE_SEQUENCIA = "gemape-demo-clientes-sequencia";
const formatarCodigo = (n: number) => String(n).padStart(5, "0");
const numeroDoCodigo = (codigo: string | undefined) => Number(/^(\d+)$/.exec(codigo ?? "")?.[1] ?? 0);


// Dado salvo ilegível nunca é sobrescrito: a lista aparece vazia, mas gravar por cima apagaria o que sobrou.
function conferirIntegridade(storage: StorageLike): void {
  const bruto = storage.getItem(CHAVE);
  if (bruto === null) return;
  let ok = false;
  try { ok = Array.isArray(JSON.parse(bruto)); } catch { ok = false; }
  if (!ok) throw new Error("Os clientes salvos neste navegador estão ilegíveis; nada foi alterado.");
}

export function listarClientes(storage: StorageLike = localStorage): Cliente[] {
  try {
    const lidos = JSON.parse(storage.getItem(CHAVE) ?? "[]");
    if (!Array.isArray(lidos)) return [];
    // Cadastros salvos com o campo único "documento" passam para CPF (11 dígitos) ou CNPJ (14 dígitos).
    return (lidos as (Cliente & { documento?: string })[]).map(({ documento, ...resto }) => {
      const d = somenteDigitos(documento ?? "");
      return { ...resto, cpf: resto.cpf ?? (d.length === 11 ? formatarCpf(d) : ""), cnpj: resto.cnpj ?? (d.length === 14 ? formatarCnpj(d) : "") };
    });
  } catch {
    return [];
  }
}

function ultimoNumero(clientes: Cliente[], storage: StorageLike): number {
  return Math.max(Number(storage.getItem(CHAVE_SEQUENCIA)) || 0, ...clientes.map((item) => numeroDoCodigo(item.codigo)));
}

// Código que o próximo cliente vai receber, para mostrar no formulário.
export function proximoCodigoCliente(storage: StorageLike = localStorage): string {
  return formatarCodigo(ultimoNumero(listarClientes(storage), storage) + 1);
}

export function salvarCliente(
  valores: ClienteDados | (ClienteDados & { id: string }),
  storage: StorageLike = localStorage,
): Cliente {
  conferirIntegridade(storage);
  const clientes = listarClientes(storage);
  const id = "id" in valores ? valores.id : crypto.randomUUID();
  const indice = clientes.findIndex((item) => item.id === id);
  const existente = clientes[indice];
  const nome = capitalizarCadastro(valores.nome.trim());
  if (!nome) throw new Error("Informe o nome do cliente.");
  // CPF e CNPJ são campos separados, ambos opcionais; preenchido, vale só com 11 (CPF) ou 14 (CNPJ) dígitos.
  const cpf = somenteDigitos(valores.cpf);
  const cnpj = somenteDigitos(valores.cnpj);
  if (cpf && cpf !== somenteDigitos(existente?.cpf ?? "")) {
    if (cpf.length !== 11) throw new Error("O CPF deve ter 11 dígitos.");
    if (!cpfValido(cpf)) throw new Error("CPF inválido.");
    if (clientes.some((item) => item.id !== id && somenteDigitos(item.cpf) === cpf)) throw new Error("CPF já cadastrado.");
  }
  if (cnpj && cnpj !== somenteDigitos(existente?.cnpj ?? "")) {
    if (cnpj.length !== 14) throw new Error("O CNPJ deve ter 14 dígitos.");
    if (clientes.some((item) => item.id !== id && somenteDigitos(item.cnpj) === cnpj)) throw new Error("CNPJ já cadastrado.");
  }
  for (const [campo, rotulo] of [["telefone", "Telefone"], ["telefone2", "Telefone 2"]] as const) {
    const t = valores[campo].trim();
    if (t && !validarTelefone(t) && t !== existente?.[campo]) throw new Error(`${rotulo} deve ter 10 ou 11 dígitos.`);
  }
  const email = valores.email.trim().toLowerCase();
  if (email && !emailValido(email) && email !== existente?.email) throw new Error("E-mail inválido.");

  if (!existente) {
    const numero = ultimoNumero(clientes, storage) + 1;
    storage.setItem(CHAVE_SEQUENCIA, String(numero));
  }
  const codigo = existente ? existente.codigo : formatarCodigo(Number(storage.getItem(CHAVE_SEQUENCIA)));
  const cliente: Cliente = {
    id, codigo, nome,
    cpf: cpf ? formatarCpf(cpf) : "",
    cnpj: cnpj ? formatarCnpj(cnpj) : "",
    endereco: capitalizarCadastro(valores.endereco.trim()),
    contato: capitalizarNomePessoa(valores.contato.trim()),
    telefone: formatarTelefone(valores.telefone.trim()),
    telefone2: formatarTelefone(valores.telefone2.trim()),
    email,
    observacao: valores.observacao.trim(),
  };
  if (indice >= 0) clientes[indice] = cliente;
  else clientes.push(cliente);
  storage.setItem(CHAVE, JSON.stringify(clientes));
  return cliente;
}

export function removerCliente(id: string, storage: StorageLike = localStorage): void {
  conferirIntegridade(storage);
  storage.setItem(CHAVE, JSON.stringify(listarClientes(storage).filter((item) => item.id !== id)));
}
