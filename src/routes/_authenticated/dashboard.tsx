import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Boxes, Building2, Car, Users, Wallet } from "lucide-react";

import { GradeDeCartoes } from "@/components/GradeDeCartoes";
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
import { TAMANHO_DISPONIVEL } from "@/components/SeletorTamanho";
import { alertasDeMinimoEpi } from "@/lib/estoque-epi-saldos";
import { controlaModulo } from "@/lib/estoque-tamanho";
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

function DashboardGeral() {
  const { empresas, empresaId } = useEmpresa();
  const { data: veiculos = [] } = useVeiculos(empresaId);

  const { data: itens = [] } = useQuery({
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

  const { data: totalEmpregados = 0 } = useQuery({
    queryKey: ["empregados-total", empresaId],
    staleTime: 60_000,
    queryFn: async () => {
      // Conta só quem está ativo hoje: demissão futura conta, demissão vencida não.
      const data = await lerTodas<{ ativo: boolean; data_demissao: string | null }>(
        () => {
          const q = supabase.from("empregados").select("ativo,data_demissao").eq("ativo", true);
          return empresaId !== TODAS ? q.eq("empresa_id", empresaId) : q;
        },
        (q) => q.order("id"),
      );
      return data.filter((e) => empregadoAtivo(e)).length;
    },
  });

  const valorTotal = valorTotalEmEstoque(itens);
  // EPI e uniforme com tamanho e mínimo por tamanho alertam por tamanho; os demais, pelo total.
  const parametros = useParametrosBase();
  const alertasDe = (i: (typeof itens)[number]) => {
    if (!TAMANHO_DISPONIVEL || !controlaModulo(i.modulo)) return null;
    // Mesma regra da aba Estoque e do botão Estoque mínimo (decisão 417): um alerta por tamanho.
    return alertasDeMinimoEpi(parametros, i as never, i.modulo as "epi" | "uniforme");
  };
  const criticos = itens.filter((i) => {
    const alertas = alertasDe(i);
    return alertas ? alertas.length > 0 : (i.estoque_atual ?? 0) <= (i.estoque_minimo ?? 0);
  });

  const porModulo = MODULOS.map((m) => {
    const doModulo = itens.filter((i) => i.modulo === m);
    return {
      modulo: m,
      itens: doModulo.length,
      unidades: doModulo.reduce((s, i) => s + (i.estoque_atual ?? 0), 0),
      valor: valorTotalEmEstoque(doModulo),
    };
  });

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
        <StatCard
          titulo="Itens cadastrados"
          subtitulo="Itens do cadastro e as unidades em estoque."
          valor={itens.length}
          detalhe={`${itens.reduce((s, i) => s + (i.estoque_atual ?? 0), 0)} unidades`}
          icone={Boxes} compacto
        />
        <StatCard
          titulo="Valor total em estoque"
          subtitulo="Estoque atual × preço de cada item."
          valor={formatarMoeda(valorTotal)}
          icone={Wallet} compacto
        />
        <StatCard
          titulo="Veículos"
          subtitulo="Veículos cadastrados e quantos estão ativos."
          valor={veiculos.length}
          detalhe={`${veiculos.filter((v) => v.status === "Ativo").length} ativos`}
          icone={Car} compacto
        />
        <StatCard
          titulo="Empregados ativos"
          subtitulo="Somente colaboradores em atividade."
          valor={totalEmpregados}
          icone={Users} compacto
        />
      </GradeDeCartoes>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Patrimônio por categoria</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Itens</TableHead>
                  <TableHead className="text-right">Unidades</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porModulo.map((linha) => (
                  <TableRow key={linha.modulo}>
                    <TableCell>{MODULO_LABEL[linha.modulo]}</TableCell>
                    <TableCell className="text-right">{linha.itens}</TableCell>
                    <TableCell className="text-right">{linha.unidades}</TableCell>
                    <TableCell className="text-right">{formatarMoeda(linha.valor)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell>Veículos</TableCell>
                  <TableCell className="text-right">{veiculos.length}</TableCell>
                  <TableCell className="text-right">—</TableCell>
                  <TableCell className="text-right">—</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-destructive" /> Alertas críticos
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                  <TableHead className="text-right">Mínimo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {criticos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Nenhum item abaixo do estoque mínimo.
                    </TableCell>
                  </TableRow>
                ) : (
                  criticos.slice(0, 10).map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>{i.nome}</TableCell>
                      <TableCell>{MODULO_LABEL[i.modulo as Modulo] ?? i.modulo}</TableCell>
                      <TableCell className="text-right">
                        {alertasDe(i)?.map((a) => `${a.nome}: ${a.saldo}`).join(" · ") ??
                          i.estoque_atual}
                      </TableCell>
                      <TableCell className="text-right">
                        {alertasDe(i)?.map((a) => `${a.nome}: ${a.minimo}`).join(" · ") ??
                          i.estoque_minimo}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-4" /> Distribuição por empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            {empresas.map((empresa) => {
              const doGrupo = itens.filter((i) => i.empresa_id === empresa.id);
              return (
                <div key={empresa.id} className="rounded-md border p-4">
                  <p className="text-eyebrow">{empresa.nome_fantasia}</p>
                  <p className="mt-1 font-display text-xl font-bold">{doGrupo.length} itens</p>
                  <p className="text-xs text-muted-foreground">
                    {formatarMoeda(valorTotalEmEstoque(doGrupo))} em estoque
                    · {veiculos.filter((v) => v.empresa_id === empresa.id).length} veículos
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
