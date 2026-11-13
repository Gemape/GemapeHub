import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { GavetaResumo } from "@/components/GavetaResumo";
import { supabase } from "@/integrations/supabase/client";
import { hojeLocal } from "@/lib/empregados";
import { lerHistoricoEpiPorItem, type ModuloEntrega } from "@/lib/entrega-epi";
import { TODAS } from "@/lib/empresa-context";
import { useItens } from "@/lib/hooks-gemape";
import { ultimasMovimentacoes, type MovimentoResumo } from "@/lib/peek";
import { resumoEmpregado } from "@/lib/resumo-empregado";
import { formatarData } from "@/lib/gemape";

const MODULOS = ["epi", "uniforme", "ferramenta"] as ModuloEntrega[]; // ferramenta usa a mesma leitura (como na tela de entrega)

// Resumo do colaborador na gaveta lateral: o que tem em posse (EPI, uniforme, ferramenta), o que está vencido e as últimas movimentações.
// Só é montada com a gaveta aberta, então nada é lido antes do clique.
export function GavetaEmpregado({ empregado, aoFechar, aoAbrirFicha }: {
  empregado: { id: string; nome: string; cargo: string | null; matricula: string | null; empresa_id: string | null; data_demissao?: string | null } | null;
  aoFechar: () => void; aoAbrirFicha: () => void;
}) {
  const empresaId = empregado?.empresa_id ?? "";
  const hoje = hojeLocal();
  const consultas = MODULOS.map((modulo) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks -- lista fixa de 3 módulos: a ordem das chamadas nunca muda
    useQuery({
      queryKey: ["gaveta-empregado", modulo, empresaId, empregado?.id],
      enabled: Boolean(empregado && empresaId),
      queryFn: () => lerHistoricoEpiPorItem(supabase, { empresaId, empregadoId: empregado?.id ?? "", modulo }),
    }),
  );
  const { data: epis = [] } = useItens("epi", empresaId || TODAS, "", Boolean(empregado));
  const { data: uniformes = [] } = useItens("uniforme", empresaId || TODAS, "", Boolean(empregado));
  const { data: ferramentas = [] } = useItens("ferramenta", empresaId || TODAS, "", Boolean(empregado));
  const [doEpi, doUniforme, daFerramenta] = consultas.map((c) => c.data ?? []);
  const carregando = consultas.some((c) => c.isLoading);

  const dados = useMemo(() => {
    const epi = resumoEmpregado(doEpi ?? [], epis, empregado?.id ?? "", hoje);
    const uniforme = resumoEmpregado(doUniforme ?? [], uniformes, empregado?.id ?? "", hoje);
    const ferramenta = resumoEmpregado(daFerramenta ?? [], ferramentas, empregado?.id ?? "", hoje);
    const nomes = new Map([...epis, ...uniformes, ...ferramentas].map((i) => [i.id, i.nome]));
    const todas = [...(doEpi ?? []), ...(doUniforme ?? []), ...(daFerramenta ?? [])] as MovimentoResumo[];
    return { epi, uniforme, ferramenta, ultimas: ultimasMovimentacoes(todas, (id) => (id && nomes.get(id)) || "Item removido", 5) };
  }, [doEpi, doUniforme, daFerramenta, epis, uniformes, ferramentas, empregado?.id, hoje]);

  const linhas = (r: ReturnType<typeof resumoEmpregado>) => r.emPosse.map((p) => ({ texto: `${p.nome}${p.vencido ? " (vencido)" : ""}`, valor: p.quantidade, alerta: p.vencido }));
  return (
    <GavetaResumo
      aberto={empregado !== null}
      onAbertoMudou={(a) => !a && aoFechar()}
      titulo={empregado?.nome ?? ""}
      subtitulo={empregado ? `${empregado.cargo || "Cargo não informado"} · Matrícula ${empregado.matricula || "—"}${empregado.data_demissao ? ` · Desligado em ${formatarData(empregado.data_demissao)}` : ""}` : ""}
      carregando={carregando}
      indicadores={[
        { rotulo: "EPIs em posse", valor: dados.epi.emPosse.length },
        { rotulo: "EPIs vencidos", valor: dados.epi.vencidos, alerta: dados.epi.vencidos > 0 },
        { rotulo: "Uniformes em posse", valor: dados.uniforme.emPosse.length },
        { rotulo: "Ferramentas pendentes", valor: dados.ferramenta.emPosse.length, alerta: dados.ferramenta.emPosse.length > 0 && !!empregado?.data_demissao },
      ]}
      secoes={[
        { titulo: "EPIs em posse", vazio: "Nenhum no momento.", linhas: linhas(dados.epi) },
        { titulo: "Uniformes em posse", vazio: "Nenhum no momento.", linhas: linhas(dados.uniforme) },
        { titulo: "Ferramentas pendentes", vazio: "Nenhuma.", linhas: linhas(dados.ferramenta) },
        { titulo: "Últimas movimentações", vazio: "Sem movimentações.", linhas: dados.ultimas },
      ]}
      rotuloFicha="Abrir ficha completa (editar)"
      aoAbrirFicha={aoAbrirFicha}
    />
  );
}

// Resumo de um veículo ou de uma ferramenta: o cadastro essencial (já em mãos na lista) e as últimas movimentações do módulo.
export function GavetaItemMovimentado({ alvo, modulo, aoFechar, aoAbrirFicha, rotuloFicha }: {
  alvo: { id: string; titulo: string; subtitulo: string; indicadores: { rotulo: string; valor: string | number; alerta?: boolean }[]; campo: "item_id" | "veiculo_id" } | null;
  modulo: "veiculo" | "ferramenta"; aoFechar: () => void; aoAbrirFicha: () => void; rotuloFicha: string;
}) {
  // Só as 5 últimas deste registro, filtradas e ordenadas no servidor: nada de baixar o histórico da empresa para mostrar cinco linhas.
  const { data: movs = [], isLoading } = useQuery({
    queryKey: ["gaveta-item", modulo, alvo?.campo, alvo?.id],
    enabled: Boolean(alvo),
    queryFn: async () => {
      const { data, error } = await supabase.from("movimentacoes").select("*").eq("modulo", modulo).eq(alvo?.campo ?? "item_id", alvo?.id ?? "")
        .order("data_movimentacao", { ascending: false }).order("created_at", { ascending: false }).limit(5);
      if (error) throw error;
      return (data ?? []) as MovimentoResumo[];
    },
  });
  const ultimas = useMemo(() => (alvo ? ultimasMovimentacoes(movs, () => alvo.titulo, 5) : []), [alvo, movs]);
  return (
    <GavetaResumo
      aberto={alvo !== null}
      onAbertoMudou={(a) => !a && aoFechar()}
      titulo={alvo?.titulo ?? ""}
      subtitulo={alvo?.subtitulo ?? ""}
      carregando={isLoading}
      indicadores={alvo?.indicadores ?? []}
      secoes={[{ titulo: "Últimas movimentações", vazio: "Sem movimentações.", linhas: ultimas }]}
      rotuloFicha={rotuloFicha}
      aoAbrirFicha={aoAbrirFicha}
    />
  );
}

