import { LinhasEsqueleto } from "@/components/Esqueletos";
import { AjudaTermo } from "@/components/AjudaTermo";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { MinimoEditavel } from "@/components/modules/MinimoEditavel";
import { AlternarDensidade } from "@/components/AlternarDensidade";
import { BarraDeFiltros } from "@/components/layout/BarraDeFiltros";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AtalhoPeriodo } from "@/components/AtalhoPeriodo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { empresasParaEscolha } from "@/lib/empresas";
import { useEmpresa } from "@/lib/empresa-context";
import { hojeLocal } from "@/lib/empregados";
import { CartaoDoNome } from "@/components/GavetaResumo";
import { situacaoDoCa } from "@/lib/peek";
import { controleDeEstoque } from "@/lib/epi-controle-estoque";
import {
  filtrarEstoqueEpi,
  linhasDeEstoqueEpi,
  CLASSE_DO_NIVEL,
  nivelDoAlerta,
  textoDoAlerta,
  type CompraDoEstoque,
  type DevolucaoUsada,
  type LinhaEstoqueEpi,
} from "@/lib/estoque-epi-visao";
import { minimosDeEpi, saldosDeEpi } from "@/lib/estoque-epi-saldos";
import { prepararMinimoDaLinha } from "@/lib/estoque-configuracao";
import { controlaTamanho, nomeTamanho } from "@/lib/estoque-tamanho";
import { MODO_DEMO } from "@/lib/modo-demo";
import { exportarCsv, formatarData } from "@/lib/gemape";
import { useComprasEpis, useComprasUniformes, useEmpresas, useMovimentacoes, useSalvar } from "@/lib/hooks-gemape";
import { lerItensEstoque } from "@/lib/itens-estoque-modulo";
import { useParametrosBase } from "@/lib/use-parametros-base";

const TODOS = "todos";

