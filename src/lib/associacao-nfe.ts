// Associação do código de fábrica a partir do XML da NF-e. A tela Cadastros > Gerais > Código
// de fábrica lê a nota só para listar os itens e criar as associações (código do produto no
// fornecedor → código interno da GEMAPE). Não grava entrada nem mexe em estoque: a entrada da
// nota continua nos módulos (src/lib/importacao-nfe.ts), que casam os itens por estas associações.
import type { NotaFiscalXml } from "./nfe-xml.ts";
import { formatarCnpj } from "./formatacao-cadastral.ts";
import {
  salvarCodigoFabrica,
  type CodigoFabrica,
  type StorageLike,
  type TabelaProduto,
} from "./parametros-base.ts";

type Cadastro = { id: string; cnpj: string; nome_fantasia: string; razao_social?: string };
const nomeCadastro = (c: Cadastro) => c.nome_fantasia?.trim() || c.razao_social?.trim() || "";
export type ProdutoAssociavel = {
  tabela: TabelaProduto;
  codigo_sku: string;
  nome: string;
  empresa_id: string | null;
};

export type StatusAssociacao = "vinculado" | "pendente" | "reassociar";

export type LinhaAssociacao = {
  // Código do produto no fornecedor, como veio na nota (primeira ocorrência).
  codigo: string;
  descricao: string;
  unidade: string;
  // Números dos itens da nota que usam este código: uma associação vale para todos.
  itens: number[];
  status: StatusAssociacao;
  associacao: CodigoFabrica | null;
  produto: ProdutoAssociavel | null;
  motivo: string | null;
};

export type PreviaAssociacao = {
  nota: NotaFiscalXml;
  empresa: Cadastro | null;
  fornecedor: Cadastro | null;
  // Motivo que impede associar qualquer item da nota.
  bloqueio: string | null;
  linhas: LinhaAssociacao[];
};

const soDigitos = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "");
const chaveCodigo = (codigo: string) => codigo.trim().toUpperCase();

export function prepararAssociacoes(entrada: {
  nota: NotaFiscalXml;
  empresas: Cadastro[];
  fornecedores: Cadastro[];
  codigosFabrica: CodigoFabrica[];
  produtos: ProdutoAssociavel[];
}): PreviaAssociacao {
  const { nota } = entrada;
  const empresa =
    entrada.empresas.find((e) => soDigitos(e.cnpj) === nota.destinatario.cnpj) ?? null;
  const fornecedor =
    entrada.fornecedores.find((f) => soDigitos(f.cnpj) === nota.emitente.cnpj) ?? null;

  let bloqueio: string | null = null;
  if (!empresa) {
    bloqueio = `Nenhuma empresa cadastrada tem o CNPJ ${formatarCnpj(nota.destinatario.cnpj)}, destinatário da nota.`;
  } else if (!fornecedor) {
    bloqueio =
      `O fornecedor com CNPJ ${formatarCnpj(nota.emitente.cnpj)} (${nota.emitente.nome}) não está cadastrado. ` +
      "Cadastre em Cadastros > Fornecedores e importe a nota de novo.";
  }

  const porCodigo = new Map<string, LinhaAssociacao>();
  for (const item of nota.itens) {
    const chave = chaveCodigo(item.codigo);
    const existente = porCodigo.get(chave);
    if (existente) {
      existente.itens.push(item.numero);
      continue;
    }
    let status: StatusAssociacao = "pendente";
    let associacao: CodigoFabrica | null = null;
    let produto: ProdutoAssociavel | null = null;
    let motivo: string | null = null;
    if (empresa && fornecedor) {
      associacao =
        entrada.codigosFabrica.find(
          (c) =>
            c.empresa_id === empresa.id &&
            c.fornecedor_id === fornecedor.id &&
            chaveCodigo(c.codigo_fornecedor) === chave,
        ) ?? null;
      if (associacao) {
        const ligada = associacao;
        produto =
          entrada.produtos.find(
            (p) =>
              p.tabela === ligada.tabela &&
              p.empresa_id === empresa.id &&
              p.codigo_sku === ligada.codigo_produto,
          ) ?? null;
        if (produto) {
          status = "vinculado";
        } else {
          status = "reassociar";
          motivo = `O produto ${associacao.codigo_produto} desta associação não está mais cadastrado. Escolha outro produto.`;
        }
      }
    }
    porCodigo.set(chave, {
      codigo: item.codigo,
      descricao: item.descricao,
      unidade: item.unidade,
      itens: [item.numero],
      status,
      associacao,
      produto,
      motivo,
    });
  }

  return { nota, empresa, fornecedor, bloqueio, linhas: [...porCodigo.values()] };
}

// Grava a associação de um item da nota ao produto escolhido. Usa a mesma regra do cadastro
// manual (CA obrigatório para EPI, sem repetir o código do mesmo fornecedor na empresa).
export function associarItemNfe(entrada: {
  previa: PreviaAssociacao;
  codigo: string;
  produto: ProdutoAssociavel;
  ca?: string;
  storage?: StorageLike | null;
  // Listas lidas agora, na hora de gravar: se informadas, fornecedor e produto precisam
  // continuar nelas (podem ter sido excluídos depois da leitura do arquivo).
  fornecedoresAtuais?: Cadastro[];
  produtosAtuais?: ProdutoAssociavel[];
}): CodigoFabrica {
  const { previa, produto } = entrada;
  if (previa.bloqueio || !previa.empresa || !previa.fornecedor) {
    throw new Error(previa.bloqueio ?? "A nota não pode ser associada.");
  }
  if (entrada.fornecedoresAtuais && !entrada.fornecedoresAtuais.some((f) => f.id === previa.fornecedor?.id)) {
    throw new Error(
      `O fornecedor ${nomeCadastro(previa.fornecedor)} não está mais cadastrado. Importe a nota de novo.`,
    );
  }
  if (
    entrada.produtosAtuais &&
    !entrada.produtosAtuais.some(
      (p) =>
        p.tabela === produto.tabela &&
        p.codigo_sku === produto.codigo_sku &&
        p.empresa_id === produto.empresa_id,
    )
  ) {
    throw new Error(`O produto ${produto.codigo_sku} não está mais cadastrado. Escolha outro.`);
  }
  const linha = previa.linhas.find((l) => chaveCodigo(l.codigo) === chaveCodigo(entrada.codigo));
  if (!linha) throw new Error(`O código ${entrada.codigo} não está na nota.`);
  if (linha.status === "vinculado") {
    throw new Error(
      `O código ${linha.codigo} já está vinculado a ${linha.associacao?.codigo_produto}. ` +
        "Para trocar, edite a associação na lista.",
    );
  }
  if (produto.empresa_id !== previa.empresa.id) {
    throw new Error(
      `O produto ${produto.codigo_sku} não é da empresa ${previa.empresa.nome_fantasia}, destinatária da nota.`,
    );
  }
  const dados = {
    empresa_id: previa.empresa.id,
    tabela: produto.tabela,
    codigo_produto: produto.codigo_sku,
    nome_produto: produto.nome,
    fornecedor_id: previa.fornecedor.id,
    fornecedor_nome: nomeCadastro(previa.fornecedor),
    codigo_fornecedor: linha.codigo,
    ca: entrada.ca ?? "",
  };
  // Associação cujo produto sumiu é trocada no lugar, sem duplicar o código do fornecedor.
  return entrada.storage === undefined
    ? salvarCodigoFabrica(dados, linha.associacao?.id)
    : salvarCodigoFabrica(dados, linha.associacao?.id, entrada.storage);
}
