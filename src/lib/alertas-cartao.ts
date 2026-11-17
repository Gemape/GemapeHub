// Alertas reais nos cartões da tela inicial (no lugar de "N atalhos"): só com dados que o sistema já tem.
// EPIs, Uniformes, Ferramentas, Equipamentos e Viagens vêm dos mesmos grupos de "O que precisa da sua atenção hoje"; Veículos vem da Frota.
// Não há alerta de documentação de veículo vencendo: não existe esse campo (fica para uma fase com aprovação de campo novo).
import type { GrupoPendencia } from "./atencao-hoje.ts";
import type { ChecklistDoPainel, Previsao } from "./checklist-painel.ts";
import { hojeBrasilia } from "./checklist-veiculo.ts";
import { kmAtualDoVeiculo, sugestoesPreventivas } from "./extrato-veiculo.ts";
import { ocorrenciaAberta, type OcorrenciaDoPrazo } from "./frota-ocorrencias.ts";
import { situacaoChecklistDoVeiculo, situacaoPreventivas } from "./frota-situacao.ts";

export type LinhaAlerta = { chave: string; texto: string; quantidade: number; url: string; search?: Record<string, string> };
export type AlertaCartao = { total: number; linhas: LinhaAlerta[] };

// Quais grupos de pendência alimentam cada cartão (pelo título do cartão).
const GRUPOS_DO_CARTAO: Record<string, readonly string[]> = {
  EPIs: ["epi-vencido", "minimo-epi", "epi-com-desligado"],
  Uniformes: ["minimo-uniforme"],
  Ferramentas: ["minimo-ferramenta", "devolucao-atrasada"],
  Equipamentos: ["equipamentos"],
  Viagens: ["viagens"],
};

// Cartões que têm fonte de alerta; os outros (Gerais...) seguem mostrando quantos atalhos têm.
export const cartaoTemAlerta = (cartao: string): boolean => cartao === "Veículos" || cartao in GRUPOS_DO_CARTAO;

export type ResumoDeVeiculos = { checklistVencido: number; manutencaoVencida: number; ocorrenciasAbertas: number };

type VeiculoBase = { id: string; status?: string | null; quilometragem_atual?: number | null };
type ManutencaoBase = { veiculoId: string; acaoId: string | null; grupos?: { acaoId: string }[] | undefined; data: string; km: number; tipo: string };

// Veículos com check list vencido, veículos com revisão do plano vencida e ocorrências em aberto: as mesmas regras da tela Frota. Veículo inativo fica de fora.
export function resumoDeVeiculos(e: {
  veiculos: readonly VeiculoBase[];
  previsoes: Previsao[];
  checklists: ChecklistDoPainel[];
  planos: { veiculoId: string; itens: { acaoId: string; km: number; meses: number }[] }[];
  acoes: { id: string; nome: string }[];
  manutencoes: readonly ManutencaoBase[];
  abastecimentos: readonly { veiculoId: string; km: number }[];
  ocorrencias: readonly (OcorrenciaDoPrazo & { veiculoId: string })[];
  hoje?: string;
}): ResumoDeVeiculos {
  const hoje = e.hoje ?? hojeBrasilia();
  const ativos = e.veiculos.filter((v) => v.status !== "Inativo");
  const ids = new Set(ativos.map((v) => v.id));
  let checklistVencido = 0;
  let manutencaoVencida = 0;
  for (const v of ativos) {
    if (situacaoChecklistDoVeiculo(e.previsoes, e.checklists, v.id, hoje)?.situacao === "vencida") checklistVencido++;
    const manut = e.manutencoes.filter((m) => m.veiculoId === v.id);
    const abast = e.abastecimentos.filter((a) => a.veiculoId === v.id);
    const status = sugestoesPreventivas({
      plano: (e.planos.find((p) => p.veiculoId === v.id) as never) ?? null,
      acoes: e.acoes,
      manutencoes: manut,
      kmAtual: kmAtualDoVeiculo(v.quilometragem_atual ?? 0, abast, manut),
      hoje,
    }).map((s) => s.status);
    if (situacaoPreventivas(status)?.situacao === "vencida") manutencaoVencida++;
  }
  const ocorrenciasAbertas = e.ocorrencias.filter((o) => ids.has(o.veiculoId) && ocorrenciaAberta(o)).length;
  return { checklistVencido, manutencaoVencida, ocorrenciasAbertas };
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

// Alerta por cartão. Só entra no mapa o cartão cujos dados foram lidos: sem dado lido não há "Tudo em dia" (seria mentira).
export function alertasDosCartoes(grupos: readonly GrupoPendencia[] | null, veiculos: ResumoDeVeiculos | null): Map<string, AlertaCartao> {
  const mapa = new Map<string, AlertaCartao>();
  for (const [cartao, ids] of Object.entries(GRUPOS_DO_CARTAO)) {
    const doCartao = (grupos ?? []).filter((g) => ids.includes(g.id));
    if (doCartao.length === 0) continue;
    const linhas: LinhaAlerta[] = doCartao.filter((g) => g.itens.length > 0).map((g) => {
      const acao = g.itens[0]!.acao;
      return { chave: g.id, texto: g.titulo, quantidade: g.itens.length, url: acao.url, ...(acao.search ? { search: acao.search } : {}) };
    });
    mapa.set(cartao, { total: linhas.reduce((t, l) => t + l.quantidade, 0), linhas });
  }
  if (veiculos) {
    const linhas: LinhaAlerta[] = [
      { chave: "veic-checklist", texto: `Check list vencido (${plural(veiculos.checklistVencido, "veículo", "veículos")})`, quantidade: veiculos.checklistVencido, url: "/veiculos", search: { aba: "checklist" } },
      { chave: "veic-manutencao", texto: `Manutenção vencida (${plural(veiculos.manutencaoVencida, "veículo", "veículos")})`, quantidade: veiculos.manutencaoVencida, url: "/veiculos", search: { aba: "manutencao" } },
      { chave: "veic-ocorrencias", texto: "Ocorrências em aberto", quantidade: veiculos.ocorrenciasAbertas, url: "/veiculos", search: { aba: "ocorrencias" } },
    ].filter((l) => l.quantidade > 0);
    mapa.set("Veículos", { total: linhas.reduce((t, l) => t + l.quantidade, 0), linhas });
  }
  return mapa;
}
