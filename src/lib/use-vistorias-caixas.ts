// As caixas habilitadas com a situação da vistoria periódica de cada uma: o mês-base (Escalonamento), a periodicidade e o prazo (Parâmetros Específicos),
// a última vistoria feita (histórico) e o portador atual. Usado pelo Escalonamento de Vistorias e pelo painel do Termo de vistoria periódica.
import { TODAS, useEmpresa } from "./empresa-context";
import { hojeBrasilia } from "./checklist-veiculo.ts";
import { caixasHabilitadas } from "./caixas-habilitadas.ts";
import { useCaixasFerramentas, useMovimentacoes } from "./hooks-gemape.ts";
import { portadorAtivo } from "./portadores-caixa.ts";
import { situacaoDaVistoria, type ResultadoSituacao } from "./situacao-vistoria.ts";
import { useParametrosBase } from "./use-parametros-base.ts";
import { usePortadoresCaixa } from "./use-portadores-caixa.ts";
import { lerParametrosVistoria, type PeriodicidadeVistoria } from "./vistoria-ferramentas-parametros.ts";
import type { MesBase } from "./escalonamento-vistorias.ts";

type CaixaDaLista = NonNullable<ReturnType<typeof useCaixasFerramentas>["data"]>[number];
export type VistoriaDaCaixa = { caixa: CaixaDaLista; portador: string | null; mesBase: MesBase | undefined; ultimaVistoria: string | null; resultado: ResultadoSituacao };

export function useVistoriasDasCaixas(mesesBase: Record<string, MesBase>): { linhas: VistoriaDaCaixa[]; isLoading: boolean; periodicidade: PeriodicidadeVistoria; prazoDias: number; hoje: string } {
  const { empresaId } = useEmpresa();
  const habilitadas = useParametrosBase().caixasHabilitadas;
  const { data: todasCaixas = [], isLoading } = useCaixasFerramentas(TODAS, "");
  const { data: movimentos = [] } = useMovimentacoes("ferramenta", empresaId);
  const portadores = usePortadoresCaixa();
  const { periodicidade, prazoDias } = lerParametrosVistoria();
  const hoje = hojeBrasilia();

  // Última vistoria de cada caixa, pelo histórico (a caixa vem gravada na vistoria em modo demonstração).
  const ultima = new Map<string, string>();
  for (const m of movimentos) {
    if (m.tipo_movimentacao !== "Vistoria" || !m.caixa_id) continue;
    const dia = m.data_movimentacao.slice(0, 10);
    if (dia > (ultima.get(m.caixa_id) ?? "")) ultima.set(m.caixa_id, dia);
  }
  const caixas = caixasHabilitadas(todasCaixas, habilitadas)
    .filter((c) => empresaId === TODAS || c.empresa_id === empresaId)
    .sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR", { numeric: true }));
  const linhas = caixas.map((caixa) => {
    let portador: string | null = null;
    try { portador = portadorAtivo(portadores, caixa.id)?.empregado_nome ?? null; } catch { portador = null; }
    const ultimaVistoria = ultima.get(caixa.id) ?? null;
    return { caixa, portador, mesBase: mesesBase[caixa.id], ultimaVistoria, resultado: situacaoDaVistoria({ mesBase: mesesBase[caixa.id], periodicidade, prazoDias, hoje, ultimaVistoria }) };
  });
  return { linhas, isLoading, periodicidade, prazoDias, hoje };
}
