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
import { codigoCaixa, numeroDaCaixa } from "../caixas-habilitadas.ts";
import { salvarCliente } from "../clientes-demo.ts";
import { salvarEquipamento } from "../equipamentos-demo.ts";
import { salvarFornecedor } from "../fornecedores-demo.ts";
import { registrarAbastecimento } from "../registros-veiculo.ts";
import * as Gerais from "../parametros-base.ts";
import { restaurarPermissoes } from "../permissoes-demo.ts";
import { semearModuloEquipamentos } from "./equipamentos-modulo.ts";
import { semearModuloVeiculos } from "./veiculos-modulo.ts";
import { removerGruposDeChecklistSemUso } from "./enxugar-checklists.ts";
import { removerOrdensEFichasDeTeste, semearOrdensEFichasEpi } from "./ordens-fichas-epi.ts";
import { semearViagens } from "./viagens.ts";
import {
  ACOES_MANUTENCAO_VEICULO, CAIXAS_TESTE, CLIENTES, EMPREGADOS, EMPRESAS, EPIS, EQUIPAMENTOS, EQUIPAMENTOS_CATALOGO, FERRAMENTAS, FORNECEDORES, MARCAS_FERRAMENTA, MARCAS_UNIFORME, PREFIXO,
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

// A empresa GEMAPE de demonstração (a que o sistema trazia antes das empresas do grupo) e tudo o que é dela saem de quem ainda a tem no navegador:
// os cadastros dela, o que foi registrado nesses itens e as caixas, ferramentas e compras ligadas a eles.
const EMPRESA_ANTIGA = "empresa-demo";
const CADASTROS_ANTIGOS = new Set(["emp-demo", "epi-demo", "uni-demo", "fer-demo", "vei-demo"]);
export function removerEmpresaAntigaDeDemonstracao(dados: Dados): void {
  const itens = new Set<string>(CADASTROS_ANTIGOS);
  for (const l of Object.values(dados).flat()) if (l["empresa_id"] === EMPRESA_ANTIGA && ("codigo_sku" in l || "placa" in l)) itens.add(String(l["id"]));
  const caixas = new Set((dados["caixas_ferramentas"] ?? []).filter((c) => c["empresa_id"] === EMPRESA_ANTIGA).map((c) => String(c["id"])));
  for (const tabela of Object.keys(dados)) {
    dados[tabela] = (dados[tabela] ?? []).filter((l) => {
      if (tabela === "empresas") return l["id"] !== EMPRESA_ANTIGA;
      if (tabela === "perfis") return true;
      if (l["empresa_id"] === EMPRESA_ANTIGA || itens.has(String(l["id"]))) return false;
      if (typeof l["item_id"] === "string" && itens.has(l["item_id"])) return false;
      if (typeof l["empregado_id"] === "string" && itens.has(l["empregado_id"])) return false;
      if (typeof l["caixa_id"] === "string" && caixas.has(l["caixa_id"])) return false;
      return true;
    });
  }
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
    const caixasDeTeste = new Set((dados["caixas_ferramentas"] ?? []).filter(teste).map((l) => String(l["id"])));
    for (const tabela of Object.keys(dados)) {
      dados[tabela] = (dados[tabela] ?? []).filter((l) => {
        if (teste(l)) return false;
        // O que o usuário registrou em cima de dados de teste vai junto: sem o item ou a empresa, a linha ficaria solta.
        if (typeof l["item_id"] === "string" && itensDeTeste.has(l["item_id"])) return false;
        if (typeof l["catalogo_id"] === "string" && catalogosDeTeste.has(l["catalogo_id"])) return false;
        if (typeof l["caixa_id"] === "string" && caixasDeTeste.has(l["caixa_id"])) return false;
        if (tabela === "caixa_ferramenta_itens" && typeof l["ferramenta_id"] === "string" && itensDeTeste.has(l["ferramenta_id"])) return false;
        if (tabela !== "empresas" && typeof l["empresa_id"] === "string" && empresasDeTeste.has(l["empresa_id"])) return false;
        return true;
      });
    }
    storage.setItem(CHAVE_DADOS, JSON.stringify(dados));
  }
  removerOrdensEFichasDeTeste(storage);
  for (const chave of CHAVES_LISTAS) {
    const lido = lerJson(storage, chave);
    if (Array.isArray(lido)) storage.setItem(chave, JSON.stringify(lido.filter((l) => !(ehLinha(l) && teste(l)))));
  }
  // Veículos e equipamentos de teste levam junto os abastecimentos feitos neles.
  // (O abastecimento guarda `veiculoId`; já saiu acima quando o id tinha o prefixo, e este passo cobre os registros do usuário.)
  const abastecimentos = lerJson(storage, "gemape-demo-abastecimentos");
  if (Array.isArray(abastecimentos)) storage.setItem("gemape-demo-abastecimentos", JSON.stringify(abastecimentos.filter((a) => !(ehLinha(a) && typeof a["veiculoId"] === "string" && (a["veiculoId"] as string).startsWith(PREFIXO)))));
  // Registros do módulo Veículos (manutenções, ocorrências, check lists, planos e associações) dos veículos de teste: saem junto com eles.
  // A numeração dos check lists de veículo recomeça com os de teste removidos.
  if (!lerJson(storage, "gemape-demo-checklists-veiculo") || (lerJson(storage, "gemape-demo-checklists-veiculo") as unknown[]).every((c) => ehLinha(c) && typeof c["veiculoId"] === "string" && (c["veiculoId"] as string).startsWith(PREFIXO))) storage.removeItem?.("gemape-demo-checklists-veiculo-sequencia");
  // O mesmo para os de equipamento.
  { const lido = lerJson(storage, "gemape-demo-eq-checklists-exec") as unknown[] | null; if (!Array.isArray(lido) || lido.every((c) => ehLinha(c) && typeof c["equipamentoId"] === "string" && (c["equipamentoId"] as string).startsWith(PREFIXO))) storage.removeItem?.("gemape-demo-eq-checklists-sequencia"); }
  for (const chave of ["gemape-demo-manutencoes-veiculo", "gemape-demo-ocorrencias-veiculo", "gemape-demo-checklists-veiculo", "gemape-demo-planos-manutencao", "gemape-demo-associacoes-checklist-veiculo"]) {
    const lido = lerJson(storage, chave);
    if (Array.isArray(lido)) storage.setItem(chave, JSON.stringify(lido.filter((r) => !(ehLinha(r) && typeof r["veiculoId"] === "string" && (r["veiculoId"] as string).startsWith(PREFIXO)))));
  }
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
  // O que já existe em Gerais (de quem cadastrou igual, ou de uma aplicação que parou no meio) fica como está e não é anotado: o Limpar só tira o que o conjunto criou.
  const criar = (lista: string, novo: () => { id: string }) => { try { anotar(lista, novo().id); } catch (erro) { if (!/Já existe/.test(String(erro))) throw erro; } };
  for (const nome of MARCAS_FERRAMENTA) criar("marcasFerramenta", () => Gerais.adicionarListaFerramenta("marcasFerramenta", nome, storage));
  for (const nome of MARCAS_UNIFORME) criar("marcasUniforme", () => Gerais.adicionarListaFerramenta("marcasUniforme", nome, storage));
  for (const t of TIPOS_OCORRENCIA_VEICULO) criar("tiposOcorrenciaVeiculo", () => Gerais.adicionarTipoOcorrenciaVeiculo(t.nome, t.descricao, storage));
  for (const a of ACOES_MANUTENCAO_VEICULO) criar("acoesManutencaoVeiculo", () => Gerais.adicionarAcaoManutencaoVeiculo(a.nome, [...a.subitens], storage));
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
  removerEmpresaAntigaDeDemonstracao(dados);
  // Cada ferramenta fica em uma caixa só: se alguma está em duas (registro antigo), vale a primeira.
  const ferramentasEmCaixa = new Set<string>();
  dados["caixa_ferramenta_itens"] = (dados["caixa_ferramenta_itens"] ?? []).filter((i) => {
    const ferramentaId = String(i["ferramenta_id"]);
    if (ferramentasEmCaixa.has(ferramentaId)) return false;
    ferramentasEmCaixa.add(ferramentaId);
    return true;
  });
  for (const [chave, campo, valor] of [["gemape-demo-portadores-caixa", "empresa_id", EMPRESA_ANTIGA], ["gemape-demo-abastecimentos", "veiculoId", "vei-demo"]] as const) {
    const lido = lerJson(storage, chave);
    if (Array.isArray(lido)) storage.setItem(chave, JSON.stringify(lido.filter((l) => !(ehLinha(l) && l[campo] === valor))));
  }
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
          // CA de teste da compra de EPI (a compra de produto novo exige o CA, decisão 327): um por item do catálogo.
          ...(tabelaCompra === "compras_epis" ? { ca: String(31000 + n * 211) } : {}),
        });
        mov({ modulo, tipo_movimentacao: "Entrada", quantidade, data_movimentacao: dia(agora, diasAtras + e * 2), item_id: estoque["id"], empresa_id: empresaId, tamanho_id: item.tamanhos[indice] ?? null, observacao: `Compra: NF ${String(1200 + n * 3 + e).padStart(5, "0")} / ${fornecedor.nome_fantasia}` });
      });
    });
  };
  // Quantidades por empresa (linhas) e por item do catálogo (colunas), variadas de propósito para o alerta de estoque mínimo.
  comprar("compras_epis", "epi", "epis", catalogoEpis, [[12, 9, 8, 8, 10, 6, 14], [6, 7, 6, 10, 7, 12, 12], [9, 12, 10, 6, 6, 9, 9]], 60);
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
  // Os outros quatro empregados de cada empresa (o primeiro já tem as entregas acima): botina, luvas e capacete entregues em dias diferentes, e alguns com
  // devolução ou baixa, para o histórico de movimentações de cada um ter o que mostrar. O empregado de ordem c + 3k é da empresa c.
  const BOTINA_DO_EMPREGADO = [null, 1, 2, 0, 1] as const; // índice do tamanho no catálogo (38, 40, 42)
  const LUVA_DO_EMPREGADO = [null, 1, 2, 0, 1] as const; // P, M, G
  const TAMANHO_BOTINA = ["tam-38", "tam-40", "tam-42"] as const;
  const TAMANHO_LUVA = ["tam-p", "tam-m", "tam-g"] as const;
  for (let empresa = 0; empresa < 3; empresa++) {
    for (let k = 1; k <= 4; k++) {
      const quem: Linha = { empregado_id: EMPREGADOS[empresa + 3 * k]!.id };
      const diaBase = 27 - k * 4 - empresa;
      const botina = BOTINA_DO_EMPREGADO[k]!;
      const luva = LUVA_DO_EMPREGADO[k]!;
      entrega("epi", "epis", epiDe("Botina", botina).id, empresa, 1, diaBase, TAMANHO_BOTINA[botina], quem);
      entrega("epi", "epis", epiDe("Luva", luva).id, empresa, 2, diaBase - 1, TAMANHO_LUVA[luva], quem);
      entrega("epi", "epis", epiDe("Capacete", 0).id, empresa, 1, diaBase - 2, null, quem);
      if (k === 1) entrega("epi", "epis", epiDe("Luva", luva).id, empresa, 1, diaBase - 6, TAMANHO_LUVA[luva], { ...quem, responsavel_nome: `Almoxarifado ${EMPRESAS[empresa]!.nome_fantasia}`, observacao: "Luva devolvida sem uso" }, "Devolucao");
      if (k === 2) entrega("epi", "epis", epiDe("Capacete", 0).id, empresa, 1, diaBase - 5, null, { ...quem, motivo_baixa: "Perda", observacao: "Perdido em obra" });
      if (k === 3) entrega("epi", "epis", epiDe("Botina", botina).id, empresa, 1, diaBase - 4, TAMANHO_BOTINA[botina], { ...quem, motivo_baixa: "Quebra", observacao: "Biqueira solta" });
      if (k === 4) entrega("epi", "epis", epiDe("Capacete", 0).id, empresa, 1, diaBase - 6, null, { ...quem, responsavel_nome: `Almoxarifado ${EMPRESAS[empresa]!.nome_fantasia}`, observacao: "Devolução por troca de função" }, "Devolucao");
      // Mais devoluções, para o estoque de usados ter o que mostrar, em tamanhos e motivos variados: cada empregado devolve o que tem em posse.
      const almox = `Almoxarifado ${EMPRESAS[empresa]!.nome_fantasia}`;
      if (k === 1) entrega("epi", "epis", epiDe("Botina", botina).id, empresa, 1, diaBase - 8, TAMANHO_BOTINA[botina], { ...quem, responsavel_nome: almox, observacao: "Botina devolvida: tamanho trocado" }, "Devolucao");
      if (k === 2) entrega("epi", "epis", epiDe("Botina", botina).id, empresa, 1, diaBase - 7, TAMANHO_BOTINA[botina], { ...quem, responsavel_nome: almox, observacao: "Botina devolvida: desgaste" }, "Devolucao");
      if (k === 3) entrega("epi", "epis", epiDe("Luva", luva).id, empresa, 1, diaBase - 5, TAMANHO_LUVA[luva], { ...quem, responsavel_nome: almox, observacao: "Luva devolvida: fim do uso" }, "Devolucao");
      if (k === 4) entrega("epi", "epis", epiDe("Luva", luva).id, empresa, 1, diaBase - 7, TAMANHO_LUVA[luva], { ...quem, responsavel_nome: almox, observacao: "Luva devolvida: mudança de função" }, "Devolucao");
    }
  }
  // Toda devolução de EPI entra no estoque como produto usado (decisão 327): leva a compra mais antiga do EPI no tamanho (data, nota fiscal, fornecedor e CA) e o motivo da devolução.
  const MOTIVOS_DEVOLUCAO_TESTE = ["Fim do uso", "Troca de tamanho", "Troca por desgaste", "Mudança de função", "Fim do uso"];
  movimentosDe.filter((m) => m["modulo"] === "epi" && m["tipo_movimentacao"] === "Devolucao").forEach((m, n) => {
    const doItem = compras.compras_epis.filter((c) => c["item_id"] === m["item_id"]).sort((a, b) => String(a["data_compra"]).localeCompare(String(b["data_compra"])));
    const origem = doItem[0];
    Object.assign(m, {
      condicao: "usado", motivo_devolucao: MOTIVOS_DEVOLUCAO_TESTE[n % MOTIVOS_DEVOLUCAO_TESTE.length],
      ...(origem ? { compra_origem_id: origem["id"], data_compra_origem: origem["data_compra"], nota_fiscal_origem: origem["nota_fiscal"], fornecedor_origem: origem["fornecedor"], fornecedor_id_origem: origem["fornecedor_id"], ca_origem: origem["ca"] ?? null } : {}),
    });
  });
  // Consumo de um ano de alguns EPIs, para a Sugestão de Compras mostrar Ruptura, Comprar já e Planejar (decisão 330): uma compra anterior e as entregas dela, em seis parcelas de 40 a 215
  // dias atrás, deixam o estoque como está e dão ao EPI a média de consumo que leva ao tempo de cobertura pedido (com o prazo de reposição padrão de 30 dias).
  const consumoDoAno = (nome: string, indice: number, empresaIndice: number, tamanho: string | null, coberturaDias: number) => {
    const estoque = estoqueDe("epis", epiDe(nome, indice).id, empresaIds[empresaIndice]!);
    const saldo = movimentosDe.filter((m) => m["item_id"] === estoque["id"]).reduce((t, m) => t + (m["tipo_movimentacao"] === "Saida" ? -Number(m["quantidade"]) : Number(m["quantidade"])), 0);
    // O consumo do ano já tem as entregas e devoluções acima: a nova compra completa o que falta para a média pedida.
    const jaConsumido = movimentosDe.filter((m) => m["item_id"] === estoque["id"]).reduce((t, m) => t + (m["tipo_movimentacao"] === "Saida" ? Number(m["quantidade"]) : m["tipo_movimentacao"] === "Devolucao" ? -Number(m["quantidade"]) : 0), 0);
    const total = Math.max(6, Math.ceil((360 * saldo) / coberturaDias) - jaConsumido);
    mov({ modulo: "epi", tipo_movimentacao: "Entrada", quantidade: total, data_movimentacao: dia(agora, 366), item_id: estoque["id"], empresa_id: empresaIds[empresaIndice], tamanho_id: tamanho, observacao: "Compra anterior: reposição do ano" });
    const parcela = Math.floor(total / 6);
    [40, 75, 110, 145, 180, 215].forEach((dias, k) => entrega("epi", "epis", epiDe(nome, indice).id, empresaIndice, k === 0 ? total - parcela * 5 : parcela, dias, tamanho));
  };
  consumoDoAno("Botina", 0, 0, "tam-38", 15); // Ruptura
  consumoDoAno("Luva", 2, 1, "tam-g", 25); // Ruptura
  consumoDoAno("Luva", 1, 0, "tam-m", 38); // Comprar já
  consumoDoAno("Capacete", 0, 2, null, 40); // Comprar já
  consumoDoAno("Capacete", 0, 0, null, 52); // Planejar
  consumoDoAno("Botina", 2, 1, "tam-42", 55); // Planejar
  // Uniformes.
  entrega("uniforme", "uniformes", uniDe("Camisa", 1).id, 0, 2, 27, "tam-m");
  entrega("uniforme", "uniformes", uniDe("Calça", 1).id, 0, 2, 27, "tam-42");
  entrega("uniforme", "uniformes", uniDe("Jaqueta", 1).id, 0, 1, 20, "tam-g");
  entrega("uniforme", "uniformes", uniDe("Camisa", 0).id, 1, 3, 21, "tam-p");
  entrega("uniforme", "uniformes", uniDe("Calça", 2).id, 1, 2, 21, "tam-44");
  entrega("uniforme", "uniformes", uniDe("Camisa", 2).id, 2, 2, 15, "tam-g");
  entrega("uniforme", "uniformes", uniDe("Camisa", 2).id, 2, 1, 6, "tam-g", { responsavel_nome: "Almoxarifado Lapa" }, "Devolucao");

  // Uniformes dos outros quatro empregados de cada empresa: camisa, calça e jaqueta entregues em dias diferentes, e alguns com devolução ou baixa, para o histórico
  // de cada um ter o que mostrar (o empregado de ordem c + 3k é da empresa c).
  const CAMISA_DO_EMPREGADO = [null, 1, 2, 0, 1] as const; // P, M, G
  const CALCA_DO_EMPREGADO = [null, 2, 0, 1, 2] as const; // 40, 42, 44
  const JAQUETA_DO_EMPREGADO = [null, 0, 1, 0, 1] as const; // M, G
  const TAMANHO_CAMISA = ["tam-p", "tam-m", "tam-g"] as const;
  const TAMANHO_CALCA = ["tam-40", "tam-42", "tam-44"] as const;
  const TAMANHO_JAQUETA = ["tam-m", "tam-g"] as const;
  for (let empresa = 0; empresa < 3; empresa++) {
    for (let k = 1; k <= 4; k++) {
      const quem: Linha = { empregado_id: EMPREGADOS[empresa + 3 * k]!.id };
      const diaBase = 26 - k * 4 - empresa;
      const camisa = CAMISA_DO_EMPREGADO[k]!;
      const calca = CALCA_DO_EMPREGADO[k]!;
      const jaqueta = JAQUETA_DO_EMPREGADO[k]!;
      const almoxarifado = `Almoxarifado ${EMPRESAS[empresa]!.nome_fantasia}`;
      entrega("uniforme", "uniformes", uniDe("Camisa", camisa).id, empresa, 2, diaBase, TAMANHO_CAMISA[camisa], quem);
      entrega("uniforme", "uniformes", uniDe("Calça", calca).id, empresa, 1, diaBase - 1, TAMANHO_CALCA[calca], quem);
      entrega("uniforme", "uniformes", uniDe("Jaqueta", jaqueta).id, empresa, 1, diaBase - 2, TAMANHO_JAQUETA[jaqueta], quem);
      if (k === 1) entrega("uniforme", "uniformes", uniDe("Camisa", camisa).id, empresa, 1, diaBase - 6, TAMANHO_CAMISA[camisa], { ...quem, responsavel_nome: almoxarifado, observacao: "Camisa devolvida: tamanho errado" }, "Devolucao");
      if (k === 2) entrega("uniforme", "uniformes", uniDe("Calça", calca).id, empresa, 1, diaBase - 5, TAMANHO_CALCA[calca], { ...quem, motivo_baixa: "Desgaste Natural", observacao: "Tecido puído nos joelhos" });
      if (k === 3) entrega("uniforme", "uniformes", uniDe("Jaqueta", jaqueta).id, empresa, 1, diaBase - 4, TAMANHO_JAQUETA[jaqueta], { ...quem, motivo_baixa: "Perda", observacao: "Extraviada em obra" });
      if (k === 4) entrega("uniforme", "uniformes", uniDe("Jaqueta", jaqueta).id, empresa, 1, diaBase - 6, TAMANHO_JAQUETA[jaqueta], { ...quem, responsavel_nome: almoxarifado, observacao: "Devolução por troca de função" }, "Devolucao");
    }
  }
  // Toda devolução de uniforme também entra no estoque como usada (decisão 374), com a compra mais antiga do uniforme e o motivo da devolução.
  movimentosDe.filter((m) => m["modulo"] === "uniforme" && m["tipo_movimentacao"] === "Devolucao").forEach((m, n) => {
    const origem = compras.compras_uniformes.filter((c) => c["item_id"] === m["item_id"]).sort((x, y) => String(x["data_compra"]).localeCompare(String(y["data_compra"])))[0];
    Object.assign(m, {
      condicao: "usado", motivo_devolucao: ["Fim do uso", "Troca de tamanho", "Mudança de função", "Troca por desgaste"][n % 4],
      ...(origem ? { compra_origem_id: origem["id"], data_compra_origem: origem["data_compra"], nota_fiscal_origem: origem["nota_fiscal"], fornecedor_origem: origem["fornecedor"], fornecedor_id_origem: origem["fornecedor_id"] } : {}),
    });
  });

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
  // O número da caixa é único entre as empresas: as de teste pegam os primeiros números que as caixas da pessoa não usam.
  const caixasUsuario = tabela("caixas_ferramentas").filter((c) => !teste(c)).map((c) => ({ id: String(c["id"]), codigo: String(c["codigo"] ?? ""), codigo_num: Number(c["codigo_num"]) || null }));
  const numerosDaPessoa = new Set(caixasUsuario.map((c) => numeroDaCaixa(c)));
  const numerosDeTeste: number[] = [];
  for (let numero = 1; numerosDeTeste.length < CAIXAS_TESTE; numero++) if (!numerosDaPessoa.has(numero)) numerosDeTeste.push(numero);
  const habilitadas = [...new Set([...Gerais.lerParametros(storage).caixasHabilitadas, ...numerosDaPessoa, ...numerosDeTeste])].filter((n): n is number => n !== null);
  Gerais.salvarCaixasHabilitadas(habilitadas, caixasUsuario, storage);
  const portadores: Linha[] = [];
  // Cinco caixas com quatro ferramentas cada (a de ordem n vai para a caixa n mod 5, da mesma empresa); cada ferramenta fica em uma caixa só.
  ferramentas.slice(0, CAIXAS_TESTE).forEach(({ f }, n) => {
    const caixaId = `${PREFIXO}caixa-${n + 1}`;
    const numero = numerosDeTeste[n]!;
    tabela("caixas_ferramentas").push({
      id: caixaId, created_at: criadoEm, codigo: codigoCaixa(numero), codigo_num: numero, empresa_id: empresaIds[f.empresaIndice], nome: codigoCaixa(numero),
      descricao: `Caixa de ferramentas da ${EMPRESAS[f.empresaIndice]!.nome_fantasia}`, localizacao: ["Oficina — bancada 1", "Almoxarifado — prateleira B", "Galpão — armário 3", "Oficina — bancada 4", "Expedição — armário 1"][n] ?? "Almoxarifado", status: "Ativa",
    });
    ferramentas.filter((_, k) => k % CAIXAS_TESTE === n).forEach(({ id }, posicao) => {
      tabela("caixa_ferramenta_itens").push({ id: `${PREFIXO}caixa-item-${n + 1}-${posicao + 1}`, caixa_id: caixaId, ferramenta_id: id, quantidade: 1, observacao: "Item de teste da caixa" });
    });
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
    // Código de fábrica que já existe (de uma aplicação interrompida ou cadastrado igual) fica como está e não é anotado.
    let salvo: { id: string };
    try { salvo = Gerais.salvarCodigoFabrica({ tabela: tabelaProduto, empresa_id: empresaId, codigo_produto: codigoProduto, nome_produto: nome, fornecedor_id: f.id, fornecedor_nome: f.nome_fantasia, codigo_fornecedor: codigoFornecedor(f.nome_fantasia.slice(0, 2).toUpperCase(), n), ca } as Gerais.DadosCodigoFabrica, undefined, storage); } catch (erro) { if (/já está associado|Já existe/.test(String(erro))) return; throw erro; }
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
  // Mais equipamentos, até cinco em cada tipo, sem associação nem registros: dão o que escolher ao associar itens de check list.
  EQUIPAMENTOS_CATALOGO.forEach((e, n) => {
    const salvo = salvarEquipamento({ ...e, empresaId: empresaIds[e.empresaIndice]!, tecnico: { ...e.tecnico } }, storage as Storage, agora);
    trocarId(storage, "gemape-demo-equipamentos", salvo.id, `${PREFIXO}equipamento-${EQUIPAMENTOS.length + n + 1}`);
  });

  // Módulo Equipamentos: abastecimentos, manutenções, ocorrências e check lists, pelas mesmas funções das telas.
  semearModuloEquipamentos(storage, agora);

  // Abastecimentos dos veículos (as mesmas conferências do registro em Veículos).
  VEICULOS.forEach((v, n) => {
    const ab = registrarAbastecimento({ veiculoId: v.id, data: dia(agora, 20 - n * 3), hora: `${String(8 + n).padStart(2, "0")}:30`, km: String(v.km - 400 + n * 40), litros: String(38.5 + n * 12), valor: String(240 + n * 85) }, storage as Storage, agora);
    trocarId(storage, "gemape-demo-abastecimentos", ab.id, `${PREFIXO}abastecimento-${n + 1}`);
  });

  // Módulo Veículos: manutenções, planos, ocorrências e check lists dos cinco veículos, pelas mesmas funções das telas.
  semearModuloVeiculos(storage, agora);

  semearViagens(storage, agora);

  // Parâmetros > EPI: cinco ordens de serviço e cinco fichas de EPI, para ver as telas com conteúdo.
  semearOrdensEFichasEpi(storage, tabela("epis"), agora);

  // Só ficam os grupos de check list com uso (associados ou em check lists preenchidos); os do padrão sem uso saem.
  try { removerGruposDeChecklistSemUso(storage); } catch { /* parâmetros ilegíveis: ficam como estão */ }

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
// Cópia das chaves do sistema de demonstração (só onde o armazenamento sabe listar as chaves, como o do navegador), para desfazer uma aplicação que falhou.
function fotografiaDoArmazenamento(storage: Armazenamento): Map<string, string> | null {
  const real = storage as Partial<Storage>;
  if (typeof real.length !== "number" || typeof real.key !== "function") return null;
  const mapa = new Map<string, string>();
  for (let i = 0; i < real.length; i++) {
    const chave = real.key(i);
    if (chave?.startsWith("gemape-")) mapa.set(chave, storage.getItem(chave) ?? "");
  }
  return mapa;
}
function restaurarArmazenamento(storage: Armazenamento, antes: Map<string, string> | null): void {
  const real = storage as Partial<Storage>;
  if (!antes || typeof real.length !== "number" || typeof real.key !== "function") return;
  const agora: string[] = [];
  for (let i = 0; i < real.length; i++) { const chave = real.key(i); if (chave?.startsWith("gemape-")) agora.push(chave); }
  // Cada passo é protegido: se a restauração também falhar (espaço do navegador), o erro que veio da aplicação é o que a pessoa vê.
  for (const chave of agora) if (!antes.has(chave)) { try { storage.removeItem(chave); } catch { /* segue com as outras */ } }
  for (const [chave, valor] of antes) { try { storage.setItem(chave, valor); } catch { /* segue com as outras */ } }
}

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
    // Tudo ou nada: se algo falhar no meio, o armazenamento volta ao que era, em vez de ficar com a metade dos dados (que travaria a próxima tentativa).
    const antes = fotografiaDoArmazenamento(storage);
    try {
      removerDadosDeTeste(storage, base);
      aplicarDadosDeTeste(storage, base, agora);
    } catch (erro) {
      restaurarArmazenamento(storage, antes);
      throw erro;
    }
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
