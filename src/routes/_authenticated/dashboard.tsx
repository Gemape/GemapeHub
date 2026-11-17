import { useQuery } from "@tanstack/react-query";
import { LinhasEsqueleto } from "@/components/Esqueletos";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, Boxes, Building2, Car, Users, Wallet } from "lucide-react";

import { GradeDeCartoes } from "@/components/GradeDeCartoes";
import { RelatorioPainelDialog, type RelatorioDoPainel } from "@/components/RelatorioPainelDialog";
import { RelatorioEmpresaDialog } from "@/components/RelatorioEmpresaDialog";
import { PainelKpisDialog, type CardDoPainel } from "@/components/PainelKpisDialog";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { lerTodas } from "@/lib/ler-todas";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { empregadoAtivo } from "@/lib/empregados";
import { formatarMoeda, valorTotalEmEstoque, MODULO_LABEL, type Modulo } from "@/lib/gemape";
import { useVeiculos } from "@/lib/hooks-gemape";
import { faixaDoIndice, lerFaixasDeVeiculos } from "@/lib/faixas-desempenho";
import { lerOcorrenciasVeiculo } from "@/lib/ocorrencias-veiculo";
import { kpisDeEmpregados, kpisDeItens, kpisDeValor, kpisDeVeiculos } from "@/lib/painel-kpis";
import { TAMANHO_DISPONIVEL } from "@/components/SeletorTamanho";
import { alertasDeMinimoEpi } from "@/lib/estoque-epi-saldos";
import { controlaModulo } from "@/lib/estoque-tamanho";
import { estadoGravado, linhasDeAlertaEstoque, ROTULO_NIVEL, type ModuloEstoque } from "@/lib/alertas-estoque";
import { useParametrosBase } from "@/lib/use-parametros-base";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard consolidado | Patrimônio GEMAPE" },
      {
        name: "description",
        content:
          "Visão consolidada do patrimônio do grupo GEMAPE: total por categoria, valor em estoque, alertas críticos e distribuição por empresa.",
      },
      { property: "og:title", content: "Dashboard consolidado | Patrimônio GEMAPE" },
      {
        property: "og:description",
        content: "Indicadores consolidados de EPIs, uniformes, ferramentas e veículos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardGeral,
});

const MODULOS: Modulo[] = ["epi", "uniforme", "ferramenta"];

// O card do alto abre os KPIs dele (PainelKpisDialog): vira botão, com o mesmo foco visível dos outros cartões clicáveis.
// Enter e espaço abrem, como num botão (o card tem blocos e tabelas dentro, que não cabem em <button>).
const teclaDeAbrir = (abrir: () => void) => (ev: React.KeyboardEvent) => {
  if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); abrir(); }
};

function CardClicavel({ rotulo, onAbrir, children, classe = "" }: { rotulo: string; onAbrir: () => void; children: ReactNode; classe?: string }) {
  return (
    <div role="button" tabIndex={0} aria-label={`${rotulo}: ver relatório`} onClick={onAbrir} onKeyDown={teclaDeAbrir(onAbrir)} className={`block h-full w-full cursor-pointer rounded-2xl text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${classe}`}>
      {children}
    </div>
  );
}

