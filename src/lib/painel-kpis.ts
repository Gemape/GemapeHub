// KPIs que o Dashboard consolidado mostra ao clicar em cada card (Itens cadastrados, Valor em estoque, Veículos e Empregados ativos): números prontos para o gestor decidir.
// Só conta; quem desenha e formata é a tela.
import { valorTotalEmEstoque } from "./gemape.ts";

export type ItemDoPainel = { id: string; empresa_id: string | null; nome: string; modulo: string; estoque_atual?: number | null; estoque_minimo?: number | null; preco_unitario?: number | null };
export type EmpresaDoPainel = { id: string; nome: string };

const unidadesDe = (itens: ItemDoPainel[]) => itens.reduce((s, i) => s + (i.estoque_atual ?? 0), 0);
const pct = (parte: number, total: number): number | null => (total === 0 ? null : Math.round((parte / total) * 1000) / 10);
const valorDe = (i: ItemDoPainel) => valorTotalEmEstoque([i]);
const modulosDe = (itens: ItemDoPainel[]) => [...new Set(itens.map((i) => i.modulo))];

// Itens cadastrados: tamanho do cadastro, o que está sem saldo, o que está no mínimo ou abaixo (`criticos` vem da mesma regra do quadro de alertas) e onde está cada parte.
export function kpisDeItens(itens: ItemDoPainel[], criticos: ReadonlySet<string>, empresas: EmpresaDoPainel[]) {
  const abaixoMinimo = itens.filter((i) => criticos.has(i.id)).length;
  return {
    total: itens.length,
    unidades: unidadesDe(itens),
    semEstoque: itens.filter((i) => (i.estoque_atual ?? 0) <= 0).length,
    abaixoMinimo,
    pctAbaixoMinimo: pct(abaixoMinimo, itens.length),
    porModulo: modulosDe(itens).map((modulo) => {
      const doModulo = itens.filter((i) => i.modulo === modulo);
      return { modulo, itens: doModulo.length, unidades: unidadesDe(doModulo), abaixoMinimo: doModulo.filter((i) => criticos.has(i.id)).length };
    }),
    porEmpresa: empresas.map((e) => {
      const daEmpresa = itens.filter((i) => i.empresa_id === e.id);
      return { id: e.id, nome: e.nome, itens: daEmpresa.length, abaixoMinimo: daEmpresa.filter((i) => criticos.has(i.id)).length };
    }),
  };
}

// Valor em estoque: quanto está parado por categoria e por empresa, os cinco itens que mais pesam e quanto do total eles concentram.
export function kpisDeValor(itens: ItemDoPainel[], empresas: EmpresaDoPainel[]) {
  const total = valorTotalEmEstoque(itens);
  const unidades = unidadesDe(itens);
  const maiores = itens.map((i) => ({ id: i.id, nome: i.nome, modulo: i.modulo, valor: valorDe(i) })).filter((i) => i.valor > 0).sort((a, b) => b.valor - a.valor).slice(0, 5);
  return {
    total,
    valorMedioPorUnidade: unidades === 0 ? 0 : Math.round((total / unidades) * 100) / 100,
    porModulo: modulosDe(itens).map((modulo) => {
      const valor = valorTotalEmEstoque(itens.filter((i) => i.modulo === modulo));
      return { modulo, valor, pct: pct(valor, total) };
    }),
    porEmpresa: empresas.map((e) => {
      const valor = valorTotalEmEstoque(itens.filter((i) => i.empresa_id === e.id));
      return { id: e.id, nome: e.nome, valor, pct: pct(valor, total) };
    }),
    maiores: maiores.map((i) => ({ ...i, pct: pct(i.valor, total) })),
    pctDosCincoMaiores: pct(maiores.reduce((s, i) => s + i.valor, 0), total),
  };
}

// Veículos: quantos estão rodando, em que situação está o resto e quantas ocorrências ainda pedem ação (abertas ou em tratativa).
export function kpisDeVeiculos(
  veiculos: { id: string; empresa_id: string | null; status: string }[],
  ocorrencias: { veiculoId: string; status: string }[],
  empresas: EmpresaDoPainel[],
) {
  const ids = new Set(veiculos.map((v) => v.id));
  const pendentes = ocorrencias.filter((o) => ids.has(o.veiculoId) && (o.status === "Aberta" || o.status === "Em tratativa"));
  const ativos = veiculos.filter((v) => v.status === "Ativo").length;
  return {
    total: veiculos.length,
    ativos,
    pctAtivos: pct(ativos, veiculos.length),
    porStatus: [...new Set(veiculos.map((v) => v.status))].map((status) => ({ status, total: veiculos.filter((v) => v.status === status).length })).sort((a, b) => b.total - a.total),
    porEmpresa: empresas.map((e) => {
      const daEmpresa = veiculos.filter((v) => v.empresa_id === e.id);
      return { id: e.id, nome: e.nome, total: daEmpresa.length, ativos: daEmpresa.filter((v) => v.status === "Ativo").length };
    }),
    ocorrenciasAbertas: pendentes.filter((o) => o.status === "Aberta").length,
    ocorrenciasEmTratativa: pendentes.filter((o) => o.status === "Em tratativa").length,
  };
}

// Empregados ativos: onde estão e quanto de EPI e uniforme em estoque há para cada um (cobertura do que o grupo guarda para vestir a equipe).
export function kpisDeEmpregados(empregados: { empresa_id: string | null }[], itens: ItemDoPainel[], empresas: EmpresaDoPainel[]) {
  const vestuario = itens.filter((i) => i.modulo === "epi" || i.modulo === "uniforme");
  const porEmpregado = (qtd: number, n: number) => (n === 0 ? null : Math.round((qtd / n) * 10) / 10);
  return {
    ativos: empregados.length,
    unidadesDeVestuarioPorEmpregado: porEmpregado(unidadesDe(vestuario), empregados.length),
    porEmpresa: empresas.map((e) => {
      const n = empregados.filter((x) => x.empresa_id === e.id).length;
      const doGrupo = vestuario.filter((i) => i.empresa_id === e.id);
      return { id: e.id, nome: e.nome, ativos: n, pct: pct(n, empregados.length), unidadesPorEmpregado: porEmpregado(unidadesDe(doGrupo), n) };
    }),
  };
}