// Módulo EPI > Estoque (decisão 329): só a consulta do estoque de EPIs. Dois botões escolhem os novos ou os usados (que vieram de devolução); filtros por empresa, palavra-chave,
// data da compra, fornecedor, CA e nota fiscal; e, em cada linha, o item de cada empresa (as compras de todos os fornecedores somam num estoque só; data, NF e fornecedor listam todas as compras que o formam), o tamanho, o mínimo, a quantidade disponível, o alerta e a média de consumo mensal.
export function EstoqueEpiModulo({ modulo = "epi" }: { modulo?: "epi" | "uniforme" }) {
  const rotulo = modulo === "epi" ? "EPI" : "uniforme";
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
  // Estoque mínimo editável no próprio campo da linha (decisão 416); gravado no item, então os alertas, a Sugestão e o Estoque mínimo passam a usar o novo valor.
  const salvar = useSalvar(modulo === "epi" ? "epis" : "uniformes", ["estoque-modulo"]);

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ["estoque-modulo", modulo, empresaId],
    queryFn: () => lerItensEstoque(supabase, modulo, empresaId),
  });
  const { data: empresas = [] } = useEmpresas();
  const { data: comprasEpi = [] } = useComprasEpis(empresaId, "", modulo === "epi");
  const { data: comprasUniforme = [] } = useComprasUniformes(empresaId, "", modulo === "uniforme");
  const compras = modulo === "epi" ? comprasEpi : comprasUniforme;
  const { data: movimentos = [] } = useMovimentacoes(modulo, empresaId);
  const nomeDaEmpresa = (id: string | null) =>
    empresas.find((e) => e.id === id)?.nome_fantasia ?? "—";
  const nomeDoTamanho = (id: string | null) => (id ? nomeTamanho(parametros, id) : "—");

  const todas = useMemo(() => {
    const consumo = new Map(
      controleDeEstoque(itens, movimentos, hojeLocal()).map((l) => [l.itemId, l.mediaMensal]),
    );
    const porId = new Map(itens.map((i) => [i.id, i]));
    return linhasDeEstoqueEpi({
      itens,
      compras: compras as unknown as CompraDoEstoque[],
      devolucoes: movimentos as unknown as DevolucaoUsada[],
      saldosDe: (id) => (porId.has(id) ? saldosDeEpi(parametros, porId.get(id)!, modulo) : {}),
      minimosDe: (id) => (porId.has(id) ? minimosDeEpi(parametros, porId.get(id)!, modulo) : {}),
      mediaMensalDe: (id) => consumo.get(id) ?? 0,
    });
  }, [itens, compras, movimentos, parametros, modulo]);

  const fornecedores = useMemo(
    () =>
      [...new Set(todas.flatMap((l) => l.fornecedores))].sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [todas],
  );
  const filtradas = filtrarEstoqueEpi(
    todas,
    {
      ...(empresaFiltro !== TODOS ? { empresaId: empresaFiltro } : {}),
      palavra,
      dataInicio,
      dataFim,
      ca,
      nf,
      ...(fornecedor !== TODOS ? { fornecedor } : {}),
    },
    nomeDoTamanho,
  );
  const doTipo = (c: "novo" | "usado", lista: LinhaEstoqueEpi[]) =>
    lista.filter((l) => l.condicao === c);
  const lista = doTipo(condicao, filtradas);
  // Produto com tamanho grava o mínimo do tamanho da linha; sem tamanho, o mínimo único do item (como em Estoque das ferramentas). Devolve false quando o valor não vale.
  function gravarMinimo(l: LinhaEstoqueEpi, texto: string): boolean {
    const item = itens.find((i) => i.id === l.itemId);
    if (!item || salvar.isPending) return false;
    try {
      const porTamanho = !!l.tamanhoId && MODO_DEMO && controlaTamanho(parametros, modulo, item);
      const valores: Record<string, unknown> = prepararMinimoDaLinha(item.minimos_tamanho ?? {}, porTamanho ? l.tamanhoId : null, texto);
      if (!MODO_DEMO) delete valores["minimos_tamanho"];
      salvar.mutate({ id: item.id, valores });
      return true;
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Estoque mínimo inválido.");
      return false;
    }
  }
  const periodoInvalido = !!dataInicio && !!dataFim && dataInicio > dataFim;

  return (
    <section className="space-y-4" aria-label={modulo === "epi" ? "Estoque de EPIs" : "Estoque de uniformes"}>
      {/* Filtros à esquerda; Novos e Usados e Exportar à direita (decisão 406). O botão escolhido leva um anel e o outro fica mais claro (decisão 353). */}
      <div className="flex flex-wrap items-end gap-2">
        <BarraDeFiltros>
        <div className="w-44 space-y-1">
          <Label htmlFor="est-empresa">Empresa</Label>
          <Select value={empresaFiltro} onValueChange={setEmpresaFiltro}>
            <SelectTrigger id="est-empresa">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todas as empresas</SelectItem>
              {empresasParaEscolha(empresas).map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nome_fantasia}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-44 space-y-1">
          <Label htmlFor="est-palavra">Palavra-chave</Label>
          <Input
            id="est-palavra"
            placeholder="Código, descrição, tamanho…"
            value={palavra}
            onChange={(e) => setPalavra(e.target.value)}
          />
        </div>
        <div className="w-44 space-y-1">
          <Label htmlFor="est-fornecedor">Fornecedor</Label>
          <Select value={fornecedor} onValueChange={setFornecedor}>
            <SelectTrigger id="est-fornecedor">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos os fornecedores</SelectItem>
              {fornecedores.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className={modulo === "epi" ? "grid grid-cols-2 gap-2" : "space-y-1"}>
          {modulo === "epi" && (
            <div className="w-24 space-y-1">
              <Label htmlFor="est-ca">CA</Label>
              <Input id="est-ca" className="w-24" value={ca} onChange={(e) => setCa(e.target.value)} />
            </div>
          )}
          <div className="w-24 space-y-1">
            <Label htmlFor="est-nf">NF</Label>
            <Input id="est-nf" className="w-24" value={nf} onChange={(e) => setNf(e.target.value)} />
          </div>
        </div>
        <div className="w-44 space-y-1">
          <Label htmlFor="est-inicio">Data da compra, de</Label>
          <Input
            id="est-inicio"
            type="date"
            value={dataInicio}
            max={dataFim || undefined}
            onChange={(e) => setDataInicio(e.target.value)}
          />
        </div>
        <div className="w-44 space-y-1">
          <Label htmlFor="est-fim">Data da compra, até</Label>
          <Input
            id="est-fim"
            type="date"
            value={dataFim}
            min={dataInicio || undefined}
            onChange={(e) => setDataFim(e.target.value)}
          />
        </div>
        <AtalhoPeriodo aoEscolher={(i, f) => { setDataInicio(i); setDataFim(f); }} />
        <Button
          type="button"
          onClick={() => {
            setEmpresaFiltro(TODOS);
            setPalavra("");
            setDataInicio("");
            setDataFim("");
            setFornecedor(TODOS);
            setCa("");
            setNf("");
          }}
        >
          Limpar filtros
        </Button>
        </BarraDeFiltros>
        <AlternarDensidade />
        <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Novos ou usados">
        {(["novo", "usado"] as const).map((c) => (
          <Button
            key={c}
            type="button"
            className={condicao === c ? "ring-2 ring-primary ring-offset-2" : "opacity-70"}
            aria-pressed={condicao === c}
            onClick={() => setCondicao(c)}
          >
            {c === "novo" ? "Novos" : "Usados"} (
            {doTipo(c, filtradas).reduce((t, l) => t + l.disponivel, 0)})
          </Button>
        ))}
      </div>
          <Button
            type="button"
            variant="outline"
            disabled={lista.length === 0}
            onClick={() =>
              exportarCsv(
                `estoque-${modulo}-${condicao === "novo" ? "novos" : "usados"}`,
                lista.map((l) => ({
                  Código: l.codigo,
                  Descrição: l.descricao,
                  Empresa: nomeDaEmpresa(l.empresaId),
                  "Data da compra": l.dataCompra ? formatarData(l.dataCompra) : "",
                  NF: l.nf ?? "",
                  Fornecedor: l.fornecedor ?? "",
                  ...(modulo === "epi" ? { CA: l.ca ?? "" } : {}),
                  Tamanho: l.tamanhoId ? nomeDoTamanho(l.tamanhoId) : "",
                  "Estoque mínimo": l.minimo,
                  "Quantidade disponível": l.disponivel,
                  Alerta: textoDoAlerta(l),
                  "Média de consumo mensal": Number(l.mediaMensal.toFixed(2)),
                })),
              )
            }
          >
            Exportar CSV
          </Button>
        </div>
      </div>
      {periodoInvalido && (
        <p className="text-sm text-destructive">
          A data inicial não pode ser depois da data final.
        </p>
      )}

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead title="Data da compra mais recente entre as que formam este estoque">Data da compra</TableHead>
              <TableHead title="Notas fiscais de todas as compras deste estoque">NF</TableHead>
              <TableHead title="Fornecedores de todas as compras: somam no mesmo estoque">Fornecedor</TableHead>
              {modulo === "epi" && <TableHead>CA</TableHead>}
              <TableHead>Tamanho</TableHead>
              <TableHead className="text-center">Estoque mínimo <AjudaTermo termo="Estoque mínimo (ponto de pedido)">Quando a quantidade disponível chega neste número, o sistema avisa que está na hora de comprar mais.</AjudaTermo></TableHead>
              <TableHead>Quantidade disponível</TableHead>
              <TableHead>Alerta</TableHead>
              <TableHead>Média de consumo mensal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <LinhasEsqueleto colunas={modulo === "epi" ? 12 : 11} />
            ) : lista.length === 0 ? (
              <TableRow>
                <TableCell colSpan={modulo === "epi" ? 12 : 11} className="py-6 text-center text-muted-foreground">
                  {condicao === "usado"
                    ? `Nenhum ${rotulo} usado no estoque. Eles entram pela Devolução, na Entrada no Estoque.`
                    : `Nenhum ${rotulo} novo encontrado.`}
                </TableCell>
              </TableRow>
            ) : (
              lista.map((l) => (
                <TableRow key={l.chave}>
                  <TableCell className="font-mono text-xs">{l.codigo}</TableCell>
                  <TableCell>
                    {modulo === "epi" ? (() => {
                      const item = itens.find((i) => i.id === l.itemId) as { ca_validade?: string | null } | undefined;
                      const ca = situacaoDoCa(item?.ca_validade ?? null, hojeLocal());
                      return <CartaoDoNome titulo={l.descricao} aviso={ca.avisar}><p>CA {l.ca || "—"}</p><p className={ca.avisar ? "font-medium text-destructive" : "text-muted-foreground"}>{ca.texto}</p></CartaoDoNome>;
                    })() : l.descricao}
                  </TableCell>
                  <TableCell>{nomeDaEmpresa(l.empresaId)}</TableCell>
                  <TableCell>{l.dataCompra ? formatarData(l.dataCompra) : "—"}</TableCell>
                  <TableCell>{l.nf || "—"}</TableCell>
                  <TableCell>{l.fornecedor || "—"}</TableCell>
                  {modulo === "epi" && <TableCell>{l.ca || "—"}</TableCell>}
                  <TableCell>{nomeDoTamanho(l.tamanhoId)}</TableCell>
                  <TableCell className="text-center">
                    <MinimoEditavel key={l.chave} valor={l.minimo} rotulo={`${l.descricao} ${nomeDoTamanho(l.tamanhoId)}`.trim()} onSalvar={(texto) => gravarMinimo(l, texto)} />
                  </TableCell>
                  <TableCell className="font-semibold">{l.disponivel}</TableCell>
                  <TableCell className={CLASSE_DO_NIVEL[nivelDoAlerta(l.saldo, l.minimo) ?? "nenhum"]}>
                    {textoDoAlerta(l) || "—"}
                    {textoDoAlerta(l) && (
                      <p className="text-xs font-normal text-muted-foreground">Saldo total: {l.saldo} ({l.novos} {l.novos === 1 ? "novo" : "novos"} e {l.usados} {l.usados === 1 ? "usado" : "usados"})</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {l.mediaMensal.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