function DashboardGeral() {
  const { empresas, empresaId } = useEmpresa();
  const { data: veiculos = [] } = useVeiculos(empresaId);
  const [cardAberto, setCardAberto] = useState<CardDoPainel | null>(null);
  const [empresaAberta, setEmpresaAberta] = useState<string | null>(null);
  const [quadroAberto, setQuadroAberto] = useState<RelatorioDoPainel | null>(null);

  const { data: itens = [], isLoading: carregandoItens } = useQuery({
    queryKey: ["itens-todos", empresaId],
    staleTime: 60_000,
    queryFn: async () => {
      const basicas = "id, empresa_id, nome, estoque_atual, estoque_minimo, preco_unitario";
      // Saldo e mínimo por tamanho (decisão 23) só existem no modo demonstração, que lê tudo;
      // o banco real continua recebendo só as colunas de sempre.
      const colunas = (TAMANHO_DISPONIVEL ? "*" : basicas) as typeof basicas;

      // Lê tudo (o servidor corta em 1000 linhas e o valor em estoque ficaria subcontado).
      const ler = (tabela: "epis" | "uniformes" | "ferramentas") =>
        lerTodas<{ id: string; empresa_id: string | null; nome: string; estoque_atual: number; estoque_minimo: number; preco_unitario: number }>(
          () => {
            const q = supabase.from(tabela).select(colunas);
            return empresaId !== TODAS ? q.eq("empresa_id", empresaId) : q;
          },
          (q) => q.order("id"),
        );
      const [episLidos, uniformesLidos, ferramentasLidas] = await Promise.all([ler("epis"), ler("uniformes"), ler("ferramentas")]);

      const epis = episLidos.map((i) => ({ ...i, modulo: "epi" as const }));
      const uniformes = uniformesLidos.map((i) => ({
        ...i,
        modulo: "uniforme" as const,
      }));
      const ferramentas = ferramentasLidas.map((i) => ({
        ...i,
        modulo: "ferramenta" as const,
      }));

      return [...epis, ...uniformes, ...ferramentas];
    },
  });

  const { data: empregadosAtivos = [] } = useQuery({
    queryKey: ["empregados-total", empresaId],
    staleTime: 60_000,
    queryFn: async () => {
      // Conta só quem está ativo hoje: demissão futura conta, demissão vencida não.
      const data = await lerTodas<{ ativo: boolean; data_demissao: string | null; empresa_id: string | null }>(
        () => {
          const q = supabase.from("empregados").select("ativo,data_demissao,empresa_id").eq("ativo", true);
          return empresaId !== TODAS ? q.eq("empresa_id", empresaId) : q;
        },
        (q) => q.order("id"),
      );
      return data.filter((e) => empregadoAtivo(e));
    },
  });

  const totalEmpregados = empregadosAtivos.length;
  const valorTotal = valorTotalEmEstoque(itens);
  // Alertas de estoque: a mesma contagem da tela inicial e da coluna Alerta das telas de Estoque, uma linha por item e tamanho, separada por tipo.
  const parametros = useParametrosBase();
  const TIPOS_ALERTA: { modulo: ModuloEstoque; rotulo: string }[] = [{ modulo: "epi", rotulo: "EPI" }, { modulo: "uniforme", rotulo: "Uniforme" }, { modulo: "ferramenta", rotulo: "Ferramenta" }];
  const linhasEstoque = TIPOS_ALERTA.flatMap(({ modulo }) =>
    linhasDeAlertaEstoque(itens.filter((i) => i.modulo === modulo), modulo, (i) =>
      TAMANHO_DISPONIVEL && modulo !== "ferramenta" && controlaModulo(modulo)
        // Mesma regra da aba Estoque e do botão Estoque mínimo (decisão 417): um alerta por tamanho.
        ? (() => { const alertas = alertasDeMinimoEpi(parametros, i as never, modulo); return { saldo: 0, minimo: 0, alerta: alertas.length > 0, alertas }; })()
        : estadoGravado(i as never)),
  );
  const alertasPorTipo = TIPOS_ALERTA.map((t) => ({ ...t, linhas: linhasEstoque.filter((l) => l.modulo === t.modulo) }));
  const idsCriticos = new Set(linhasEstoque.map((l) => l.itemId));
  const criticos = itens.filter((i) => idsCriticos.has(i.id));

  const porModulo = MODULOS.map((m) => {
    const doModulo = itens.filter((i) => i.modulo === m);
    return {
      modulo: m,
      itens: doModulo.length,
      unidades: doModulo.reduce((s, i) => s + (i.estoque_atual ?? 0), 0),
      valor: valorTotalEmEstoque(doModulo),
    };
  });

  // As ocorrências ficam no navegador: relê quando a lista de veículos muda e a cada card aberto, para o número não ficar velho.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ocorrenciasDeVeiculos = useMemo(() => lerOcorrenciasVeiculo(), [veiculos, cardAberto, empresaAberta, quadroAberto]);
  // Uma linha por alerta (EPI e uniforme alertam por tamanho): os relatórios dos quadros e das empresas listam as mesmas linhas.
  const linhasDeAlerta = linhasEstoque.map((l) => ({
    id: l.itemId, nome: l.nome, modulo: l.modulo, empresaId: l.empresaId,
    estoque: l.tamanho ? `${l.tamanho}: ${l.saldo}` : String(l.saldo),
    minimo: l.tamanho ? `${l.tamanho}: ${l.minimo}` : String(l.minimo),
  }));
  const empresasDoPainel = empresas.map((e) => ({ id: e.id, nome: e.nome_fantasia }));
  const kpis = {
    itens: kpisDeItens(itens, new Set(criticos.map((i) => i.id)), empresasDoPainel),
    valor: kpisDeValor(itens, empresasDoPainel),
    veiculos: kpisDeVeiculos(veiculos, ocorrenciasDeVeiculos, empresasDoPainel),
    empregados: kpisDeEmpregados(empregadosAtivos, itens, empresasDoPainel),
  };

  // Faixas (verde, amarelo, vermelho) dos mesmos limites dos indicadores da Frota.
  const faixas = lerFaixasDeVeiculos();
  const pctSemAlerta = kpis.itens.pctAbaixoMinimo === null ? null : Math.round((100 - kpis.itens.pctAbaixoMinimo) * 10) / 10;
  const porcento = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3 [&>:not(:first-child)]:ml-auto">
        <div className="min-w-0 flex-1 basis-[28rem]">
          <p className="text-eyebrow">Visão consolidada</p>
          <h1 className="text-2xl font-bold">Patrimônio do grupo GEMAPE</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Indicadores de EPIs, uniformes, ferramentas e veículos das três unidades.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/relatorios">Relatórios</Link>
        </Button>
      </header>

      <GradeDeCartoes colunas={4}>
        <CardClicavel rotulo="Itens cadastrados" onAbrir={() => setCardAberto("itens")}>
          <StatCard
            titulo="Itens cadastrados"
            subtitulo="Itens sem alerta de estoque ÷ itens cadastrados."
            valor={kpis.itens.total}
            pct={pctSemAlerta}
            faixa={faixaDoIndice(pctSemAlerta, faixas)?.faixa ?? null}
            detalhe={`${kpis.itens.unidades.toLocaleString("pt-BR")} unidades · ${kpis.itens.abaixoMinimo} em alerta`}
            icone={Boxes}
          />
        </CardClicavel>
        <CardClicavel rotulo="Valor total em estoque" onAbrir={() => setCardAberto("valor")}>
          <StatCard
            titulo="Valor total em estoque"
            subtitulo="Estoque atual × preço de cada item."
            valor={formatarMoeda(valorTotal)}
            detalhe={`${formatarMoeda(kpis.valor.valorMedioPorUnidade)} por unidade em média`}
            icone={Wallet}
          />
        </CardClicavel>
        <CardClicavel rotulo="Veículos" onAbrir={() => setCardAberto("veiculos")}>
          <StatCard
            titulo="Veículos"
            subtitulo="Veículos ativos ÷ veículos cadastrados."
            valor={veiculos.length}
            pct={kpis.veiculos.pctAtivos}
            faixa={faixaDoIndice(kpis.veiculos.pctAtivos, faixas)?.faixa ?? null}
            detalhe={`${kpis.veiculos.ativos} ativos de ${veiculos.length}`}
            icone={Car}
          />
        </CardClicavel>
        <CardClicavel rotulo="Empregados ativos" onAbrir={() => setCardAberto("empregados")}>
          <StatCard
            titulo="Empregados ativos"
            subtitulo="Somente colaboradores em atividade."
            valor={totalEmpregados}
            detalhe={kpis.empregados.unidadesDeVestuarioPorEmpregado === null ? "Sem empregados ativos" : `${kpis.empregados.unidadesDeVestuarioPorEmpregado.toLocaleString("pt-BR")} un. de EPI e uniforme por empregado`}
            icone={Users}
          />
        </CardClicavel>
      </GradeDeCartoes>
      <PainelKpisDialog card={cardAberto} kpis={kpis} onFechar={() => setCardAberto(null)} />
      <RelatorioPainelDialog relatorio={quadroAberto} itens={itens} alertas={linhasDeAlerta} empresas={empresasDoPainel} totalVeiculos={veiculos.length} onFechar={() => setQuadroAberto(null)} />
      <RelatorioEmpresaDialog
        empresa={empresasDoPainel.find((e) => e.id === empresaAberta) ?? null}
        itens={itens} alertas={linhasDeAlerta} criticos={new Set(criticos.map((i) => i.id))} veiculos={veiculos} ocorrencias={ocorrenciasDeVeiculos} empregados={empregadosAtivos}
        onFechar={() => setEmpresaAberta(null)}
      />

      <div className="grid items-stretch gap-4 lg:grid-cols-5">
        <CardClicavel rotulo="Patrimônio por categoria" onAbrir={() => setQuadroAberto("categorias")} classe="lg:col-span-2">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Boxes className="size-4" /> Patrimônio por categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Itens</TableHead>
                  <TableHead className="text-right">Unidades</TableHead>
                  <TableHead className="min-w-36 text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carregandoItens ? <LinhasEsqueleto colunas={4} linhas={3} /> : porModulo.map((linha) => {
                  const parte = valorTotal > 0 ? (linha.valor / valorTotal) * 100 : 0;
                  return (
                    <TableRow key={linha.modulo}>
                      <TableCell className="font-medium">{MODULO_LABEL[linha.modulo]}</TableCell>
                      <TableCell className="text-right">{linha.itens}</TableCell>
                      <TableCell className="text-right">{linha.unidades.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right">
                        {formatarMoeda(linha.valor)}
                        <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-muted" role="presentation">
                          <span className="block h-full rounded-full bg-primary" style={{ width: `${parte}%` }} />
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow>
                  <TableCell className="font-medium">Veículos</TableCell>
                  <TableCell className="text-right">{veiculos.length}</TableCell>
                  <TableCell className="text-right">—</TableCell>
                  <TableCell className="text-right">—</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        </CardClicavel>

        <CardClicavel rotulo="Alertas críticos" onAbrir={() => setQuadroAberto("alertas")} classe="lg:col-span-3">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-destructive" /> Alertas críticos
              {linhasEstoque.length > 0 && <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-950 dark:text-red-200">{linhasEstoque.length} alerta(s)</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <ul aria-label="Alertas por tipo" className="mb-3 flex flex-wrap gap-2 text-xs">
              {alertasPorTipo.map((t) => {
                const abaixo = t.linhas.filter((l) => l.nivel === "abaixo").length;
                return (
                  <li key={t.modulo} className="rounded-full border px-2.5 py-1">
                    <span className="font-semibold">{t.rotulo}: {t.linhas.length}</span>
                    {t.linhas.length > 0 && <span className="text-muted-foreground"> ({abaixo} abaixo · {t.linhas.length - abaixo} no mínimo)</span>}
                  </li>
                );
              })}
            </ul>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                  <TableHead className="text-right">Mínimo</TableHead>
                  <TableHead>Nível</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhasEstoque.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhum item abaixo do estoque mínimo.
                    </TableCell>
                  </TableRow>
                ) : (
                  alertasPorTipo.flatMap((t) => [...t.linhas].sort((x, y) => (x.nivel === y.nivel ? 0 : x.nivel === "abaixo" ? -1 : 1))).slice(0, 10).map((l) => (
                    <TableRow key={l.chave}>
                      <TableCell className="font-medium">{l.nome}{l.tamanho ? ` · ${l.tamanho}` : ""}</TableCell>
                      <TableCell>{MODULO_LABEL[l.modulo as Modulo] ?? l.modulo}</TableCell>
                      <TableCell className="text-right">{l.saldo}</TableCell>
                      <TableCell className="text-right">{l.minimo}</TableCell>
                      <TableCell className={l.nivel === "abaixo" ? "font-bold text-destructive" : "font-bold text-amber-600 dark:text-amber-400"}>{ROTULO_NIVEL[l.nivel]}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {linhasEstoque.length > 10 && <p className="mt-2 text-xs text-muted-foreground">Mostrando 10 de {linhasEstoque.length}. Clique no quadro para ver a lista completa.</p>}
          </CardContent>
        </Card>
        </CardClicavel>
      </div>

      <section aria-label="Distribuição por empresa" className="space-y-3">
        <h2 className="flex items-center gap-2 text-base font-semibold"><Building2 className="size-4" /> Distribuição por empresa</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {empresas.map((empresa) => {
            const valorEmpresa = kpis.valor.porEmpresa.find((e) => e.id === empresa.id);
            const itensEmpresa = kpis.itens.porEmpresa.find((e) => e.id === empresa.id);
            const veiculosEmpresa = kpis.veiculos.porEmpresa.find((e) => e.id === empresa.id);
            const equipe = kpis.empregados.porEmpresa.find((e) => e.id === empresa.id);
            return (
              <div role="button" tabIndex={0} key={empresa.id} onClick={() => setEmpresaAberta(empresa.id)} onKeyDown={teclaDeAbrir(() => setEmpresaAberta(empresa.id))} aria-label={`Abrir o relatório de ${empresa.nome_fantasia}`} className="flex h-full w-full cursor-pointer flex-col gap-3 rounded-2xl border bg-card p-4 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-eyebrow">{empresa.nome_fantasia}</p>
                    <p className="mt-1 break-words font-display text-2xl font-bold leading-none">{formatarMoeda(valorEmpresa?.valor ?? 0)}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Valor em estoque · {porcento(valorEmpresa?.pct ?? null)} do grupo</p>
                  </div>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-4 ring-white/70 dark:ring-white/10"><Building2 className="size-5" aria-hidden="true" /></span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/15" role="presentation">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${valorEmpresa?.pct ?? 0}%` }} />
                </div>
                <dl className="grid grid-cols-4 gap-2 text-center">
                  {[
                    ["Itens", itensEmpresa?.itens ?? 0],
                    ["Em alerta", itensEmpresa?.abaixoMinimo ?? 0],
                    ["Veículos", veiculosEmpresa?.total ?? 0],
                    ["Equipe", equipe?.ativos ?? 0],
                  ].map(([rotulo, n]) => (
                    <div key={rotulo} className="rounded-xl bg-muted/50 px-1 py-2">
                      <dd className="font-display text-lg font-bold leading-none">{n}</dd>
                      <dt className="mt-1 text-[11px] text-muted-foreground">{rotulo}</dt>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
