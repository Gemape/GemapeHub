import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MODO_DEMO } from "@/lib/modo-demo";
import { enderecamentoDaCategoria, type ParametrosBase } from "@/lib/parametros-base";
import { precisaAvisarEnderecamento } from "@/lib/enderecamento-categoria";

export async function avisarEnderecamentoObrigatorio(
  dados: ParametrosBase,
  categoriaId: string,
  empresaId: string,
  codigoProduto: string,
): Promise<void> {
  if (!MODO_DEMO || enderecamentoDaCategoria(dados, categoriaId) !== "obrigatorio" ||
    !empresaId || !codigoProduto) return;

  try {
    const { data, error } = await supabase.from("enderecamentos")
      .select("empresa_id,codigo_produto").eq("empresa_id", empresaId);
    if (error) throw error;
    if (precisaAvisarEnderecamento(dados, categoriaId, empresaId, codigoProduto, data ?? [])) {
      toast.warning(`Produto ${codigoProduto} salvo sem endereçamento. Configure Rua, Número e Apartamento em Parâmetros > Gerais > Endereçamento.`);
    }
  } catch {
    toast.warning("Produto salvo. Não foi possível conferir o endereçamento.");
  }
}
