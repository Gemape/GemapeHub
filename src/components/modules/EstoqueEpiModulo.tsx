import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { empresasParaEscolha } from "@/lib/empresas";
import { useEmpresa } from "@/lib/empresa-context";
import { hojeLocal } from "@/lib/empregados";
import { controleDeEstoque } from "@/lib/epi-controle-estoque";
import { filtrarEstoqueEpi, linhasDeEstoqueEpi, type CompraDoEstoque, type DevolucaoUsada, type LinhaEstoqueEpi } from "@/lib/estoque-epi-visao";
import { controlaTamanho, nomeTamanho, saldosPorTamanho, SEM_TAMANHO, usaMinimoPorTamanho } from "@/lib/estoque-tamanho";
import { exportarCsv, formatarData } from "@/lib/gemape";
import { useComprasEpis, useEmpresas, useMovimentacoes } from "@/lib/hooks-gemape";
import { lerItensEstoque } from "@/lib/itens-estoque-modulo";
import { useParametrosBase } from "@/lib/use-parametros-base";

const TODOS = "todos";

// Módulo EPI > Estoque (decisão 329): só a consulta do estoque de EPIs. Dois botões escolhem os novos ou os usados (que vieram de devolução); filtros por empresa, palavra-chave,
// data da compra, fornecedor, CA e nota fiscal; e, em cada linha, a compra de origem, o tamanho, o mínimo, a quantidade disponível, o alerta e a média de consumo mensal.
export function EstoqueEpiModulo() {
  const { empresaId } = useEmpresa();
  const parametros = useParametrosBase();
  const [condicao, setCondicao] = useState<"novo" | "usado">("novo");
  const [empresaFiltro, setEmpresaFiltro] = useState(TODOS);
  const [palavra, setPalavra] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [fornecedor, setFornecedor] = useState(TODOS);
  const [ca, setCa] = useState("");
  const [nf, setNf] = useState("");

  const { data: itens = [], isLoading } = useQuery({ queryKey: ["estoque-modulo", "epi", empresaId], queryFn: () => lerItensEstoque(supabase, "epi", empresaId) });
  const { data: empresas = [] } = useEmpresas();
  const { data: compras = [] } = useComprasEpis(empresaId);
  const { data: movimentos = [] } = useMovimentacoes("epi", empresaId);
  const nomeDaEmpresa = (id: string | null) => empresas.find((e) => e.id === id)?.nome_fantasia ?? "—";
  const nomeDoTamanho = (id: string | null) => (id ? nomeTamanho(parametros, id) : "—");

  const todas = useMemo(() => {
    const consumo = new Map(controleDeEstoque(itens, movimentos, hojeLocal()).map((l) => [l.itemId, l.consumoAnual]));
    return linhasDeEstoqueEpi({
      itens,
      compras: compras as unknown as CompraDoEstoque[],
      devolucoes: movimentos as unknown as DevolucaoUsada[],
      saldosDe: (id) => {
        const item = itens.find((i) => i.id === id);
        if (!item) return {};
        return controlaTamanho(parametros, "epi", item) ? { ...saldosPorTamanho(parametros, "epi", item) } : { [SEM_TAMANHO]: Number(item.estoque_atual) || 0 };
      },
      minimosDe: (id) => {
        const item = itens.find((i) => i.id === id);
        if (!item) return {};
        if (controlaTamanho(parametros, "epi", item) && usaMinimoPorTamanho(parametros, "epi", item)) return { ...(item.minimos_tamanho ?? {}) };
        return { [SEM_TAMANHO]: Number(item.estoque_minimo) || 0 };
      },
      mediaMensalDe: (id) => consumo.get(id) ?? 0,
    });
  }, [itens, compras, movimentos, parametros]);

  const fornecedores = useMemo(() => [...new Set(todas.map((l) => l.fornecedor).filter((f): f is string => !!f))].sort((a, b) => a.localeCompare(b, "pt-BR")), [todas]);
  const filtradas = filtrarEstoqueEpi(todas, {
    ...(empresaFiltro !== TODOS ? { empresaId: empresaFiltro } : {}), palavra, dataInicio, dataFim, ca, nf, ...(fornecedor !== TODOS ? { fornecedor } : {}),
  }, nomeDoTamanho);
  const doTipo = (c: "novo" | "usado", lista: LinhaEstoqueEpi[]) => lista.filter((l) => l.condicao === c);
  const lista = doTipo(condicao, filtradas);
  const periodoInvalido = !!dataInicio && !!dataFim && dataInicio > dataFim;

  return (
    <section className="space-y-4" aria-label="Estoque de EPIs">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Novos ou usados">
        {(["novo", "usado"] as const).map((c) => (
          <Button key={c} type="button" variant={condicao === c ? "default" : "outline"} aria-pressed={condicao === c} onClick={() => setCondicao(c)}>
            {c === "novo" ? "Novos" : "Usados"} ({doTipo(c, filtradas).reduce((t, l) => t + l.disponivel, 0)})
          </Button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="est-empresa">Empresa</Label>
          <Select value={empresaFiltro} onValueChange={setEmpresaFiltro}>
            <SelectTrigger id="est-empresa"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todas as empresas</SelectItem>
              {empresasParaEscolha(empresas).map((e) => <SelectItem key={e.id} value={e.id}>{e.nome_fantasia}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="est-palavra">Palavra-chave</Label>
          <Input id="est-palavra" placeholder="Código, descrição, tamanho…" value={palavra} onChange={(e) => setPalavra(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="est-fornecedor">Fornecedor</Label>
          <Select value={fornecedor} onValueChange={setFornecedor}>
            <SelectTrigger id="est-fornecedor"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos os fornecedores</SelectItem>
              {fornecedores.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="est-ca">CA</Label>
            <Input id="est-ca" value={ca} onChange={(e) => setCa(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="est-nf">NF</Label>
            <Input id="est-nf" value={nf} onChange={(e) => setNf(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="est-inicio">Data da compra, de</Label>
          <Input id="est-inicio" type="date" value={dataInicio} max={dataFim || undefined} onChange={(e) => setDataInicio(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="est-fim">Data da compra, até</Label>
          <Input id="est-fim" type="date" value={dataFim} min={dataInicio || undefined} onChange={(e) => setDataFim(e.target.value)} />
        </div>
        <div className="flex items-end gap-2 lg:col-span-2">
          <Button type="button" variant="ghost" onClick={() => { setEmpresaFiltro(TODOS); setPalavra(""); setDataInicio(""); setDataFim(""); setFornecedor(TODOS); setCa(""); setNf(""); }}>Limpar filtros</Button>
          <Button
            type="button" variant="outline" disabled={lista.length === 0}
            onClick={() => exportarCsv(`estoque-epi-${condicao === "novo" ? "novos" : "usados"}`, lista.map((l) => ({
              Código: l.codigo, Descrição: l.descricao, Empresa: nomeDaEmpresa(l.empresaId), "Data da compra": l.dataCompra ? formatarData(l.dataCompra) : "", NF: l.nf ?? "", Fornecedor: l.fornecedor ?? "", CA: l.ca ?? "",
              Tamanho: l.tamanhoId ? nomeDoTamanho(l.tamanhoId) : "", "Estoque mínimo": l.minimo, "Quantidade disponível": l.disponivel, Alerta: l.alerta ? "Abaixo do mínimo" : "", "Média de consumo mensal": Number(l.mediaMensal.toFixed(2)),
            })))}
          >Exportar CSV</Button>
        </div>
      </div>
      {periodoInvalido && <p className="text-sm text-destructive">A data inicial não pode ser depois da data final.</p>}

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Data da compra</TableHead>
              <TableHead>NF</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>CA</TableHead>
              <TableHead>Tamanho</TableHead>
              <TableHead className="text-right">Estoque mínimo</TableHead>
              <TableHead className="text-right">Quantidade disponível</TableHead>
              <TableHead>Alerta</TableHead>
              <TableHead className="text-right">Média de consumo mensal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={12}>Carregando estoque…</TableCell></TableRow>
              : lista.length === 0 ? <TableRow><TableCell colSpan={12} className="py-6 text-center text-muted-foreground">{condicao === "usado" ? "Nenhum EPI usado no estoque. Eles entram pela Devolução, na Entrada no Estoque." : "Nenhum EPI novo encontrado."}</TableCell></TableRow>
                : lista.map((l) => (
                  <TableRow key={l.chave}>
                    <TableCell className="font-mono text-xs">{l.codigo}</TableCell>
                    <TableCell>{l.descricao}</TableCell>
                    <TableCell>{nomeDaEmpresa(l.empresaId)}</TableCell>
                    <TableCell>{l.dataCompra ? formatarData(l.dataCompra) : "—"}</TableCell>
                    <TableCell>{l.nf || "—"}</TableCell>
                    <TableCell>{l.fornecedor || "—"}</TableCell>
                    <TableCell>{l.ca || "—"}</TableCell>
                    <TableCell>{nomeDoTamanho(l.tamanhoId)}</TableCell>
                    <TableCell className="text-right">{l.minimo}</TableCell>
                    <TableCell className="text-right font-semibold">{l.disponivel}</TableCell>
                    <TableCell className={l.alerta ? "font-bold text-destructive" : ""}>{l.alerta ? "Abaixo do mínimo" : "—"}</TableCell>
                    <TableCell className="text-right">{l.mediaMensal.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
