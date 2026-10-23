// Grava os dados de teste no armazenamento do navegador (modo demonstração) e os tira de lá. Roda ao abrir o sistema, antes de qualquer tela ler os
// dados, só no modo demonstração e só no armazenamento local: nada disso vai ao Supabase nem existe fora dele.
//
//  - Primeira vez, ou versão nova do conjunto: grava o conjunto (trocando só o que é de teste) e guarda a versão aplicada.
//  - Mesma versão: não faz nada, e o que o usuário mexeu nos dados de teste permanece (sobrevive a recarregar, fechar e reabrir o navegador).
//  - Botões do menu "Dados de teste": Restaurar (repõe o conjunto original) e Limpar (tira os dados de teste e não grava mais, até restaurar).
// Os registros de teste se reconhecem pelo prefixo "teste-" no id; as listas de Gerais, que ganham ids próprios, ficam anotadas no controle.
import { sincronizarEstoqueEpis, TABELAS_EPI, TABELAS_UNIFORME } from "../epi-catalogo.ts";
import { descricaoVeiculo } from "../descricao-veiculo.ts";
import { hojeLocal } from "../empregados.ts";
import { prepararCadastroFerramenta } from "../cadastro-ferramentas.ts";
import { codigoCaixa } from "../caixas-habilitadas.ts";
import { salvarCliente } from "../clientes-demo.ts";
import { salvarEquipamento } from "../equipamentos-demo.ts";
import { salvarFornecedor } from "../fornecedores-demo.ts";
import { registrarAbastecimento } from "../registros-veiculo.ts";
import * as Gerais from "../parametros-base.ts";
import { restaurarPermissoes } from "../permissoes-demo.ts";
import { semearModuloEquipamentos } from "./equipamentos-modulo.ts";
import { semearViagens } from "./viagens.ts";
import {
  ACOES_MANUTENCAO_VEICULO, CLIENTES, EMPREGADOS, EMPRESAS, EPIS, EQUIPAMENTOS, FERRAMENTAS, FORNECEDORES, MARCAS_FERRAMENTA, MARCAS_UNIFORME, PREFIXO,
  TAMANHOS_AUTORIZADOS, TAMANHOS_GRUPO_FERRAMENTA, TIPOS_OCORRENCIA_VEICULO, UNIFORMES, VEICULOS, VERSAO_DADOS_TESTE, type ItemCatalogoTeste,
} from "./conjunto.ts";

export type Armazenamento = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type Linha = Record<string, unknown>;
type Dados = Record<string, Linha[]>;

export const CHAVE_CONTROLE = "gemape-demo-dados-teste";
const CHAVE_DADOS = "gemape-demo-dados";
// Coleções guardadas à parte, uma lista de registros com `id` cada.
export const CHAVES_LISTAS = [
  "gemape-demo-fornecedores", "gemape-demo-clientes", "gemape-demo-equipamentos", "gemape-demo-abastecimentos", "gemape-demo-portadores-caixa",
  "gemape-demo-respostas-despesas", "gemape-demo-eq-abastecimentos", "gemape-demo-eq-manutencoes", "gemape-demo-eq-ocorrencias", "gemape-demo-eq-checklists", "gemape-demo-eq-checklists-exec",
  "gemape-demo-eq-previsoes-manutencao", "gemape-demo-eq-previsoes-vistoria",
] as const;
const CHAVE_QUESTIONARIO = "gemape-demo-questionario-despesas";

export type Estado = "aplicado" | "limpo" | "restaurar" | "limpar";
export type Controle = { versao: number; estado: Estado; aplicadoEm: string; gerais: Record<string, string[]> };

const ehLinha = (v: unknown): v is Linha => !!v && typeof v === "object" && !Array.isArray(v);
const teste = (l: Linha) => typeof l["id"] === "string" && (l["id"] as string).startsWith(PREFIXO);

function lerJson(storage: Armazenamento, chave: string): unknown {
  const bruto = storage.getItem(chave);
  if (bruto === null) return undefined;
  try { return JSON.parse(bruto); } catch { throw new Error(`Os dados salvos em ${chave} estão ilegíveis; os dados de teste não foram aplicados, para não apagá-los.`); }
}

export function lerControle(storage: Armazenamento): Controle | null {
  try {
    const c = lerJson(storage, CHAVE_CONTROLE);
    return ehLinha(c) && typeof c["versao"] === "number" ? (c as unknown as Controle) : null;
  } catch {
    return null;
  }
}

function lerDados(storage: Armazenamento, base: Dados): Dados {
  const lido = lerJson(storage, CHAVE_DADOS);
  const inicial = JSON.parse(JSON.stringify(base)) as Dados;
  return ehLinha(lido) ? { ...inicial, ...(lido as Dados) } : inicial;
}

