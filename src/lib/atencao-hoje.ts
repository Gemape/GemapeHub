// "O que precisa da sua atenção hoje": pendências reais, por prioridade, já com o caminho de cada ação. Só lê dados em memória; quem chama busca as listas.
import { resumoEmpregado, type ItemDoResumo } from "./resumo-empregado.ts";
import type { MovimentacaoEpi } from "./entrega-epi.ts";

export type AcaoPendencia = { rotulo: string; url: string; search?: Record<string, string> };
export type ItemPendencia = { chave: string; texto: string; detalhe: string; acao: AcaoPendencia };
export type GrupoPendencia = { id: string; titulo: string; prioridade: "alta" | "media" | "baixa"; vazio: string; itens: ItemPendencia[] };

type EmpregadoBase = { id: string; nome: string; empresa_id?: string | null; ativo?: boolean | null; data_demissao?: string | null };
type ItemEstoque = ItemDoResumo & { codigo_sku?: string | null; estoque_atual?: number | null; estoque_minimo?: number | null; status?: string | null };
export type EstadoDoEstoque = { saldo: number; minimo: number; alerta: boolean };

// Equipamentos: ordens de serviço abertas (pendente ou em andamento) e ocorrências ainda sem encerramento.
export type OrdemAtencaoEq = { id: string; equipamentoId: string; tipo: string; status?: string; dataPrevista?: string; responsavel?: string };
export type OcorrenciaAtencaoEq = { id: string; equipamentoId: string; tipoNome: string; status: string; data: string; codigo?: string };
// Viagens: despesas lançadas que ainda não entraram em nenhum relatório de despesas.
export type DespesaAbertaViagem = { id: string; tecnico: string; registradaEm: string };

export type EntradaAtencao = {
  hoje: string;
  empregados: readonly EmpregadoBase[];
  epis: readonly ItemEstoque[];
  uniformes: readonly ItemEstoque[];
  ferramentas: readonly ItemEstoque[];
  movsEpi: readonly MovimentacaoEpi[];
  movsFerramenta: readonly MovimentacaoEpi[];
  /** Saldo, mínimo e alerta como a tela de Estoque calcula (inclui tamanhos); sem isto vale o saldo e o mínimo gravados no item. */
  estado?: (modulo: "epi" | "uniforme", item: ItemEstoque) => EstadoDoEstoque;
  equipamentos?: { nomes: ReadonlyMap<string, string>; ordens: readonly OrdemAtencaoEq[]; ocorrencias: readonly OcorrenciaAtencaoEq[] };
  viagens?: { despesasEmAberto: readonly DespesaAbertaViagem[]; prazoDias: number };
};

const ORDEM = { alta: 0, media: 1, baixa: 2 } as const;
const dataBr = (d: string) => d.slice(0, 10).split("-").reverse().join("/");
const diasEntre = (de: string, ate: string): number => Math.round((Date.parse(`${ate.slice(0, 10)}T00:00:00Z`) - Date.parse(`${de.slice(0, 10)}T00:00:00Z`)) / 86_400_000);

function porEmpregado(movs: readonly MovimentacaoEpi[]): Map<string, MovimentacaoEpi[]> {
  const mapa = new Map<string, MovimentacaoEpi[]>();
  for (const m of movs) {
    if (!m.empregado_id) continue;
    const lista = mapa.get(m.empregado_id);
    if (lista) lista.push(m);
    else mapa.set(m.empregado_id, [m]);
  }
  return mapa;
}

