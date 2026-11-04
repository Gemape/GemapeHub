import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { enderecoDaEntrada, type EnderecoProduto } from "@/lib/enderecamento-categoria";
import { lerTodas } from "@/lib/ler-todas";
import { MODO_DEMO } from "@/lib/modo-demo";
import { useParametrosBase } from "@/lib/use-parametros-base";

// Onde guardar o que está entrando (decisão 384): na entrada de uma compra, mostra o endereçamento do produto (rua, número e apartamento) quando a categoria usa endereçamento e, se
// ele ainda não foi cadastrado, avisa e leva a Parâmetros > Gerais > Endereçamento (numa nova aba, para não perder o que foi preenchido). Categoria sem endereçamento: não aparece.
export function EnderecoDaEntrada({ categoriaId, empresaId, codigo }: { categoriaId: string; empresaId: string; codigo: string }) {
  const parametros = useParametrosBase();
  const { data: enderecos = [] } = useQuery({
    queryKey: ["enderecamentos", empresaId],
    enabled: MODO_DEMO && Boolean(empresaId),
    queryFn: () => lerTodas<EnderecoProduto>(() => supabase.from("enderecamentos").select("*").eq("empresa_id", empresaId), (q) => q.order("id")),
  });
  if (!MODO_DEMO) return null;
  const e = enderecoDaEntrada(parametros, categoriaId, empresaId, codigo, enderecos);
  if (!e.aplica) return null;
  const href = `/cadastros/gerais/enderecamento?busca=${encodeURIComponent(codigo)}`;
  return (
    <p className={`flex flex-wrap items-center gap-1 text-xs ${e.endereco ? "text-muted-foreground" : "font-medium text-amber-700 dark:text-amber-300"}`} role={e.endereco ? undefined : "status"}>
      <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
      {e.endereco ? <>Guardar em: <strong className="text-foreground">{e.texto || "endereço sem detalhes"}</strong>.</> : <>Sem endereçamento {e.obrigatorio ? "(obrigatório nesta categoria)" : "cadastrado"}.</>}{" "}
      <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-2">{e.endereco ? "Ver endereçamento" : "Cadastrar endereçamento"}</a>
    </p>
  );
}
