import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { formatarData } from "@/lib/gemape";
import { lerMovimentacoesRelatorio } from "@/lib/relatorios-historico";
import { naturezaMovimentacao } from "@/lib/historico-movimentacoes";
import { caixasHabilitadas } from "@/lib/caixas-habilitadas";
import { controleDaFerramenta, disponivelNaCaixa, movimentacoesDaCaixa, ocorrenciasDaCaixa } from "@/lib/controle-caixa";
import { portadorAtivo } from "@/lib/portadores-caixa";
import { usePortadoresCaixa } from "@/lib/use-portadores-caixa";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { useCaixasFerramentas, useEmpregados, useEmpresas, useItens, useOcorrencias, useTodosCaixaItens } from "@/lib/hooks-gemape";
import { montarRelatorioCaixasHtml, SECOES_RELATORIO_CAIXAS, type CaixaParaRelatorio } from "@/lib/relatorio-caixas";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";

const TODAS_AS_SECOES = SECOES_RELATORIO_CAIXAS.map((_, n) => n);

// Ferramentas > Relatórios > Ferramentas por caixas: a pessoa marca as seções e as caixas e o relatório abre no visualizador, como os outros relatórios do sistema.
export function FerramentasPorCaixas() {
  const { empresaId } = useEmpresa();
  const [marcadas, setMarcadas] = useState<number[]>(TODAS_AS_SECOES);
  const [fora, setFora] = useState<string[]>([]); // caixas desmarcadas; começa vazio = todas entram
  const habilitadas = useParametrosBase().caixasHabilitadas;
  const caixasQuery = useCaixasFerramentas(empresaId, "");
  const itensQuery = useTodosCaixaItens();
  const ferramentasQuery = useItens("ferramenta", TODAS);
  const ocorrenciasQuery = useOcorrencias("", "ferramenta");
  const movimentosQuery = useQuery({
    queryKey: ["movimentacoes", "ferramenta", "caixas", empresaId],
    queryFn: () => lerMovimentacoesRelatorio(supabase, { modulo: "ferramenta", empresaId: empresaId === TODAS ? undefined : empresaId }),
  });
  const { data: empresas = [] } = useEmpresas();
  const { data: empregados = [] } = useEmpregados(TODAS);
  const portadores = usePortadoresCaixa();
  const pronto = [caixasQuery, itensQuery, ferramentasQuery, ocorrenciasQuery, movimentosQuery].every((q) => q.isSuccess);
  const lista = caixasHabilitadas(caixasQuery.data ?? [], habilitadas);
  const escolhidas = lista.filter((c) => !fora.includes(c.id));

  function gerar() {
    const nomeEmpregado = (id: string | null) => empregados.find((e) => e.id === id)?.nome ?? "—";
    const nomeEmpresa = (id: string | null | undefined) => empresas.find((e) => e.id === id)?.nome_fantasia ?? "—";
    const ferramentas = ferramentasQuery.data ?? [];
    const movimentos = movimentosQuery.data ?? [];
    const caixas: CaixaParaRelatorio[] = escolhidas.map((caixa) => {
      const itens = (itensQuery.data ?? []).filter((i) => i.caixa_id === caixa.id);
      const ids = itens.map((i) => i.ferramenta_id);
      const historico = movimentacoesDaCaixa(movimentos, caixa.id, ids, caixa.codigo);
      const doItem = (id: string | null) => ferramentas.find((f) => f.id === id);
      const rotuloFerramenta = (id: string | null) => {
        const f = doItem(id);
        return f ? `${f.codigo_sku} ${f.nome}` : "—";
      };
      return {
        codigo: caixa.codigo,
        empresa: nomeEmpresa(caixa.empresa_id),
        portador: portadorAtivo(portadores, caixa.id)?.empregado_nome ?? "",
        ferramentas: itens.flatMap((i) => {
          const f = doItem(i.ferramenta_id);
          if (!f) return [];
          const c = controleDaFerramenta(historico, i.ferramenta_id);
          const baixado = c.baixado + c.baixadoDaCaixa;
          return [{
            codigo: f.codigo_sku, nome: f.nome, marcaModelo: [f.marca, f.modelo].filter(Boolean).join(" / ") || "—", empresa: nomeEmpresa(f.empresa_id),
            quantidade: i.quantidade, comEmpregado: c.comEmpregado, baixado, disponivel: disponivelNaCaixa(i.quantidade, c.comEmpregado, baixado), estado: f.status || "—",
          }];
        }),
        historico: historico.map((m) => ({
          data: formatarData(m.data_movimentacao), tipo: naturezaMovimentacao(m), ferramenta: rotuloFerramenta(m.item_id), quantidade: m.quantidade,
          empregado: nomeEmpregado(m.empregado_id), observacao: m.observacao ?? "",
        })),
        ocorrencias: ocorrenciasDaCaixa(ocorrenciasQuery.data ?? [], caixa.id, ids).map((o) => ({
          data: formatarData(o.data), hora: o.hora.slice(0, 5), ferramenta: rotuloFerramenta(o.item_id), empregado: nomeEmpregado(o.empregado_id),
          responsavel: o.responsavel_registro ?? "—", descricao: o.descricao_ocorrencia ?? "—",
        })),
      };
    });
    abrirDocumento({
      titulo: "Relatório de caixas de ferramentas",
      html: montarRelatorioCaixasHtml({ caixas, secoes: marcadas, parcial: escolhidas.length < lista.length, empresa: empresaId === TODAS ? "Todas as empresas" : nomeEmpresa(empresaId) }),
      arquivo: nomeArquivoDocumento("Relatório de caixas de ferramentas"),
    });
  }

  return (
    <section className="panel max-w-xl space-y-4 p-5" aria-label="Ferramentas por caixas">
      <p className="text-sm text-muted-foreground">Marque as seções e as caixas que entram no relatório. O resumo (das caixas escolhidas: caixas, ferramentas, com empregado, baixado, disponível e ocorrências) sai sempre.</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Caixas</span>
          <Button type="button" variant="outline" size="sm" onClick={() => setFora([])}>Marcar todas</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setFora(lista.map((c) => c.id))}>Desmarcar todas</Button>
          <span className="ml-auto text-xs text-muted-foreground">{pronto && escolhidas.length === 0 ? "Marque ao menos uma caixa" : `${escolhidas.length} de ${lista.length} caixas`}</span>
        </div>
        {!pronto && <p className="text-xs text-muted-foreground">Carregando as caixas...</p>}
        <ul className="max-h-72 space-y-1 overflow-y-auto" aria-label="Caixas do relatório">
          {lista.map((c) => {
            const portador = portadorAtivo(portadores, c.id)?.empregado_nome;
            return (
            <li key={c.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/60">
                <Checkbox checked={!fora.includes(c.id)} onCheckedChange={(v) => setFora((f) => (v === true ? f.filter((x) => x !== c.id) : [...f, c.id]))} />
                <span className="min-w-0 truncate">{c.codigo}{portador ? ` — ${portador}` : ""}</span>
              </label>
            </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <Button type="button" variant="outline" size="sm" onClick={() => setMarcadas(TODAS_AS_SECOES)}>Marcar todos</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setMarcadas([])}>Desmarcar todos</Button>
          <span className="ml-auto text-xs text-muted-foreground">{marcadas.length} de {SECOES_RELATORIO_CAIXAS.length} seções</span>
        </div>
        <ul className="space-y-1.5" aria-label="Seções do relatório">
          {SECOES_RELATORIO_CAIXAS.map((titulo, n) => (
            <li key={titulo}>
              <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/60">
                <Checkbox checked={marcadas.includes(n)} onCheckedChange={(v) => setMarcadas((m) => (v === true ? [...m.filter((x) => x !== n), n].sort((a, b) => a - b) : m.filter((x) => x !== n)))} />
                {titulo}
              </label>
            </li>
          ))}
        </ul>
        <div className="flex justify-end border-t pt-3">
          <Button type="button" disabled={!pronto || escolhidas.length === 0} onClick={gerar}>{pronto ? "Gerar relatório" : "Carregando..."}</Button>
        </div>
    </section>
  );
}