export function pendenciasDeHoje(e: EntradaAtencao): GrupoPendencia[] {
  const nomes = new Map(e.empregados.map((x) => [x.id, x]));
  const movsEpi = porEmpregado(e.movsEpi);
  const movsFer = porEmpregado(e.movsFerramenta);

  // 1) EPI em posse com CA ou validade vencida: o empregado precisa trocar.
  const vencidos: ItemPendencia[] = [];
  for (const [id, movs] of movsEpi) {
    const emp = nomes.get(id);
    if (!emp || emp.ativo === false || emp.data_demissao) continue;
    const r = resumoEmpregado(movs, e.epis, id, e.hoje);
    const lista = r.emPosse.filter((p) => p.vencido);
    if (lista.length === 0) continue;
    vencidos.push({
      chave: `venc-${id}`, texto: emp.nome, detalhe: lista.map((p) => p.nome).join(", "),
      acao: { rotulo: "Agendar troca", url: "/epi", search: { aba: "entrega", ...(emp.empresa_id ? { empresa: emp.empresa_id } : {}), empregado: id } },
    });
  }

  // 2) Ferramentas ainda com empregado desligado: devolução em atraso.
  const atrasadas: ItemPendencia[] = [];
  for (const [id, movs] of movsFer) {
    const emp = nomes.get(id);
    if (!emp || !(emp.ativo === false || emp.data_demissao)) continue;
    const r = resumoEmpregado(movs, e.ferramentas, id, e.hoje);
    if (r.emPosse.length === 0) continue;
    atrasadas.push({
      chave: `dev-${id}`, texto: emp.nome, detalhe: `${r.emPosse.map((p) => `${p.nome} (${p.quantidade})`).join(", ")}${emp.data_demissao ? ` · desligado em ${dataBr(emp.data_demissao)}` : ""}`,
      acao: { rotulo: "Registrar devolução", url: "/ferramentas", search: { aba: "entrega" } },
    });
  }

  // 3) Estoque no mínimo ou abaixo (EPI, uniforme e ferramenta), um grupo por módulo.
  const padrao = (i: ItemEstoque): EstadoDoEstoque => ({ saldo: i.estoque_atual ?? 0, minimo: i.estoque_minimo ?? 0, alerta: (i.estoque_minimo ?? 0) > 0 && (i.estoque_atual ?? 0) <= (i.estoque_minimo ?? 0) });
  const abaixo = (itens: readonly ItemEstoque[], modulo: "epi" | "uniforme" | "ferramenta", url: string, area: string): ItemPendencia[] =>
    itens.filter((i) => i.status !== "Inativo").flatMap((i) => {
      // Ferramenta não tem tamanhos: vale o saldo e o mínimo gravados no item (a tela de Estoque de ferramentas lê o mesmo saldo).
      const s = e.estado && modulo !== "ferramenta" ? e.estado(modulo, i) : padrao(i);
      return s.alerta ? [{ chave: `min-${area}-${i.id}`, texto: i.nome, detalhe: `${area}: saldo ${s.saldo} para mínimo ${s.minimo}`, acao: { rotulo: "Repor estoque", url, search: { aba: "compras" } } }] : [];
    });
  const minimoEpi = abaixo(e.epis, "epi", "/epi", "EPI");
  const minimoUniforme = abaixo(e.uniformes, "uniforme", "/uniformes", "Uniforme");
  const minimoFerramenta = abaixo(e.ferramentas, "ferramenta", "/ferramentas", "Ferramenta");

  // 5) Equipamentos: ordem de serviço aberta com a previsão vencida e ocorrência ainda sem encerramento (toda ocorrência aberta pede tratativa, por isso entra sem esperar prazo).
  // Registro de equipamento que já não existe no cadastro fica de fora: não há onde resolvê-lo.
  const nomeEq = (id: string) => e.equipamentos?.nomes.get(id) ?? "";
  const equipamentos: ItemPendencia[] = [
    ...(e.equipamentos?.ordens ?? [])
      .filter((o) => !!nomeEq(o.equipamentoId))
      .filter((o) => (o.status === "Pendente" || o.status === "Em andamento") && !!o.dataPrevista && o.dataPrevista.slice(0, 10) < e.hoje)
      .map((o) => ({ chave: `os-${o.id}`, texto: nomeEq(o.equipamentoId), detalhe: `Manutenção ${o.tipo.toLowerCase()} atrasada ${diasEntre(o.dataPrevista as string, e.hoje)} dia(s), prevista para ${dataBr(o.dataPrevista as string)}${o.responsavel ? ` · ${o.responsavel}` : ""}`, acao: { rotulo: "Ver manutenção", url: "/equipamentos", search: { aba: "manutencao" } } })),
    ...(e.equipamentos?.ocorrencias ?? [])
      .filter((o) => !!nomeEq(o.equipamentoId))
      .filter((o) => o.status !== "Encerrada" && o.status !== "Resolvida")
      .map((o) => ({ chave: `oco-${o.id}`, texto: nomeEq(o.equipamentoId), detalhe: `Ocorrência ${o.codigo ? `${o.codigo} ` : ""}aberta: ${o.tipoNome} (${dataBr(o.data)})`, acao: { rotulo: "Tratar ocorrência", url: "/equipamentos", search: { aba: "ocorrencias" } } })),
  ];

  // 6) Viagens: despesa lançada há mais dias que o prazo do relatório e ainda fora de qualquer relatório; uma linha por técnico.
  const porTecnico = new Map<string, DespesaAbertaViagem[]>();
  for (const d of e.viagens?.despesasEmAberto ?? []) {
    if (diasEntre(d.registradaEm, e.hoje) <= (e.viagens?.prazoDias ?? 0)) continue;
    const lista = porTecnico.get(d.tecnico);
    if (lista) lista.push(d);
    else porTecnico.set(d.tecnico, [d]);
  }
  const viagens: ItemPendencia[] = [...porTecnico].map(([tecnico, lista]) => {
    const antiga = lista.map((d) => d.registradaEm.slice(0, 10)).sort()[0]!;
    return { chave: `viag-${tecnico}`, texto: tecnico, detalhe: `${lista.length} despesa(s) sem relatório · a mais antiga lançada em ${dataBr(antiga)} (${diasEntre(antiga, e.hoje)} dias)`, acao: { rotulo: "Gerar relatório", url: "/viagens", search: { aba: "relatorio" } } };
  }).sort((a, b) => a.texto.localeCompare(b.texto, "pt-BR"));

  // 4) Empregado desligado que ainda está com EPI: o item tem de voltar (ou ser cobrado) antes de fechar o desligamento.
  const epiComDesligado: ItemPendencia[] = [];
  for (const [id, movs] of movsEpi) {
    const emp = nomes.get(id);
    if (!emp || !(emp.ativo === false || emp.data_demissao)) continue;
    const lista = resumoEmpregado(movs, e.epis, id, e.hoje).emPosse;
    if (lista.length === 0) continue;
    epiComDesligado.push({ chave: `epi-desl-${id}`, texto: emp.nome, detalhe: `${lista.map((p) => `${p.nome} (${p.quantidade})`).join(", ")}${emp.data_demissao ? ` · desligado em ${dataBr(emp.data_demissao)}` : ""}`, acao: { rotulo: "Registrar devolução", url: "/epi", search: { aba: "entrega", modo: "devolucao", ...(emp.empresa_id ? { empresa: emp.empresa_id } : {}), empregado: id } } });
  }

  const grupos: GrupoPendencia[] = [
    { id: "epi-vencido", titulo: "EPIs vencidos com empregados", prioridade: "alta", vazio: "Nenhum EPI vencido em posse.", itens: vencidos },
    { id: "devolucao-atrasada", titulo: "Devoluções atrasadas (empregado desligado)", prioridade: "alta", vazio: "Nenhuma ferramenta pendente de desligados.", itens: atrasadas },
    { id: "equipamentos", titulo: "Equipamentos: manutenção atrasada ou ocorrência aberta", prioridade: "alta", vazio: "Nenhum equipamento com pendência.", itens: equipamentos },
    { id: "minimo-epi", titulo: "EPI no mínimo ou abaixo", prioridade: "media", vazio: "Nenhum EPI abaixo do mínimo.", itens: minimoEpi },
    { id: "minimo-uniforme", titulo: "Uniformes no mínimo ou abaixo", prioridade: "media", vazio: "Nenhum uniforme abaixo do mínimo.", itens: minimoUniforme },
    { id: "minimo-ferramenta", titulo: "Ferramentas no mínimo ou abaixo", prioridade: "media", vazio: "Nenhuma ferramenta abaixo do mínimo.", itens: minimoFerramenta },
    { id: "viagens", titulo: "Viagens: despesas sem relatório no prazo", prioridade: "media", vazio: "Nenhuma despesa fora do prazo.", itens: viagens },
    { id: "epi-com-desligado", titulo: "EPIs não devolvidos (empregado desligado)", prioridade: "media", vazio: "Nenhum EPI pendente de desligados.", itens: epiComDesligado },
  ];
  return grupos.sort((a, b) => ORDEM[a.prioridade] - ORDEM[b.prioridade]);
}

export const totalPendencias = (grupos: readonly GrupoPendencia[]): number => grupos.reduce((t, g) => t + g.itens.length, 0);
