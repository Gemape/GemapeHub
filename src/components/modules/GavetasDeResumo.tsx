import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { GavetaResumo } from "@/components/GavetaResumo";
import { LinhaDoTempo } from "@/components/LinhaDoTempo";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { eventosDoTempo, type MovimentoDoTempo } from "@/lib/linha-do-tempo";
import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hojeLocal } from "@/lib/empregados";
import { lerHistoricoEpiPorItem, type ModuloEntrega } from "@/lib/entrega-epi";
import { TODAS } from "@/lib/empresa-context";
import { useEmpregados, useItens } from "@/lib/hooks-gemape";
import { ultimasMovimentacoes, type MovimentoResumo } from "@/lib/peek";
import { resumoEmpregado } from "@/lib/resumo-empregado";
import { formatarData } from "@/lib/gemape";

// Janela com a linha do tempo completa (até 500 eventos, filtrados e ordenados no servidor) de um empregado, ferramenta ou veículo.
function DialogoLinhaDoTempo({ alvo, aoFechar, nomeDoItem, nomeDoEmpregado }: {
  alvo: { titulo: string; coluna: "empregado_id" | "item_id" | "veiculo_id"; id: string; modulo?: string } | null;
  aoFechar: () => void; nomeDoItem: (id: string | null | undefined) => string; nomeDoEmpregado?: (id: string | null | undefined) => string | null;
}) {
  const { data: movs = [], isLoading } = useQuery({
    queryKey: ["linha-do-tempo", alvo?.coluna, alvo?.id, alvo?.modulo ?? "todos"],
    enabled: Boolean(alvo),
    queryFn: async () => {
      let q = supabase.from("movimentacoes").select("*").eq(alvo?.coluna ?? "item_id", alvo?.id ?? "");
      if (alvo?.modulo) q = q.eq("modulo", alvo.modulo);
      const { data, error } = await q.order("data_movimentacao", { ascending: false }).order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return (data ?? []) as MovimentoDoTempo[];
    },
  });
  const eventos = useMemo(() => eventosDoTempo(movs, { nomeDoItem, ...(nomeDoEmpregado ? { nomeDoEmpregado } : {}), mostrarEmpregado: alvo?.coluna !== "empregado_id" }), [movs, nomeDoItem, nomeDoEmpregado, alvo?.coluna]);
  // O título fica na tela durante a animação de fechar (o alvo já é null nesse momento).
  const ultimoTitulo = useRef("");
  if (alvo) ultimoTitulo.current = alvo.titulo;
  return (
    <Dialog open={alvo !== null} onOpenChange={(a) => !a && aoFechar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Linha do tempo</DialogTitle>
          <DialogDescription>{alvo?.titulo ?? ultimoTitulo.current}</DialogDescription>
        </DialogHeader>
        <LinhaDoTempo eventos={eventos} carregando={isLoading} />
        {movs.length >= 500 && <p className="text-xs text-muted-foreground">Mostrando os 500 eventos mais recentes.</p>}
      </DialogContent>
    </Dialog>
  );
}

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
  const { data: epis = [] } = useItens("epi", TODAS, "", Boolean(empregado));
  const { data: uniformes = [] } = useItens("uniforme", TODAS, "", Boolean(empregado));
  const { data: ferramentas = [] } = useItens("ferramenta", TODAS, "", Boolean(empregado));
  const [doEpi, doUniforme, daFerramenta] = consultas.map((c) => c.data ?? []);
  const carregando = consultas.some((c) => c.isLoading);
  const [tempo, setTempo] = useState<{ id: string; nome: string } | null>(null);
  const nomesDosItens = useMemo(() => new Map([...epis, ...uniformes, ...ferramentas].map((i) => [i.id, i.nome])), [epis, uniformes, ferramentas]);
  const nomeDoItemEmpregado = useCallback((id: string | null | undefined) => (id && nomesDosItens.get(id)) || "Item removido do cadastro", [nomesDosItens]);

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
    <>
    <DialogoLinhaDoTempo alvo={tempo ? { titulo: tempo.nome, coluna: "empregado_id", id: tempo.id } : null} aoFechar={() => setTempo(null)} nomeDoItem={nomeDoItemEmpregado} />
    <GavetaResumo
      aberto={empregado !== null}
      onAbertoMudou={(a) => !a && aoFechar()}
      titulo={empregado?.nome ?? ""}
      subtitulo={empregado ? [empregado.cargo, empregado.matricula && `Matrícula ${empregado.matricula}`, empregado.data_demissao && `Desligado em ${formatarData(empregado.data_demissao)}`].filter(Boolean).join(" · ") : ""}
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
      aoAbrirLinhaDoTempo={() => { if (empregado) setTempo({ id: empregado.id, nome: empregado.nome }); }}
    />
    </>
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
  const [tempo, setTempo] = useState<{ id: string; titulo: string; campo: "item_id" | "veiculo_id" } | null>(null);
  const { data: empregados = [] } = useEmpregados(TODAS, false, tempo !== null);
  const tituloDoTempo = tempo?.titulo ?? alvo?.titulo ?? "";
  const nomeDoItemAlvo = useCallback(() => tituloDoTempo, [tituloDoTempo]);
  const nomeDoEmpregadoAlvo = useCallback((id: string | null | undefined) => empregados.find((e) => e.id === id)?.nome ?? null, [empregados]);
  return (
    <>
    <DialogoLinhaDoTempo alvo={tempo ? { titulo: tempo.titulo, coluna: tempo.campo, id: tempo.id, modulo } : null} aoFechar={() => setTempo(null)} nomeDoItem={nomeDoItemAlvo} nomeDoEmpregado={nomeDoEmpregadoAlvo} />
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
      aoAbrirLinhaDoTempo={() => { if (alvo) setTempo({ id: alvo.id, titulo: alvo.titulo, campo: alvo.campo }); }}
    />
    </>
  );
}