// ---------- remover ----------
export function removerDadosDeTeste(storage: Armazenamento, base: Dados): void {
  const controle = lerControle(storage);
  // Dados do sistema (empresas, empregados, EPIs, uniformes, ferramentas, veículos, movimentações, caixas...).
  if (storage.getItem(CHAVE_DADOS) !== null) {
    const dados = lerDados(storage, base);
    const itensDeTeste = new Set(Object.values(dados).flat().filter((l) => teste(l) && ("codigo_sku" in l || "placa" in l)).map((l) => String(l["id"])));
    const catalogosDeTeste = new Set([...(dados["epis_catalogo"] ?? []), ...(dados["uniformes_catalogo"] ?? [])].filter(teste).map((l) => String(l["id"])));
    const empresasDeTeste = new Set((dados["empresas"] ?? []).filter(teste).map((l) => String(l["id"])));
    for (const tabela of Object.keys(dados)) {
      dados[tabela] = (dados[tabela] ?? []).filter((l) => {
        if (teste(l)) return false;
        // O que o usuário registrou em cima de dados de teste vai junto: sem o item ou a empresa, a linha ficaria solta.
        if (typeof l["item_id"] === "string" && itensDeTeste.has(l["item_id"])) return false;
        if (typeof l["catalogo_id"] === "string" && catalogosDeTeste.has(l["catalogo_id"])) return false;
        if (tabela !== "empresas" && typeof l["empresa_id"] === "string" && empresasDeTeste.has(l["empresa_id"])) return false;
        return true;
      });
    }
    storage.setItem(CHAVE_DADOS, JSON.stringify(dados));
  }
  for (const chave of CHAVES_LISTAS) {
    const lido = lerJson(storage, chave);
    if (Array.isArray(lido)) storage.setItem(chave, JSON.stringify(lido.filter((l) => !(ehLinha(l) && teste(l)))));
  }
  // Veículos e equipamentos de teste levam junto os abastecimentos feitos neles.
  // (O abastecimento guarda `veiculoId`; já saiu acima quando o id tinha o prefixo, e este passo cobre os registros do usuário.)
  const abastecimentos = lerJson(storage, "gemape-demo-abastecimentos");
  if (Array.isArray(abastecimentos)) storage.setItem("gemape-demo-abastecimentos", JSON.stringify(abastecimentos.filter((a) => !(ehLinha(a) && typeof a["veiculoId"] === "string" && (a["veiculoId"] as string).startsWith(PREFIXO)))));
  // Registros do módulo Equipamentos feitos em equipamentos de teste (os de teste já saíram acima pelo prefixo).
  for (const chave of CHAVES_LISTAS.filter((c) => c.startsWith("gemape-demo-eq-"))) {
    const lido = lerJson(storage, chave);
    if (Array.isArray(lido)) storage.setItem(chave, JSON.stringify(lido.filter((r) => !(ehLinha(r) && typeof r["equipamentoId"] === "string" && (r["equipamentoId"] as string).startsWith(PREFIXO)))));
  }
  // Planos de manutenção e check lists associados a equipamentos de teste (os parâmetros em si, como ações e grupos, ficam).
  for (const chave of ["gemape-demo-equipamentos-manutencao", "gemape-demo-equipamentos-checklist"]) {
    const lido = lerJson(storage, chave);
    if (!ehLinha(lido)) continue;
    const doTeste = (r: unknown) => ehLinha(r) && typeof r["equipamentoId"] === "string" && (r["equipamentoId"] as string).startsWith(PREFIXO);
    if (Array.isArray(lido["planos"])) lido["planos"] = lido["planos"].filter((p) => !doTeste(p));
    for (const f of ["manutencao", "vistoria"]) {
      const parte = lido[f];
      if (ehLinha(parte) && Array.isArray(parte["associacoes"])) parte["associacoes"] = parte["associacoes"].filter((a) => !doTeste(a));
    }
    storage.setItem(chave, JSON.stringify(lido));
  }
  // Técnicos habilitados do questionário de viagens que são empregados de teste.
  const questionario = lerJson(storage, CHAVE_QUESTIONARIO);
  if (ehLinha(questionario) && Array.isArray(questionario["perguntas"])) {
    for (const p of questionario["perguntas"] as Linha[]) {
      if (Array.isArray(p["habilitados"])) p["habilitados"] = (p["habilitados"] as Linha[]).filter((h) => !(typeof h["empregadoId"] === "string" && (h["empregadoId"] as string).startsWith(PREFIXO)));
    }
    storage.setItem(CHAVE_QUESTIONARIO, JSON.stringify(questionario));
  }
  // Gerais: só o que o conjunto criou (ids anotados no controle).
  if (controle?.gerais && storage.getItem("gemape-demo-parametros-base") !== null) {
    const d = Gerais.lerParametros(storage) as unknown as Record<string, unknown>;
    for (const [lista, ids] of Object.entries(controle.gerais)) {
      if (Array.isArray(d[lista])) d[lista] = (d[lista] as Linha[]).filter((o) => !ids.includes(String(o["id"])));
    }
    storage.setItem("gemape-demo-parametros-base", JSON.stringify(d));
  }
}

