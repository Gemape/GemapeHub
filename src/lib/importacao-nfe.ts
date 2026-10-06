// Importação da NF-e: casa cada item da nota com um produto da GEMAPE pelo par
// fornecedor + código do fornecedor (Cadastros > Gerais > Código de fábrica) e monta as
// entradas no estoque do módulo do produto. Item sem casamento fica como pendência.
import type { CodigoFabrica, TabelaProduto } from "./parametros-base.ts";
import type { ItemNfe, NotaFiscalXml } from "./nfe-xml.ts";
import { formatarCnpj } from "./formatacao-cadastral.ts";

export type ModuloEstoque = "epi" | "uniforme" | "ferramenta";

export const MODULO_DA_TABELA: Record<TabelaProduto, ModuloEstoque> = {
  epis: "epi",
  uniformes: "uniforme",
  ferramentas: "ferramenta",
};

export const ROTULO_MODULO: Record<ModuloEstoque, string> = {
  epi: "EPI",
  uniforme: "Uniforme",
  ferramenta: "Ferramenta",
};

type Cadastro = { id: string; cnpj: string; nome_fantasia: string; razao_social?: string };
export type ProdutoComId = {
  id: string;
  tabela: TabelaProduto;
  codigo_sku: string;
  nome: string;
  empresa_id: string | null;
  // Estoque por tamanho (decisão 23): a nota não traz o tamanho, então o item não é gravado.
  controlaTamanho?: boolean;
};

export type DestinoItem = {
  tabela: TabelaProduto;
  modulo: ModuloEstoque;
  item_id: string;
  codigo: string;
  nome: string;
};

export type LinhaImportacao = {
  item: ItemNfe;
  destino: DestinoItem | null;
  pendencia: string | null;
};

export type PreviaImportacao = {
  nota: NotaFiscalXml;
  empresa: Cadastro | null;
  fornecedor: Cadastro | null;
  // Motivo que impede gravar qualquer item da nota.
  bloqueio: string | null;
  linhas: LinhaImportacao[];
  avisos: string[];
};

export type EntradasNota = {
  chave: string;
  numero: string;
  serie: string;
  data_emissao: string;
  empresa_id: string;
  fornecedor_id: string;
  compras_epis: Record<string, unknown>[];
  compras_uniformes: Record<string, unknown>[];
  movimentacoes: Record<string, unknown>[];
};

const soDigitos = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "");
const mesmoCodigo = (a: string, b: string) => a.trim().toUpperCase() === b.trim().toUpperCase();
const moeda = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }).replace(/\u00a0/g, " ");

export function prepararImportacao(entrada: {
  nota: NotaFiscalXml;
  empresas: Cadastro[];
  fornecedores: Cadastro[];
  codigosFabrica: CodigoFabrica[];
  produtos: ProdutoComId[];
  chavesImportadas: string[];
}): PreviaImportacao {
  const { nota } = entrada;
  const empresa =
    entrada.empresas.find((e) => soDigitos(e.cnpj) === nota.destinatario.cnpj) ?? null;
  const fornecedor =
    entrada.fornecedores.find((f) => soDigitos(f.cnpj) === nota.emitente.cnpj) ?? null;

  let bloqueio: string | null = null;
  if (entrada.chavesImportadas.includes(nota.chave)) {
    bloqueio = `A NF-e ${nota.numero} (chave ${nota.chave}) já foi importada.`;
  } else if (!empresa) {
    bloqueio = `Nenhuma empresa cadastrada tem o CNPJ ${formatarCnpj(nota.destinatario.cnpj)}, destinatário da nota.`;
  }

  const linhas = nota.itens.map((item): LinhaImportacao => {
    const pendente = (pendencia: string) => ({ item, destino: null, pendencia });
    if (!fornecedor) {
      return pendente(`Fornecedor com CNPJ ${formatarCnpj(nota.emitente.cnpj)} não cadastrado em Fornecedores.`);
    }
    if (!(item.quantidade > 0) || !Number.isInteger(item.quantidade)) {
      return pendente(
        `Quantidade fracionada ou inválida (${item.quantidade.toLocaleString("pt-BR")} ${item.unidade}).`,
      );
    }
    if (item.valorUnitario < 0) return pendente("Valor unitário negativo.");
    if (!empresa) return pendente("Empresa destinatária não cadastrada.");
    const codigo = entrada.codigosFabrica.find(
      (c) =>
        c.empresa_id === empresa.id &&
        c.fornecedor_id === fornecedor.id &&
        mesmoCodigo(c.codigo_fornecedor, item.codigo),
    );
    if (!codigo) {
      return pendente(
        `Código ${item.codigo} sem código de fábrica para este fornecedor e empresa. ` +
          "Associe o código em Cadastros > Gerais > Código de fábrica.",
      );
    }
    const produto = entrada.produtos.find(
      (p) =>
        p.tabela === codigo.tabela &&
        p.empresa_id === empresa.id &&
        p.codigo_sku === codigo.codigo_produto,
    );
    if (!produto) {
      return pendente(
        `O produto ${codigo.codigo_produto} do código de fábrica não está mais cadastrado.`,
      );
    }
    if (produto.controlaTamanho) {
      return pendente(
        `O produto ${produto.codigo_sku} tem estoque por tamanho e a nota não informa o tamanho. ` +
          "Registre esta entrada pela tela de Compras, escolhendo o tamanho.",
      );
    }
    return {
      item,
      destino: {
        tabela: produto.tabela,
        modulo: MODULO_DA_TABELA[produto.tabela],
        item_id: produto.id,
        codigo: produto.codigo_sku,
        nome: produto.nome,
      },
      pendencia: null,
    };
  });

  const avisos = nota.itens
    .filter((i) => Math.abs(i.quantidade * i.valorUnitario - i.valorTotal) > 0.01)
    .map(
      (i) =>
        `Item ${i.numero} (${i.codigo}): o valor total ${moeda(i.valorTotal)} não confere com ` +
        `${i.quantidade} × ${moeda(i.valorUnitario)}. Grava-se o valor unitário da nota.`,
    );

  return { nota, empresa, fornecedor, bloqueio, linhas, avisos };
}

