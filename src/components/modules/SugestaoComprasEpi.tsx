import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { BarraDeFiltros } from "@/components/layout/BarraDeFiltros";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { hojeBrasilia } from "@/lib/checklist-veiculo";
import { hojeLocal } from "@/lib/empregados";
import { empresasParaEscolha } from "@/lib/empresas";
import { useEmpresa } from "@/lib/empresa-context";
import { controleDeEstoque } from "@/lib/epi-controle-estoque";
import { CLASSE_STATUS, EtiquetaStatusCompra, LegendaStatusCompra } from "@/components/modules/LegendaStatusCompra";
import { STATUS_CRITICIDADE, type StatusCriticidade } from "@/lib/epi-parametros";
import {
  linhasDeEstoqueEpi,
  type CompraDoEstoque,
  type DevolucaoUsada,
} from "@/lib/estoque-epi-visao";
import { EstoqueMinimoEpi, type LinhaDeMinimo } from "@/components/modules/EstoqueMinimoEpi";
import { alertasDeMinimoEpi, minimosDeEpi, minimoTotalDeEpi, saldosDeEpi, totalDeEpi } from "@/lib/estoque-epi-saldos";
import { controlaTamanho, nomeTamanho, saldosPorTamanho, SEM_TAMANHO } from "@/lib/estoque-tamanho";
import { exportarCsv } from "@/lib/gemape";
import { useComprasEpis, useComprasUniformes, useEmpresas, useMovimentacoes } from "@/lib/hooks-gemape";
import { lerItensEstoque } from "@/lib/itens-estoque-modulo";
import {
  filtrarSugestaoEpi,
  itensDaCotacao,
  linhasDaSugestaoEpi,
  montarCotacaoExcel,
  montarCotacaoHtml,
  rotuloDoStatus,
  STATUS_QUE_PEDEM_COMPRA,
  type ItemDaSugestao,
  type LinhaCotacao,
  type LinhaSugestaoEpi,
} from "@/lib/sugestao-epi";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { useParametrosCompraEpi } from "@/lib/use-parametros-compra-epi";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";

const TODOS = "todos";
const NIVEIS = Object.keys(STATUS_CRITICIDADE) as StatusCriticidade[];

