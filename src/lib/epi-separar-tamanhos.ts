// Separa o EPI antigo com vários tamanhos em um cadastro por tamanho (decisão 39, PR 5B).
// Só modo demonstração. Cria no catálogo (decisão 35) um EPI por tamanho, leva o saldo e o mínimo
// de cada empresa para o estoque novo e deixa o registro antigo como histórico: movimentações,
// fichas e termos continuam apontando para ele, e nada do passado é reescrito.
import { normalizarDescricao, sincronizarEstoqueEpis } from "./epi-catalogo.ts";
import { CATEGORIA_DO_MODULO, saldosPorTamanho } from "./estoque-tamanho.ts";
import { proximoCodigo, type ParametrosBase } from "./parametros-base.ts";

type Linha = Record<string, unknown>;
type Dados = { empresas?: Linha[]; epis_catalogo?: Linha[]; epis?: Linha[]; enderecamentos?: Linha[] };
type Regra = { sigla: string; inicial: string };

const SEM_TAMANHO = "sem-tamanho";

export type OpcoesSeparacao = {
  regra: Regra | null;
  // Ids dos tamanhos na sequência de Cadastros > Gerais.
  ordemTamanhos: string[];
  // Saldo por tamanho do registro antigo (mesma regra do restante do sistema).
  saldosDe: (linha: Linha) => Record<string, number>;
  codigosFabrica?: { empresa_id: string; codigo_produto: string }[];
};

export type GrupoSeparacao = {
  chave: string;
  nome: string;
  tamanhos: { tamanhoId: string; codigo: string; jaExiste: boolean }[];
  antigos: { id: string; codigo_sku: string; empresa_id: string }[];
  enderecosACopiar: number;
  associacoesNfe: number;
};

export type PlanoSeparacao = { grupos: GrupoSeparacao[]; semRegra: boolean };

const numero = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const texto = (v: unknown) => String(v ?? "");

function tamanhosDoRegistro(linha: Linha, saldosDe: OpcoesSeparacao["saldosDe"]): string[] {
  const minimos = linha["minimos_tamanho"] && typeof linha["minimos_tamanho"] === "object"
    ? Object.keys(linha["minimos_tamanho"] as Linha)
    : [];
  return [...new Set([...Object.keys(saldosDe(linha)), ...minimos])].filter((t) => t !== SEM_TAMANHO);
}

export function planejarSeparacao(dados: Dados, opcoes: OpcoesSeparacao): PlanoSeparacao {
  const catalogo = dados.epis_catalogo ?? [];
  const epis = dados.epis ?? [];
  const grupos = new Map<string, { linhas: Linha[]; tamanhos: Set<string> }>();
  for (const e of epis) {
    if (e["catalogo_id"] || e["separado_em"]) continue;
    const chave = `${normalizarDescricao(texto(e["nome"]))}|${texto(e["subcategoria_id"])}`;
    const g = grupos.get(chave) ?? { linhas: [], tamanhos: new Set<string>() };
    g.linhas.push(e);
    for (const t of tamanhosDoRegistro(e, opcoes.saldosDe)) g.tamanhos.add(t);
    grupos.set(chave, g);
  }
  const usados = [...catalogo, ...epis].map((c) => texto(c["codigo_sku"]));
  const posicao = (t: string) => {
    const i = opcoes.ordemTamanhos.indexOf(t);
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
  };
  const saida: GrupoSeparacao[] = [];
  const lista = [...grupos.entries()]
    .filter(([, g]) => g.tamanhos.size >= 2)
    .sort((a, b) => texto(a[1].linhas[0]?.["nome"]).localeCompare(texto(b[1].linhas[0]?.["nome"]), "pt-BR"));
  for (const [chave, g] of lista) {
    const primeira = g.linhas[0]!;
    const norma = normalizarDescricao(texto(primeira["nome"]));
    const tamanhos = [...g.tamanhos].sort((a, b) => posicao(a) - posicao(b)).map((tamanhoId) => {
      const existente = catalogo.find(
        (c) => normalizarDescricao(texto(c["nome"])) === norma && (c["tamanho_id"] ?? null) === tamanhoId,
      );
      if (existente) return { tamanhoId, codigo: texto(existente["codigo_sku"]), jaExiste: true };
      const codigo = opcoes.regra ? proximoCodigo(opcoes.regra, usados) : "";
      usados.push(codigo);
      return { tamanhoId, codigo, jaExiste: false };
    });
    const codigosAntigos = new Set(g.linhas.map((l) => texto(l["codigo_sku"])));
    let copias = 0;
    for (const l of g.linhas) {
      for (const end of dados.enderecamentos ?? []) {
        if (end["codigo_produto"] !== l["codigo_sku"] || end["empresa_id"] !== l["empresa_id"]) continue;
        for (const t of tamanhos) {
          if (!enderecoExiste(dados.enderecamentos ?? [], end, t.codigo)) copias++;
        }
      }
    }
    saida.push({
      chave,
      nome: texto(primeira["nome"]).trim().replace(/\s+/g, " "),
      tamanhos,
      antigos: g.linhas.map((l) => ({ id: texto(l["id"]), codigo_sku: texto(l["codigo_sku"]), empresa_id: texto(l["empresa_id"]) })),
      enderecosACopiar: copias,
      associacoesNfe: (opcoes.codigosFabrica ?? []).filter((c) => codigosAntigos.has(c.codigo_produto)).length,
    });
  }
  return { grupos: saida, semRegra: !opcoes.regra && saida.length > 0 };
}