// ---------- gravar ----------
const dia = (agora: Date, atras: number) => hojeLocal(new Date(agora.getTime() - atras * 86_400_000));
const sequencia = (prefixo: string) => { let n = 0; return () => `${PREFIXO}${prefixo}-${++n}`; };

// Próximo número de um código com sigla (EPI-0002...): continua depois do maior já usado nas tabelas.
function proximosCodigos(dados: Dados, sigla: string, tabelas: string[]): () => string {
  const usados = tabelas.flatMap((t) => dados[t] ?? []).map((l) => String(l["codigo_sku"] ?? "")).filter((c) => c.startsWith(`${sigla}-`));
  let n = Math.max(0, ...usados.map((c) => Number(c.slice(sigla.length + 1)) || 0));
  return () => `${sigla}-${String(++n).padStart(4, "0")}`;
}

export function aplicarDadosDeTeste(storage: Armazenamento, base: Dados, agora = new Date()): Controle {
  const gerais: Record<string, string[]> = {};
  const anotar = (lista: string, id: string) => { (gerais[lista] ??= []).push(id); };
  const hoje = hojeLocal(agora);

  // ----- Gerais: tamanhos e unidades autorizados, marcas, tipos de ocorrência, ações de manutenção, caixas -----
  for (const [sub, tamanhos] of Object.entries(TAMANHOS_AUTORIZADOS)) {
    Gerais.autorizar(sub, "tamanhos", [...tamanhos], storage);
    Gerais.autorizar(sub, "unidades", [sub === "sub-epi-botina" || sub === "sub-epi-luva" ? "uni-par" : "uni-unidade"], storage);
  }
  for (const sub of ["sub-epi-capacete", "sub-epi-oculos", "sub-epi-protetor-auricular"]) Gerais.autorizar(sub, "unidades", ["uni-unidade"], storage);
  for (const nome of MARCAS_FERRAMENTA) anotar("marcasFerramenta", Gerais.adicionarListaFerramenta("marcasFerramenta", nome, storage).id);
  for (const nome of MARCAS_UNIFORME) anotar("marcasUniforme", Gerais.adicionarListaFerramenta("marcasUniforme", nome, storage).id);
  for (const t of TIPOS_OCORRENCIA_VEICULO) anotar("tiposOcorrenciaVeiculo", Gerais.adicionarTipoOcorrenciaVeiculo(t.nome, t.descricao, storage).id);
  for (const a of ACOES_MANUTENCAO_VEICULO) anotar("acoesManutencaoVeiculo", Gerais.adicionarAcaoManutencaoVeiculo(a.nome, [...a.subitens], storage).id);
  const grupoPorNome = (nome: string) => {
    const g = Gerais.lerParametros(storage).gruposFerramenta.find((x) => x.nome === nome);
    if (!g) throw new Error(`Grupo de ferramenta ${nome} não existe em Gerais.`);
    return g;
  };
  const tamanhosDosGrupos = { ...TAMANHOS_GRUPO_FERRAMENTA };
  for (const f of FERRAMENTAS) if (f.tamanho) tamanhosDosGrupos[f.grupo] = [...(tamanhosDosGrupos[f.grupo] ?? []), f.tamanho];
  for (const [grupo, tamanhos] of Object.entries(tamanhosDosGrupos)) {
    const g = grupoPorNome(grupo);
    for (const tamanho of tamanhos) {
      if (!(Gerais.lerParametros(storage).tamanhosGrupoFerramenta[g.id] ?? []).some((t) => Gerais.mesmoNome(t, tamanho))) Gerais.adicionarTamanhoGrupoFerramenta(g.id, tamanho, storage);
    }
  }

  // ----- Fornecedores e clientes (as mesmas gravações das telas; o id de teste entra depois) -----
  const fornecedorIds: string[] = [];
  for (const f of FORNECEDORES) {
    const { id, ...valores } = f;
    const salvo = salvarFornecedor({ ...valores, categorias: [...f.categorias] }, storage as Storage);
    trocarId(storage, "gemape-demo-fornecedores", salvo.id, id);
    fornecedorIds.push(id);
  }
  for (const c of CLIENTES) {
    const { id, ...valores } = c;
    const salvo = salvarCliente({ ...valores }, storage as Storage);
    trocarId(storage, "gemape-demo-clientes", salvo.id, id);
  }

  // ----- Dados do sistema -----
  const dados = lerDados(storage, base);
  const tabela = (nome: string): Linha[] => (dados[nome] ??= []);
  const criadoEm = agora.toISOString();
  for (const e of EMPRESAS) tabela("empresas").push({ ...e, status: "Ativa", created_at: criadoEm });
  for (const e of EMPREGADOS) {
    tabela("empregados").push({ id: e.id, empresa_id: e.empresaId, nome: e.nome, cpf: e.cpf, matricula: e.matricula, email: e.email, data_admissao: e.admissao, data_demissao: null, ativo: true, created_at: criadoEm });
  }

  // Catálogo de EPI e de uniforme: um registro por tamanho; o estoque de cada empresa nasce dele.
  const adicionarCatalogo = (lista: readonly ItemCatalogoTeste[], tabelaCatalogo: string, proximoCodigo: () => string, prefixo: string) => {
    const novoId = sequencia(prefixo);
    const ids: { id: string; codigo: string; item: ItemCatalogoTeste; indice: number }[] = [];
    for (const item of lista) {
      item.tamanhos.forEach((tamanho, indice) => {
        const id = novoId();
        const codigo = proximoCodigo();
        tabela(tabelaCatalogo).push({
          id, created_at: criadoEm, codigo_sku: codigo, nome: item.nome, categoria: item.subNome, subcategoria_id: item.sub, unidade_id: item.unidade,
          unidade_medida: item.unidadeNome, tamanho_id: tamanho, estoque_minimo: item.minimos[indice] ?? 0, status: "Ativo",
        });
        ids.push({ id, codigo, item, indice });
      });
    }
    return ids;
  };
  const catalogoEpis = adicionarCatalogo(EPIS, "epis_catalogo", proximosCodigos(dados, "EPI", ["epis", "epis_catalogo"]), "epi-cat");
  const catalogoUniformes = adicionarCatalogo(UNIFORMES, "uniformes_catalogo", proximosCodigos(dados, "UNI", ["uniformes", "uniformes_catalogo"]), "uniforme-cat");
  sincronizarEstoqueEpis(dados, sequencia("epi-est"), criadoEm, TABELAS_EPI);
  sincronizarEstoqueEpis(dados, sequencia("uniforme-est"), criadoEm, TABELAS_UNIFORME);

  const empresaIds = EMPRESAS.map((e) => e.id);
  const estoqueDe = (tabelaEstoque: string, catalogoId: string, empresaId: string) =>
    tabela(tabelaEstoque).find((l) => l["catalogo_id"] === catalogoId && l["empresa_id"] === empresaId)!;
  const movimentosDe: Linha[] = [];
  const novoMov = sequencia("mov");
  let ent = Math.max(0, ...tabela("movimentacoes").map((m) => Number(/^ENT-(\d+)$/.exec(String(m["codigo_movimentacao"] ?? ""))?.[1] ?? 0)));
  let dev = Math.max(0, ...tabela("movimentacoes").map((m) => Number(/^DEV-(\d+)$/.exec(String(m["codigo_movimentacao"] ?? ""))?.[1] ?? 0)));
  const mov = (m: Linha): void => {
    movimentosDe.push({ id: novoMov(), created_at: criadoEm, empregado_id: null, observacao: null, tamanho_id: null, motivo_baixa: null, onus_baixa: null, tipo_vistoria: null, sinalizar_ocorrencia: false, ...m });
  };

  // Compras (entradas) de EPI e de uniforme: cada empresa compra os itens do catálogo do fornecedor indicado, com nota fiscal.
  const compras: Record<"compras_epis" | "compras_uniformes", Linha[]> = { compras_epis: [], compras_uniformes: [] };
  const novaCompra = sequencia("compra");
  const comprar = (tabelaCompra: "compras_epis" | "compras_uniformes", modulo: "epi" | "uniforme", tabelaEstoque: string, lista: typeof catalogoEpis, quantidades: number[][], diasAtras: number) => {
    lista.forEach(({ id, item, indice }, n) => {
      empresaIds.forEach((empresaId, e) => {
        const quantidade = quantidades[e]?.[n % (quantidades[e]?.length ?? 1)] ?? 10;
        const estoque = estoqueDe(tabelaEstoque, id, empresaId);
        const fornecedor = FORNECEDORES[item.fornecedor]!;
        const valorUnitario = Math.round((18 + n * 7.5 + indice * 2) * 100) / 100;
        compras[tabelaCompra].push({
          id: novaCompra(), created_at: criadoEm, empresa_id: empresaId, item_id: estoque["id"], fornecedor: fornecedor.nome_fantasia, fornecedor_id: fornecedor.id,
          nota_fiscal: `NF-${String(1200 + n * 3 + e).padStart(5, "0")}`, data_compra: dia(agora, diasAtras + e * 2), quantidade, valor_unitario: valorUnitario,
          valor_total: Math.round(quantidade * valorUnitario * 100) / 100, observacao: "Reposição de estoque", tamanho_id: item.tamanhos[indice] ?? null,
        });
        mov({ modulo, tipo_movimentacao: "Entrada", quantidade, data_movimentacao: dia(agora, diasAtras + e * 2), item_id: estoque["id"], empresa_id: empresaId, tamanho_id: item.tamanhos[indice] ?? null, observacao: `Compra: NF ${String(1200 + n * 3 + e).padStart(5, "0")} / ${fornecedor.nome_fantasia}` });
      });
    });
  };
  // Quantidades por empresa (linhas) e por item do catálogo (colunas), variadas de propósito para o alerta de estoque mínimo.
  comprar("compras_epis", "epi", "epis", catalogoEpis, [[12, 9, 8, 8, 10, 6, 14], [6, 7, 6, 10, 7, 12, 8], [9, 12, 10, 6, 6, 9, 5]], 60);
  comprar("compras_uniformes", "uniforme", "uniformes", catalogoUniformes, [[14, 16, 12, 10, 12, 8, 6, 5], [8, 10, 9, 8, 14, 7, 5, 6], [10, 9, 8, 12, 6, 6, 4, 4]], 55);

  // Entregas (saídas) com código ENT, devolução com código DEV e baixa por desgaste, sempre a um empregado da mesma empresa.
  const entrega = (modulo: "epi" | "uniforme", tabelaEstoque: string, catalogoId: string, empresaIndice: number, quantidade: number, diasAtras: number, tamanho: string | null, extra: Linha = {}, tipo = "Saida") => {
    const estoque = estoqueDe(tabelaEstoque, catalogoId, empresaIds[empresaIndice]!);
    const codigo = tipo === "Saida" && !extra["motivo_baixa"] ? `ENT-${String(++ent).padStart(4, "0")}` : tipo === "Devolucao" ? `DEV-${String(++dev).padStart(4, "0")}` : null;
    mov({
      modulo, tipo_movimentacao: tipo, quantidade, data_movimentacao: dia(agora, diasAtras), item_id: estoque["id"], empresa_id: empresaIds[empresaIndice], empregado_id: EMPREGADOS[empresaIndice]!.id,
      tamanho_id: tamanho, ...(codigo ? { codigo_movimentacao: codigo } : {}), ...extra,
    });
  };
  const epiDe = (nome: string, indice: number) => catalogoEpis.find((c) => c.item.nome.startsWith(nome) && c.indice === indice)!;
  const uniDe = (nome: string, indice: number) => catalogoUniformes.find((c) => c.item.nome.startsWith(nome) && c.indice === indice)!;
  // Empresa 1 (Ana): botina 40 em estoque baixo de propósito, luvas M abaixo do mínimo.
  entrega("epi", "epis", epiDe("Botina", 1).id, 0, 3, 30, "tam-40");
  entrega("epi", "epis", epiDe("Luva", 1).id, 0, 5, 28, "tam-m");
  entrega("epi", "epis", epiDe("Capacete", 0).id, 0, 2, 26, null);
  entrega("epi", "epis", epiDe("Luva", 1).id, 0, 1, 12, "tam-m", { responsavel_nome: "Almoxarifado Gemape", observacao: "Luva devolvida sem uso" }, "Devolucao");
  entrega("epi", "epis", epiDe("Botina", 1).id, 0, 1, 8, "tam-40", { motivo_baixa: "Desgaste Natural", observacao: "Solado gasto" });
  // Empresa 2 (Carlos).
  entrega("epi", "epis", epiDe("Botina", 2).id, 1, 2, 24, "tam-42");
  entrega("epi", "epis", epiDe("Luva", 2).id, 1, 4, 22, "tam-g");
  entrega("epi", "epis", epiDe("Capacete", 0).id, 1, 5, 20, null);
  // Empresa 3 (Fernanda).
  entrega("epi", "epis", epiDe("Botina", 0).id, 2, 2, 18, "tam-38");
  entrega("epi", "epis", epiDe("Luva", 0).id, 2, 3, 16, "tam-p");
  entrega("epi", "epis", epiDe("Capacete", 0).id, 2, 3, 14, null);
  // Uniformes.
  entrega("uniforme", "uniformes", uniDe("Camisa", 1).id, 0, 2, 27, "tam-m");
  entrega("uniforme", "uniformes", uniDe("Calça", 1).id, 0, 2, 27, "tam-42");
  entrega("uniforme", "uniformes", uniDe("Jaqueta", 1).id, 0, 1, 20, "tam-g");
  entrega("uniforme", "uniformes", uniDe("Camisa", 0).id, 1, 3, 21, "tam-p");
  entrega("uniforme", "uniformes", uniDe("Calça", 2).id, 1, 2, 21, "tam-44");
  entrega("uniforme", "uniformes", uniDe("Camisa", 2).id, 2, 2, 15, "tam-g");
  entrega("uniforme", "uniformes", uniDe("Camisa", 2).id, 2, 1, 6, "tam-g", { responsavel_nome: "Almoxarifado Lapa" }, "Devolucao");

  // Ferramentas: uma por empresa, com estoque inicial por entrada.
  const novaFerramenta = sequencia("ferramenta");
  const proximoFer = proximosCodigos(dados, "FER", ["ferramentas"]);
  const parametros = Gerais.lerParametros(storage);
  const ferramentas = FERRAMENTAS.map((f, n) => {
    const cadastro = prepararCadastroFerramenta({
      parametros, codigosExistentes: [proximoFer()], sigla: "", categoriaFerramenta: f.categoria, categoriaAtual: "", grupoFerramenta: f.grupo, qualFerramenta: f.qual,
      marca: f.marca, marcaAtual: "", modelo: f.modelo, tamanho: f.tamanho, tamanhoAtual: "", estoqueMinimo: String(f.minimo),
    });
    // O código fica o que a regra gerou: a lista de existentes tem só o último gerado, então o próximo já sai em sequência.
    return { f, n, id: novaFerramenta(), linha: { ...cadastro, empresa_id: empresaIds[f.empresaIndice], numero_serie: `SN-TESTE-${n + 1}`, estoque_atual: f.entrada, status: "Ativo", unidade_medida: "Unidade", observacoes: "Ferramenta de teste do inventário da empresa.", created_at: criadoEm } };
  });
  for (const { f, id, linha } of ferramentas) {
    tabela("ferramentas").push({ id, ...linha });
    mov({ modulo: "ferramenta", tipo_movimentacao: "Entrada", quantidade: f.entrada, data_movimentacao: dia(agora, 50), item_id: id, empresa_id: empresaIds[f.empresaIndice], observacao: `Compra: ${FORNECEDORES[f.fornecedor]!.nome_fantasia}` });
  }

  // Estoque atual de cada linha de EPI e de uniforme = o que as movimentações somam; o mínimo de cada empresa varia em torno do mínimo do catálogo.
  const aplicarSaldos = (tabelaEstoque: string) => {
    const doModulo = movimentosDe.filter((m) => m["modulo"] === (tabelaEstoque === "epis" ? "epi" : "uniforme"));
    for (const linha of tabela(tabelaEstoque).filter(teste)) {
      const saldo = doModulo.filter((m) => m["item_id"] === linha["id"]).reduce((t, m) => t + (m["tipo_movimentacao"] === "Saida" ? -Number(m["quantidade"]) : Number(m["quantidade"])), 0);
      // Cada empresa tem o seu mínimo, em torno do do catálogo: a primeira acima (alertas aparecem), a segunda um pouco abaixo e a terceira igual.
      const empresa = empresaIds.indexOf(String(linha["empresa_id"]));
      const minimo = Math.max(0, (Number(linha["estoque_minimo"]) || 0) + (empresa === 0 ? 3 : empresa === 1 ? -1 : 0));
      linha["estoque_atual"] = saldo;
      linha["estoque_minimo"] = minimo;
      // Produto com um tamanho só (o catálogo de teste tem um registro por tamanho): saldo e mínimo ficam nesse tamanho (decisão 23).
      const tamanhos = linha["tamanhos_selecionados"];
      if (Array.isArray(tamanhos) && tamanhos.length === 1) {
        linha["saldos_tamanho"] = { [String(tamanhos[0])]: saldo };
        linha["minimos_tamanho"] = { [String(tamanhos[0])]: minimo };
      }
    }
  };
  aplicarSaldos("epis");
  aplicarSaldos("uniformes");
  tabela("movimentacoes").push(...movimentosDe);
  tabela("compras_epis").push(...compras.compras_epis);
  tabela("compras_uniformes").push(...compras.compras_uniformes);

  // Veículos, um por empresa, com empregado responsável.
  const proximoVei = proximosCodigos(dados, "VEI", ["veiculos"]);
  for (const v of VEICULOS) {
    const placaFormatada = `${v.placa.slice(0, 3)}-${v.placa.slice(3)}`;
    tabela("veiculos").push({
      id: v.id, created_at: criadoEm, tipo: v.tipo, placa: placaFormatada, marca: v.marca, modelo: v.modelo, ano: v.ano, cor: v.cor, combustivel: v.combustivel, empresa_id: v.empresaId,
      renavam: v.renavam, quilometragem_atual: v.km, status: "Ativo", empregado_responsavel_id: v.responsavelId, observacoes: v.observacoes,
      descricao: descricaoVeiculo({ placa: placaFormatada, subcategoria: v.tipo, marca: v.marca, modelo: v.modelo, ano: v.ano, cor: v.cor, combustivel: v.combustivel }),
      data_aquisicao: v.aquisicao, custo: v.custo, numero_nota_fiscal: v.nota, subcategoria_id: v.subId, codigo_sku: proximoVei(),
    });
  }

  // Caixas de ferramentas: habilita os números das caixas e cria uma caixa por ferramenta, aos cuidados de um empregado.
  const habilitadas = [...new Set([...Gerais.lerParametros(storage).caixasHabilitadas, ...ferramentas.map((_, n) => n + 1)])];
  const caixasUsuario = tabela("caixas_ferramentas").filter((c) => !teste(c)).map((c) => ({ id: String(c["id"]), codigo: String(c["codigo"] ?? ""), codigo_num: Number(c["codigo_num"]) || null }));
  Gerais.salvarCaixasHabilitadas(habilitadas, caixasUsuario, storage);
  const portadores: Linha[] = [];
  ferramentas.forEach(({ f, id }, n) => {
    const caixaId = `${PREFIXO}caixa-${n + 1}`;
    const numero = n + 1;
    tabela("caixas_ferramentas").push({
      id: caixaId, created_at: criadoEm, codigo: codigoCaixa(numero), codigo_num: numero, empresa_id: empresaIds[f.empresaIndice], nome: codigoCaixa(numero),
      descricao: `Caixa de ${f.grupo.toLocaleLowerCase("pt-BR")} da ${EMPRESAS[f.empresaIndice]!.nome_fantasia}`, localizacao: ["Oficina — bancada 1", "Almoxarifado — prateleira B", "Galpão — armário 3", "Oficina — bancada 4", "Expedição — armário 1"][n] ?? "Almoxarifado", status: "Ativa",
    });
    tabela("caixa_ferramenta_itens").push({ id: `${PREFIXO}caixa-item-${n + 1}`, caixa_id: caixaId, ferramenta_id: id, quantidade: 1, observacao: "Item de teste da caixa" });
    portadores.push({
      id: `${PREFIXO}portador-${n + 1}`, caixa_id: caixaId, caixa_codigo: codigoCaixa(numero), empresa_id: empresaIds[f.empresaIndice], empregado_id: EMPREGADOS[n]!.id,
      empregado_nome: EMPREGADOS[n]!.nome, status: "Ativa", observacao: "Portador de teste", data_inicio: dia(agora, 40), data_fim: null,
    });
  });
  storage.setItem(CHAVE_DADOS, JSON.stringify(dados));
  const guardados = lerJson(storage, "gemape-demo-portadores-caixa");
  storage.setItem("gemape-demo-portadores-caixa", JSON.stringify([...(Array.isArray(guardados) ? guardados : []), ...portadores]));

  // Códigos de fábrica (Gerais): cada produto de teste com o fornecedor de quem compramos, o código dele e, no EPI, o CA.
  const codigoFornecedor = (prefixo: string, n: number) => `${prefixo}-${String(100 + n)}`;
  const fabrica = (tabelaProduto: "epis" | "uniformes" | "ferramentas", codigoProduto: string, nome: string, fornecedorIndice: number, empresaId: string, n: number, ca = "") => {
    const f = FORNECEDORES[fornecedorIndice]!;
    const salvo = Gerais.salvarCodigoFabrica({ tabela: tabelaProduto, empresa_id: empresaId, codigo_produto: codigoProduto, nome_produto: nome, fornecedor_id: f.id, fornecedor_nome: f.nome_fantasia, codigo_fornecedor: codigoFornecedor(f.nome_fantasia.slice(0, 2).toUpperCase(), n), ca } as Gerais.DadosCodigoFabrica, undefined, storage);
    anotar("codigosFabrica", salvo.id);
  };
  catalogoEpis.forEach((c, n) => fabrica("epis", c.codigo, c.item.nome, c.item.fornecedor, empresaIds[0]!, n, c.item.ca ?? ""));
  catalogoUniformes.forEach((c, n) => fabrica("uniformes", c.codigo, c.item.nome, c.item.fornecedor, empresaIds[0]!, 50 + n));
  ferramentas.forEach(({ f, linha }, n) => fabrica("ferramentas", String(linha["codigo_sku"]), String(linha["nome"]), f.fornecedor, empresaIds[f.empresaIndice]!, 90 + n));

  // Equipamentos: um por empresa (as mesmas conferências da tela de Cadastrar equipamento).
  EQUIPAMENTOS.forEach((e, n) => {
    const salvo = salvarEquipamento({ ...e, empresaId: empresaIds[e.empresaIndice]!, tecnico: { ...e.tecnico } }, storage as Storage, agora);
    trocarId(storage, "gemape-demo-equipamentos", salvo.id, `${PREFIXO}equipamento-${n + 1}`);
  });

  // Módulo Equipamentos: abastecimentos, manutenções, ocorrências e check lists, pelas mesmas funções das telas.
  semearModuloEquipamentos(storage, agora);

  // Abastecimentos dos veículos (as mesmas conferências do registro em Veículos).
  VEICULOS.forEach((v, n) => {
    const ab = registrarAbastecimento({ veiculoId: v.id, data: dia(agora, 20 - n * 3), hora: `${String(8 + n).padStart(2, "0")}:30`, km: String(v.km - 400 + n * 40), litros: String(38.5 + n * 12), valor: String(240 + n * 85) }, storage as Storage, agora);
    trocarId(storage, "gemape-demo-abastecimentos", ab.id, `${PREFIXO}abastecimento-${n + 1}`);
  });

  semearViagens(storage, agora);

  const controle: Controle = { versao: VERSAO_DADOS_TESTE, estado: "aplicado", aplicadoEm: agora.toISOString(), gerais };
  storage.setItem(CHAVE_CONTROLE, JSON.stringify(controle));
  void hoje;
  return controle;
}