// Módulo EPI > Sugestão de Compras (decisão 330): estoque de novos e usados como um só, filtros por empresa e palavra-chave, status de criticidade dos Parâmetros Específicos e o botão
// Gerar relatório, que monta a Cotação de preços (PDF ou Excel) pela subcategoria e pelos níveis de criticidade escolhidos.
export function SugestaoComprasEpi({ modulo = "epi" }: { modulo?: "epi" | "uniforme" }) {
  const rotulo = modulo === "epi" ? "EPI" : "uniforme";
  const { empresaId } = useEmpresa();
  const parametros = useParametrosBase();
  const parametrosCompra = useParametrosCompraEpi(modulo);
  const [empresaFiltro, setEmpresaFiltro] = useState(TODOS);
  const [palavra, setPalavra] = useState("");
  const { data: itens = [], isLoading } = useQuery({
    queryKey: ["estoque-modulo", modulo, empresaId],
    queryFn: () => lerItensEstoque(supabase, modulo, empresaId),
  });
  const { data: movimentos = [] } = useMovimentacoes(modulo, empresaId);
  const { data: comprasEpi = [] } = useComprasEpis(empresaId, "", modulo === "epi");
  const { data: comprasUniforme = [] } = useComprasUniformes(empresaId, "", modulo === "uniforme");
  const compras = modulo === "epi" ? comprasEpi : comprasUniforme;
  const { data: empresas = [] } = useEmpresas();
  const nomeDaEmpresa = (id: string | null) =>
    empresas.find((e) => e.id === id)?.nome_fantasia ?? "—";
  const nomeDaSubcategoria = (id: string | null) =>
    parametros.subcategorias.find((s) => s.id === id)?.nome ?? "Sem subcategoria";

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
  const filtradas = filtrarSugestaoEpi(todas, {
    ...(empresaFiltro !== TODOS ? { empresaId: empresaFiltro } : {}),
    palavra,
  });

  // ----- Relatório: Cotação de preços -----
  const [aberto, setAberto] = useState(false);
  const [passo, setPasso] = useState<"criterios" | "itens">("criterios");
  const [subcategoria, setSubcategoria] = useState(TODOS);
  const [niveis, setNiveis] = useState<StatusCriticidade[]>(["ruptura", "comprar_ja"]);
  const [marcados, setMarcados] = useState<Record<string, boolean>>({});
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});
  const daEmpresa = filtrarSugestaoEpi(todas, {
    ...(empresaFiltro !== TODOS ? { empresaId: empresaFiltro } : {}),
  });
  const subcategoriasPresentes = [...new Set(daEmpresa.map((l) => l.subcategoriaId))]
    .map((id) => ({ id: id ?? "", nome: nomeDaSubcategoria(id) }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const candidatos = itensDaCotacao(daEmpresa, {
    subcategoriaId: subcategoria === TODOS ? "" : subcategoria,
    niveis,
  });
  const escolhidos = candidatos.filter((l) => marcados[l.itemId] !== false);
  const quantidadeDe = (l: LinhaSugestaoEpi) =>
    quantidades[l.itemId] ?? Math.max(1, l.quantidadeSugerida);

  function abrirRelatorio() {
    setPasso("criterios");
    setSubcategoria(TODOS);
    setMarcados({});
    setQuantidades({});
    setAberto(true);
  }
  function alternarNivel(n: StatusCriticidade) {
    setNiveis((atuais) => (atuais.includes(n) ? atuais.filter((x) => x !== n) : [...atuais, n]));
  }
  const linhasDaCotacao = (): LinhaCotacao[] =>
    escolhidos.map((l) => ({
      codigo: l.codigo,
      descricao: l.descricao,
      ca: l.ca ?? "",
      empresa: nomeDaEmpresa(l.empresaId),
      quantidade: quantidadeDe(l),
      estoque: l.total,
      status: rotuloDoStatus(l.status),
    }));
  const criterio = () =>
    `Subcategoria: ${subcategoria === TODOS ? "todas" : nomeDaSubcategoria(subcategoria)} · Criticidade: ${niveis.map((n) => STATUS_CRITICIDADE[n].rotulo).join(", ")}`;
  function gerarPdf() {
    const empresa = empresaFiltro === TODOS ? "Todas as empresas" : nomeDaEmpresa(empresaFiltro);
    abrirDocumento({
      titulo: "Cotação de preços",
      html: montarCotacaoHtml({
        linhas: linhasDaCotacao(),
        criterio: criterio(),
        empresa,
        geradoEm: new Date(),
        comCa: modulo === "epi",
      }),
      arquivo: nomeArquivoDocumento("Cotacao de precos", empresa, hojeBrasilia()),
    });
  }
  function gerarExcel() {
    const blob = new Blob(["﻿" + montarCotacaoExcel(linhasDaCotacao(), modulo === "epi")], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Cotacao-de-precos-${hojeBrasilia()}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-4" aria-label="Sugestão de compras">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-3xl text-sm text-muted-foreground">
          Para comprar, o estoque de novos e de usados é um só. O status vem dos parâmetros de{" "}
          <Link
            to="/cadastros/gerais/categorias"
            search={modulo === "epi" ? { de: "epi", voltar: "sugestao-compras" } : { de: "uniformes", voltar: "sugestao-uniformes" }}
            className="font-medium text-primary underline underline-offset-2"
          >
            Parâmetros Específicos
          </Link>{" "}
(
          {parametrosCompra.metodo === "cobertura"
            ? `tempo de cobertura, reposição de ${parametrosCompra.prazoReposicao} dias`
            : "estoque mínimo"}
          ).
        </p>
      </div>

      {/* Busca e filtros à esquerda, botões à direita (decisão 406). */}
      <div className="flex flex-wrap items-end gap-2">
        <BarraDeFiltros>
        <div className="w-56 space-y-1">
          <Label htmlFor="sug-empresa">Empresa</Label>
          <Select value={empresaFiltro} onValueChange={setEmpresaFiltro}>
            <SelectTrigger id="sug-empresa">
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
        <div className="w-72 space-y-1">
          <Label htmlFor="sug-palavra">Palavra-chave</Label>
          <Input
            id="sug-palavra"
            placeholder={modulo === "epi" ? "Código, descrição ou CA" : "Código ou descrição"}
            value={palavra}
            onChange={(e) => setPalavra(e.target.value)}
          />
        </div>
        </BarraDeFiltros>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={abrirRelatorio}>
            Gerar relatório
          </Button>
          <EstoqueMinimoEpi rotulo={modulo === "epi" ? "EPIs" : "uniformes"} linhas={filtrarSugestaoEpi(alertasMinimo, { palavra })} empresas={empresasParaEscolha(empresas).filter((e) => empresaFiltro === TODOS || e.id === empresaFiltro)} />
          <Button
            type="button"
            variant="outline"
            disabled={filtradas.length === 0}
            onClick={() =>
              exportarCsv(
                `sugestao-compras-${modulo}`,
                filtradas.map((l) => ({
                  Descrição: l.descricao,
                  Empresa: nomeDaEmpresa(l.empresaId),
                  "Estoque novos": l.novos,
                  "Estoque usados": l.usados,
                  "Estoque total": l.total,
                  "Média de consumo mensal": Number(l.mediaMensal.toFixed(2)),
                  "Tempo de cobertura (dias)": l.cobertura ?? "Sem consumo",
                  "Status de criticidade": rotuloDoStatus(l.status),
                })),
              )
            }
          >
            Exportar CSV
          </Button>
        </div>
      </div>

      <LegendaStatusCompra parametros={parametrosCompra} />

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead className="text-right">Estoque novos</TableHead>
              <TableHead className="text-right">Estoque usados</TableHead>
              <TableHead className="text-right">Estoque total</TableHead>
              <TableHead className="text-right">Média de consumo mensal</TableHead>
              <TableHead className="text-right">Tempo de cobertura (dias)</TableHead>
              <TableHead>Status de criticidade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8}>Carregando…</TableCell>
              </TableRow>
            ) : filtradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-6 text-center text-muted-foreground">
                  Nenhum {rotulo} encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtradas.map((l) => (
                <TableRow key={l.itemId}>
                  <TableCell>
                    <span className="font-mono text-xs text-muted-foreground">{l.codigo}</span>{" "}
                    {l.descricao}
                  </TableCell>
                  <TableCell>{nomeDaEmpresa(l.empresaId)}</TableCell>
                  <TableCell className="text-right">{l.novos}</TableCell>
                  <TableCell className="text-right">{l.usados}</TableCell>
                  <TableCell className="text-right font-semibold">{l.total}</TableCell>
                  <TableCell className="text-right">
                    {l.mediaMensal.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">
                    {l.cobertura === null ? "Sem consumo" : l.cobertura.toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <EtiquetaStatusCompra status={l.status} parametros={parametrosCompra} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Relatório de cotação de preços</DialogTitle>
            <DialogDescription>
              {passo === "criterios"
                ? "Escolha a subcategoria e os níveis de criticidade que você quer comprar."
                : "Marque os itens que entram na cotação e ajuste as quantidades."}
            </DialogDescription>
          </DialogHeader>

          {passo === "criterios" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setPasso("itens");
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="cot-sub">Subcategoria</Label>
                <Select value={subcategoria} onValueChange={setSubcategoria}>
                  <SelectTrigger id="cot-sub">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TODOS}>Todas as subcategorias</SelectItem>
                    {subcategoriasPresentes.map((s) => (
                      <SelectItem key={s.id || "sem"} value={s.id || "sem-subcategoria"}>
                        {s.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">
                  Nível de criticidade que quero comprar
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {NIVEIS.map((n) => (
                    <label key={n} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={niveis.includes(n)}
                        onCheckedChange={() => alternarNivel(n)}
                        aria-label={STATUS_CRITICIDADE[n].rotulo}
                      />
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${CLASSE_STATUS[n]}`}
                      >
                        {STATUS_CRITICIDADE[n].rotulo}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {STATUS_QUE_PEDEM_COMPRA.includes(n) ? "" : "(não pede compra)"}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAberto(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={niveis.length === 0}>
                  Confirmar
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{criterio()}</p>
              {candidatos.length === 0 ? (
                <p className="rounded-lg border p-3 text-sm text-muted-foreground">
                  Nenhum item atende aos critérios escolhidos.
                </p>
              ) : (
                <div className="panel overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            aria-label="Selecionar todos"
                            checked={
                              escolhidos.length === candidatos.length
                                ? true
                                : escolhidos.length === 0
                                  ? false
                                  : "indeterminate"
                            }
                            onCheckedChange={(v) =>
                              setMarcados(
                                Object.fromEntries(candidatos.map((l) => [l.itemId, v === true])),
                              )
                            }
                          />
                        </TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead className="text-right">Estoque total</TableHead>
                        <TableHead>Criticidade</TableHead>
                        <TableHead className="w-28 text-right">Quantidade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {candidatos.map((l) => (
                        <TableRow key={l.itemId}>
                          <TableCell>
                            <Checkbox
                              aria-label={`Incluir ${l.descricao}`}
                              checked={marcados[l.itemId] !== false}
                              onCheckedChange={(v) =>
                                setMarcados((a) => ({ ...a, [l.itemId]: v === true }))
                              }
                            />
                          </TableCell>
                          <TableCell>{l.descricao}</TableCell>
                          <TableCell>{nomeDaEmpresa(l.empresaId)}</TableCell>
                          <TableCell className="text-right">{l.total}</TableCell>
                          <TableCell>
                            <EtiquetaStatusCompra status={l.status} parametros={parametrosCompra} />
                          </TableCell>
                          <TableCell>
                            <Input
                              aria-label={`Quantidade de ${l.descricao}`}
                              type="number"
                              min={1}
                              step={1}
                              className="text-right"
                              value={quantidadeDe(l)}
                              onChange={(e) =>
                                setQuantidades((a) => ({
                                  ...a,
                                  [l.itemId]: Math.max(1, Math.round(Number(e.target.value)) || 1),
                                }))
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPasso("criterios")}>
                  Voltar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={escolhidos.length === 0}
                  onClick={gerarExcel}
                >
                  Gerar Excel
                </Button>
                <Button type="button" disabled={escolhidos.length === 0} onClick={gerarPdf}>
                  Gerar PDF ({escolhidos.length})
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
