import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import type { LinhaDeMinimo } from "@/components/modules/EstoqueMinimoEpi";
import { supabase } from "@/integrations/supabase/client";
import { hojeLocal } from "@/lib/empregados";
import { useEmpresa } from "@/lib/empresa-context";
import { controleDeEstoque } from "@/lib/epi-controle-estoque";
import { linhasDeEstoqueEpi, type CompraDoEstoque, type DevolucaoUsada } from "@/lib/estoque-epi-visao";
import { alertasDeMinimoEpi, minimosDeEpi, minimoTotalDeEpi, saldosDeEpi, totalDeEpi } from "@/lib/estoque-epi-saldos";
import { controlaTamanho, nomeTamanho, saldosPorTamanho, SEM_TAMANHO } from "@/lib/estoque-tamanho";
import { useComprasEpis, useComprasUniformes, useMovimentacoes } from "@/lib/hooks-gemape";
import { lerItensEstoque } from "@/lib/itens-estoque-modulo";
import { linhasDaSugestaoEpi, type ItemDaSugestao, type LinhaSugestaoEpi } from "@/lib/sugestao-epi";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { useParametrosCompraEpi } from "@/lib/use-parametros-compra-epi";

// As linhas da Sugestão de Compras (decisão 330) e os alertas de estoque mínimo de EPI ou uniforme, calculados uma vez para quem precisar: a tela Sugestão de Compras e o Dashboard.
export function useSugestaoCompras(modulo: "epi" | "uniforme"): { todas: LinhaSugestaoEpi[]; alertasMinimo: LinhaDeMinimo[]; isLoading: boolean } {
  const { empresaId } = useEmpresa();
  const parametros = useParametrosBase();
  const parametrosCompra = useParametrosCompraEpi(modulo);
  const { data: itens = [], isLoading } = useQuery({
    queryKey: ["estoque-modulo", modulo, empresaId],
    queryFn: () => lerItensEstoque(supabase, modulo, empresaId),
  });
  const { data: movimentos = [] } = useMovimentacoes(modulo, empresaId);
  const { data: comprasEpi = [] } = useComprasEpis(empresaId, "", modulo === "epi");
  const { data: comprasUniforme = [] } = useComprasUniformes(empresaId, "", modulo === "uniforme");
  const compras = modulo === "epi" ? comprasEpi : comprasUniforme;

  const todas: LinhaSugestaoEpi[] = useMemo(() => {
    // Total e usados pelo mesmo critério da aba Estoque (decisão 330): o saldo por tamanho e as devoluções usadas, limitadas ao saldo.
    const porId = new Map(itens.map((i) => [i.id, i]));
    const usados = new Map<string, number>();
    for (const l of linhasDeEstoqueEpi({
      itens,
      compras: compras as unknown as CompraDoEstoque[],
      devolucoes: movimentos as unknown as DevolucaoUsada[],
      saldosDe: (id) => (porId.has(id) ? saldosDeEpi(parametros, porId.get(id)!, modulo) : {}),
      minimosDe: (id) => (porId.has(id) ? minimosDeEpi(parametros, porId.get(id)!, modulo) : {}),
      mediaMensalDe: () => 0,
    }))
      if (l.condicao === "usado") usados.set(l.itemId, (usados.get(l.itemId) ?? 0) + l.disponivel);
    return linhasDaSugestaoEpi({
      itens: itens as unknown as ItemDaSugestao[],
      controle: controleDeEstoque(itens, movimentos, hojeLocal()),
      parametros: parametrosCompra,
      totalDe: (item) => totalDeEpi(parametros, item as never, modulo),
      usadosDe: (item) => usados.get(item.id) ?? 0,
      minimoDe: (item) => minimoTotalDeEpi(parametros, item as never, modulo),
      // Item de um tamanho só mostra o tamanho na descrição; item com vários tamanhos já aparece uma vez por tamanho no cadastro.
      tamanhoDe: (item) => {
        if (!controlaTamanho(parametros, modulo, item as never)) return "";
        const chaves = Object.keys(saldosPorTamanho(parametros, modulo, item as never)).filter(
          (k) => k !== SEM_TAMANHO,
        );
        return chaves.length === 1 ? nomeTamanho(parametros, chaves[0]) : "";
      },
    });
  }, [itens, movimentos, compras, parametros, parametrosCompra, modulo]);
  // Estoque mínimo: um alerta por tamanho, pela mesma regra da aba Estoque (decisão 417); itens inativos ficam de fora, como na sugestão.
  const alertasMinimo: LinhaDeMinimo[] = useMemo(
    () =>
      itens
        .filter((i) => (i as { status?: string | null }).status !== "Inativo")
        .flatMap((item) =>
          alertasDeMinimoEpi(parametros, item as never, modulo).map((a) => ({
            chave: `${item.id}|${a.chave}`,
            itemId: item.id,
            codigo: item.codigo_sku,
            descricao: a.chave === SEM_TAMANHO ? item.nome : `${item.nome} · Tamanho ${a.nome}`,
            empresaId: item.empresa_id,
            total: a.saldo,
            minimo: a.minimo,
          })),
        ),
    [itens, parametros, modulo],
  );
  return { todas, alertasMinimo, isLoading };
}