const enderecoExiste = (lista: Linha[], modelo: Linha, codigo: string) =>
  lista.some(
    (e) =>
      e["empresa_id"] === modelo["empresa_id"] &&
      e["codigo_produto"] === codigo &&
      e["rua"] === modelo["rua"] &&
      e["prateleira"] === modelo["prateleira"] &&
      e["apartamento"] === modelo["apartamento"],
  );

/**
 * Aplica a separação em `dados`, tudo ou nada: se algo falhar, `dados` fica como estava.
 * Devolve quantos EPIs antigos (descrições) foram separados e quantos EPIs novos nasceram.
 */
export function aplicarSeparacao(
  dados: Dados,
  opcoes: OpcoesSeparacao,
  novoId: () => string,
  agora: string,
): { erro?: string; separados: number; criados: number } {
  const plano = planejarSeparacao(dados, opcoes);
  if (plano.grupos.length === 0) return { separados: 0, criados: 0 };
  if (!opcoes.regra) {
    return { erro: "Cadastre antes a regra do código de EPI em Cadastros > Gerais > Código do Produto.", separados: 0, criados: 0 };
  }
  const copia = {
    empresas: dados.empresas ?? [],
    epis_catalogo: structuredClone(dados.epis_catalogo ?? []),
    epis: structuredClone(dados.epis ?? []),
    enderecamentos: structuredClone(dados.enderecamentos ?? []),
  };
  const antigosPorId = new Map(copia.epis.map((e) => [texto(e["id"]), e]));
  let criados = 0;

  for (const g of plano.grupos) {
    const linhasAntigas = g.antigos.map((a) => antigosPorId.get(a.id)!);
    const modelo = linhasAntigas[0]!;
    const idsCatalogo = new Map<string, string>();
    for (const t of g.tamanhos) {
      if (t.jaExiste) {
        const existente = copia.epis_catalogo.find((c) => c["codigo_sku"] === t.codigo)!;
        idsCatalogo.set(t.tamanhoId, texto(existente["id"]));
        continue;
      }
      const minimo = Math.max(
        0,
        ...linhasAntigas.map((l) => numero((l["minimos_tamanho"] as Linha | undefined)?.[t.tamanhoId])),
      );
      const id = novoId();
      copia.epis_catalogo.push({
        id, codigo_sku: t.codigo, nome: g.nome, categoria: modelo["categoria"] ?? null,
        subcategoria_id: modelo["subcategoria_id"] ?? null, unidade_id: modelo["unidade_id"] ?? null,
        unidade_medida: modelo["unidade_medida"] ?? null, tamanho_id: t.tamanhoId,
        estoque_minimo: minimo, status: "Ativo", created_at: agora,
      });
      idsCatalogo.set(t.tamanhoId, id);
      criados++;
    }
  }

  // Cria o estoque de cada empresa para os EPIs novos (saldo zero) e depois leva o saldo antigo.
  sincronizarEstoqueEpis(copia, novoId, agora);
  const estoque = (catalogoId: string, empresaId: unknown) =>
    copia.epis.find((e) => e["catalogo_id"] === catalogoId && e["empresa_id"] === empresaId);

  for (const g of plano.grupos) {
    const ids = new Map<string, string>(
      g.tamanhos.map((t) => [t.tamanhoId, texto(copia.epis_catalogo.find((c) => c["codigo_sku"] === t.codigo)?.["id"])]),
    );
    for (const a of g.antigos) {
      const antigo = antigosPorId.get(a.id)!;
      const saldos = opcoes.saldosDe(antigo);
      const minimos = (antigo["minimos_tamanho"] as Record<string, unknown> | undefined) ?? {};
      for (const [tamanhoId, catalogoId] of ids) {
        const destino = estoque(catalogoId, antigo["empresa_id"]);
        if (!destino) continue;
        const saldo = numero(saldos[tamanhoId]);
        const novo = g.tamanhos.find((t) => t.tamanhoId === tamanhoId)!;
        const atual = destino["saldos_tamanho"] && typeof destino["saldos_tamanho"] === "object"
          ? numero((destino["saldos_tamanho"] as Linha)[tamanhoId])
          : numero(destino["estoque_atual"]);
        if (saldo > 0 || (novo.jaExiste && destino["saldos_tamanho"])) {
          destino["saldos_tamanho"] = { ...(destino["saldos_tamanho"] as Linha | undefined), [tamanhoId]: atual + saldo };
          destino["estoque_atual"] = numero(destino["estoque_atual"]) + saldo;
        } else if (!destino["saldos_tamanho"]) {
          destino["saldos_tamanho"] = { [tamanhoId]: atual };
        }
        if (!novo.jaExiste && tamanhoId in minimos) {
          destino["minimos_tamanho"] = { [tamanhoId]: numero(minimos[tamanhoId]) };
          destino["estoque_minimo"] = numero(minimos[tamanhoId]);
        }
      }
      // O antigo fica como histórico: o saldo por tamanho vai a zero e só sobra o "Sem tamanho".
      const zerado = Object.fromEntries(Object.keys(saldos).map((t) => [t, t === SEM_TAMANHO ? numero(saldos[t]) : 0]));
      antigo["saldos_tamanho"] = zerado;
      const resto = numero(zerado[SEM_TAMANHO]);
      antigo["estoque_atual"] = resto;
      if (resto === 0) antigo["status"] = "Inativo";
      antigo["separado_em"] = agora;
      antigo["separado_para"] = [...ids.values()];
    }
    // Endereço do código antigo vale também para os novos, na mesma empresa.
    for (const a of g.antigos) {
      for (const end of copia.enderecamentos.filter((e) => e["codigo_produto"] === a.codigo_sku && e["empresa_id"] === a.empresa_id)) {
        for (const t of g.tamanhos) {
          if (enderecoExiste(copia.enderecamentos, end, t.codigo)) continue;
          copia.enderecamentos.push({ ...end, id: novoId(), codigo_produto: t.codigo, created_at: agora, updated_at: agora });
        }
      }
    }
  }

  dados.epis_catalogo = copia.epis_catalogo;
  dados.epis = copia.epis;
  dados.enderecamentos = copia.enderecamentos;
  return { separados: plano.grupos.length, criados };
}

/** Opções da separação a partir de Cadastros > Gerais: regra do código, sequência e saldo por tamanho. */
export function opcoesDaSeparacao(p: ParametrosBase): OpcoesSeparacao {
  return {
    regra: p.regrasCodigo.find((r) => r.categoriaId === CATEGORIA_DO_MODULO.epi) ?? null,
    ordemTamanhos: p.tamanhos.map((t) => t.id),
    saldosDe: (linha) => saldosPorTamanho(p, "epi", linha),
    codigosFabrica: p.codigosFabrica.filter((c) => c.tabela === "epis"),
  };
}