function trocarId(storage: Armazenamento, chave: string, antigo: string, novo: string): void {
  const lista = lerJson(storage, chave);
  if (!Array.isArray(lista)) return;
  for (const l of lista) if (ehLinha(l) && l["id"] === antigo) l["id"] = novo;
  storage.setItem(chave, JSON.stringify(lista));
}

// ---------- ponto de entrada, ao abrir o sistema ----------
export function prepararDadosDeTeste(storage: Armazenamento, base: Dados, agora = new Date()): "aplicado" | "limpo" | "igual" | "erro" {
  try {
    const controle = lerControle(storage);
    // Restaurar dados de teste repõe também as permissões originais dos usuários de teste.
    if (controle?.estado === "restaurar") restaurarPermissoes(storage, false);
    if (controle?.estado === "limpar") {
      removerDadosDeTeste(storage, base);
      storage.setItem(CHAVE_CONTROLE, JSON.stringify({ versao: VERSAO_DADOS_TESTE, estado: "limpo", aplicadoEm: agora.toISOString(), gerais: {} } satisfies Controle));
      return "limpo";
    }
    if (controle?.estado === "limpo") return "igual";
    if (controle?.estado === "aplicado" && controle.versao === VERSAO_DADOS_TESTE) return "igual";
    removerDadosDeTeste(storage, base);
    aplicarDadosDeTeste(storage, base, agora);
    return "aplicado";
  } catch (erro) {
    console.warn("Dados de teste não aplicados:", erro);
    return "erro";
  }
}

// Marca o pedido do menu e deixa a próxima abertura do sistema fazer o serviço (o cliente de demonstração só lê os dados ao abrir).
export function pedirRestaurar(storage: Armazenamento): void {
  const atual = lerControle(storage);
  storage.setItem(CHAVE_CONTROLE, JSON.stringify({ versao: 0, estado: "restaurar", aplicadoEm: atual?.aplicadoEm ?? "", gerais: atual?.gerais ?? {} } satisfies Controle));
}
export function pedirLimpar(storage: Armazenamento): void {
  const atual = lerControle(storage);
  storage.setItem(CHAVE_CONTROLE, JSON.stringify({ versao: atual?.versao ?? VERSAO_DADOS_TESTE, estado: "limpar", aplicadoEm: atual?.aplicadoEm ?? "", gerais: atual?.gerais ?? {} } satisfies Controle));
}