// Entradas a gravar de uma vez. A data é a de emissão da nota, em Brasília: o histórico
// mostra quando a compra aconteceu, não quando o arquivo foi lido.
export function montarEntradas(previa: PreviaImportacao): EntradasNota {
  if (previa.bloqueio) throw new Error(previa.bloqueio);
  const casadas = previa.linhas.filter((l) => l.destino);
  if (!previa.empresa || !previa.fornecedor || casadas.length === 0) {
    throw new Error("Nenhum item da nota foi casado com um produto: não há o que gravar.");
  }
  const { nota, empresa, fornecedor } = previa;
  const origem = `NF-e ${nota.numero}, série ${nota.serie || "—"}`;
  const entradas: EntradasNota = {
    chave: nota.chave,
    numero: nota.numero,
    serie: nota.serie,
    data_emissao: nota.dataEmissao,
    empresa_id: empresa.id,
    fornecedor_id: fornecedor.id,
    compras_epis: [],
    compras_uniformes: [],
    movimentacoes: [],
  };
  for (const { item, destino } of casadas) {
    if (!destino) continue;
    if (destino.modulo === "ferramenta") {
      entradas.movimentacoes.push({
        modulo: "ferramenta",
        tipo_movimentacao: "Entrada",
        item_id: destino.item_id,
        empresa_id: empresa.id,
        empregado_id: null,
        quantidade: item.quantidade,
        data_movimentacao: nota.dataEmissao,
        sinalizar_ocorrencia: false,
        // A coluna observacao do banco real aceita até 500 caracteres.
        observacao: (
          `Entrada pela ${origem}, item ${item.numero} (${item.codigo}), de ` +
          `${fornecedor.nome_fantasia?.trim() || fornecedor.razao_social?.trim() || ""}, a ${moeda(item.valorUnitario)} cada. Chave ${nota.chave}.`
        ).slice(0, 500),
      });
    } else {
      const compra = {
        empresa_id: empresa.id,
        item_id: destino.item_id,
        fornecedor: fornecedor.nome_fantasia?.trim() || fornecedor.razao_social?.trim() || "",
        nota_fiscal: nota.numero,
        data_compra: nota.dataEmissao,
        quantidade: item.quantidade,
        valor_unitario: item.valorUnitario,
        observacao:
          `Importada do XML da ${origem}, item ${item.numero} (${item.codigo}). Chave ${nota.chave}.`.slice(
            0,
            500,
          ),
      };
      (destino.modulo === "epi" ? entradas.compras_epis : entradas.compras_uniformes).push(compra);
    }
  }
  return entradas;
}
