import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LinhaCaixa } from "@/components/modules/CaixaGestaoDialogs";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { controleDaFerramenta, disponivelNaCaixa, movimentacoesDaCaixa } from "@/lib/controle-caixa";
import { lerMovimentacoesRelatorio } from "@/lib/relatorios-historico";
import { useCaixaItens } from "@/lib/hooks-gemape";

type CaixaDaLinha = { id: string; codigo: string };

/** As ferramentas de uma caixa com o que está guardado, o que está com empregado e o que já saiu por baixa, lido do histórico dela. */
export function useLinhasDaCaixa(caixa: CaixaDaLinha | undefined): { pronto: boolean; linhas: LinhaCaixa[] } {
  const { empresaId } = useEmpresa();
  const { data: itens = [], isSuccess } = useCaixaItens(caixa?.id ?? "");
  const { data: movimentacoes = [], isSuccess: historicoPronto } = useQuery({
    queryKey: ["movimentacoes", "ferramenta", "caixas", empresaId],
    queryFn: () => lerMovimentacoesRelatorio(supabase, { modulo: "ferramenta", empresaId: empresaId === TODAS ? undefined : empresaId }),
    enabled: !!caixa,
  });
  if (!caixa || !isSuccess || !historicoPronto) return { pronto: false, linhas: [] };
  const historico = movimentacoesDaCaixa(movimentacoes, caixa.id, itens.flatMap((ci) => (ci.ferramenta ? [ci.ferramenta.id] : [])), caixa.codigo);
  const linhas = itens.flatMap((ci): LinhaCaixa[] => {
    if (!ci.ferramenta) return [];
    const c = controleDaFerramenta(historico, ci.ferramenta_id);
    return [{ ferramenta: ci.ferramenta, quantidade: ci.quantidade, comEmpregado: c.comEmpregado, disponivel: disponivelNaCaixa(ci.quantidade, c.comEmpregado, c.baixado + c.baixadoDaCaixa) }];
  });
  return { pronto: true, linhas };
}
