import { GradeDeCartoes } from "@/components/GradeDeCartoes";
import { BarraDeFiltros } from "@/components/layout/BarraDeFiltros";
import { Banknote, Droplets, Fuel, Gauge } from "lucide-react";
import { EscolherCamposRelatorio } from "@/components/EscolherCamposRelatorio";
import { StatCard } from "@/components/StatCard";
import { useMemo, useState } from "react";
import { EstadoVazio } from "@/components/EstadoVazio";

import { NovoAbastecimentoDialog } from "@/components/modules/NovoAbastecimentoDialog";
import { rotuloDoVeiculo } from "@/components/modules/rotulo-veiculo";
import { Button } from "@/components/ui/button";
import { AtalhoPeriodo } from "@/components/AtalhoPeriodo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAccess } from "@/lib/access-context";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { montarExtratoHtml } from "@/lib/extrato-html";
import { historicoAbastecimentos, mediaKmPorLitro } from "@/lib/extrato-veiculo";
import { formatarData } from "@/lib/gemape";
import { useVeiculos } from "@/lib/hooks-gemape";
import { combinaBusca } from "@/lib/parametros-base";
import { removerAbastecimento } from "@/lib/registros-veiculo";
import { useAbastecimentos } from "@/lib/use-registros-veiculo";
import { executar, useParametrosBase } from "@/lib/use-parametros-base";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";

const MODO_DEMO = import.meta.env["VITE_DEMO_MODE"] !== "false";
const TODOS = "todos";

const reais = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const numero = (n: number) => n.toLocaleString("pt-BR");

// Colunas do Relatório (decisão 378), na ordem da tabela da tela; o usuário escolhe quais saem.
type LinhaDoRelatorio = { data: string; hora?: string | null; km: number; kmRodados: number | null; litros: number; valor?: number | null; precoLitro?: number | null; kmPorLitro: number | null };
const COLUNAS_RELATORIO: { id: string; titulo: string; direita?: boolean; valor: (a: LinhaDoRelatorio) => string }[] = [
  { id: "data", titulo: "Data e hora", valor: (a) => `${formatarData(a.data)}${a.hora ? ` ${a.hora}` : ""}` },
  { id: "km", titulo: "Km", direita: true, valor: (a) => numero(a.km) },
  { id: "kmRodados", titulo: "Km rodados", direita: true, valor: (a) => (a.kmRodados === null ? "—" : numero(a.kmRodados)) },
  { id: "litros", titulo: "Litros", direita: true, valor: (a) => a.litros.toLocaleString("pt-BR") },
  { id: "valor", titulo: "Valor", direita: true, valor: (a) => reais(a.valor) },
  { id: "precoLitro", titulo: "R$/L", direita: true, valor: (a) => reais(a.precoLitro) },
  { id: "kmPorLitro", titulo: "Km/L", direita: true, valor: (a) => (a.kmPorLitro === null ? "—" : a.kmPorLitro.toLocaleString("pt-BR", { maximumFractionDigits: 1 })) },
];
const OPCOES_RELATORIO = [
  { id: "resumo", rotulo: "Resumo no topo (veículos, abastecimentos, litros, total gasto e média)" },
  { id: "totais", rotulo: "Total de cada veículo abaixo da tabela" },
];

// Módulos > Veículos > Abastecimento (decisão 58): escolhe o veículo (a tela já traz o km do
// último abastecimento), informa data, hora, km (nunca menor que o anterior), litros e valor em
// reais. O histórico por veículo mostra o trecho rodado, o km/L e o R$/L de cada abastecimento.
// Só modo demonstração; nada no Supabase.
export function AbastecimentoVeiculoModulo() {
  const { empresaId, empresas } = useEmpresa();
  const { isAdmin } = useAccess();
  const parametros = useParametrosBase();
  const { data: veiculos = [] } = useVeiculos(empresaId);
  const todos = useAbastecimentos();
  const [aberto, setAberto] = useState(false);
  const [filtro, setFiltro] = useState(TODOS);
  const [busca, setBusca] = useState("");
  // Período da lista e do PDF (AAAA-MM-DD, as duas pontas valem); vazio = sem limite daquele lado (decisão 306).
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const periodoInvalido = !!inicio && !!fim && inicio > fim;

  const idsDaEmpresa = new Set(veiculos.map((v) => v.id));
  const daEmpresa = todos.filter((a) => idsDaEmpresa.has(a.veiculoId));
  const veiculo = (id: string) => veiculos.find((v) => v.id === id);
  const filtroValido = filtro === TODOS || idsDaEmpresa.has(filtro) ? filtro : TODOS;

  // Histórico de cada veículo (o trecho só faz sentido dentro do mesmo veículo), do mais recente ao mais antigo.
  const linhas = useMemo(
    () =>
      veiculos
        .filter((v) => filtroValido === TODOS || v.id === filtroValido)
        .flatMap((v) => historicoAbastecimentos(daEmpresa.filter((a) => a.veiculoId === v.id)))
        // O período corta depois de montar o histórico: o trecho e o km/L de cada abastecimento continuam contando com o anterior, mesmo fora do período.
        .filter((a) => !periodoInvalido && (!inicio || a.data >= inicio) && (!fim || a.data <= fim))
        .filter((a) => {
          const v = veiculos.find((x) => x.id === a.veiculoId);
          return combinaBusca(busca, v ? rotuloDoVeiculo(parametros, v) : "", formatarData(a.data), a.hora, String(a.km), numero(a.km), String(a.litros), a.litros.toLocaleString("pt-BR"), a.valor ? `${a.valor} ${reais(a.valor)}` : "");
        })
        .sort((a, b) => `${b.data}T${b.hora ?? "00:00"}`.localeCompare(`${a.data}T${a.hora ?? "00:00"}`) || b.km - a.km),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [veiculos, todos, filtroValido, busca, parametros, inicio, fim, periodoInvalido],
  );
  const doFiltro = filtroValido === TODOS ? null : veiculo(filtroValido);
  const [relatorioAberto, setRelatorioAberto] = useState(false);
  const resumo = doFiltro
    ? {
        litros: linhas.reduce((s, a) => s + a.litros, 0),
        gasto: linhas.reduce((s, a) => s + (a.valor ?? 0), 0),
        // A média usa o histórico inteiro do veículo; litros e gasto seguem a busca.
        media: mediaKmPorLitro(daEmpresa.filter((a) => a.veiculoId === doFiltro.id)),
      }
    : null;

  if (!MODO_DEMO) {
    return <p className="text-sm text-muted-foreground">O abastecimento de veículos estará disponível após a Fase 2 (banco real).</p>;
  }

  function abrir() {
    setAberto(true);
  }

  // Relatório de abastecimento por veículo, no padrão dos demais: um quadro por veículo (o trecho e o km/L só valem dentro dele), com os mesmos filtros da
  // tela (veículo escolhido e busca), os totais de cada um e o resumo no topo. Abre direto no visualizador, em tela cheia, onde se gera o PDF.
  function gerarRelatorio(escolhidas: string[], opcoes: string[]) {
    const cols = COLUNAS_RELATORIO.filter((c) => escolhidas.includes(c.id));
    const comResumo = opcoes.includes("resumo");
    const comTotais = opcoes.includes("totais");
    const grupos = veiculos
      .filter((v) => linhas.some((a) => a.veiculoId === v.id))
      .map((v) => {
        const dele = linhas.filter((a) => a.veiculoId === v.id);
        const litros = dele.reduce((t, a) => t + a.litros, 0);
        const gasto = dele.reduce((t, a) => t + (a.valor ?? 0), 0);
        const media = mediaKmPorLitro(daEmpresa.filter((a) => a.veiculoId === v.id));
        return { v, dele, litros, gasto, media };
      });
    const litrosTotal = grupos.reduce((t, g) => t + g.litros, 0);
    const gastoTotal = grupos.reduce((t, g) => t + g.gasto, 0);
    const fmtLitros = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
    const fmtMedia = (m: number | null) => (m === null ? "—" : `${m.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km/L`);
    const unico = grupos.length === 1 ? grupos[0]! : null;
    const assunto = doFiltro ? rotuloDoVeiculo(parametros, doFiltro) : "Todos os veículos";
    const html = montarExtratoHtml({
      titulo: "Relatório de abastecimento",
      assunto,
      subtitulo: [busca.trim() ? `Busca: ${busca.trim()}` : "", inicio || fim ? `Período: ${inicio ? formatarData(inicio) : "desde o início"} a ${fim ? formatarData(fim) : "hoje"}` : ""].filter(Boolean).join(" · ") || "Abastecimentos por veículo",
      empresa: empresaId === TODAS ? "Todas as empresas" : (empresas.find((e) => e.id === empresaId)?.nome_fantasia ?? ""),
      resumo: !comResumo ? [] : [
        ...(unico ? [] : ([["Veículos", String(grupos.length)]] as [string, string][])),
        ["Abastecimentos", String(linhas.length)],
        ["Litros", fmtLitros(litrosTotal)],
        ["Total gasto", reais(gastoTotal)],
        ...(unico ? ([["Média de consumo", fmtMedia(unico.media)]] as [string, string][]) : []),
      ],
      tabelas: grupos.length === 0
        ? [{ titulo: "Abastecimentos", vazio: busca.trim() || inicio || fim ? "Nenhum resultado para a busca e o período." : "Nenhum abastecimento registrado.", colunas: cols.map((c) => ({ titulo: c.titulo })), linhas: [] }]
        : grupos.map((g) => ({
            titulo: rotuloDoVeiculo(parametros, g.v),
            vazio: "Nenhum abastecimento registrado.",
            ...(comTotais ? { nota: `Total: ${g.dele.length} abastecimento(s) · ${fmtLitros(g.litros)} L · ${reais(g.gasto)} · média ${fmtMedia(g.media)}` } : {}),
            colunas: cols.map((c) => ({ titulo: c.titulo, ...(c.direita ? { direita: true } : {}) })),
            linhas: g.dele.map((a) => cols.map((c) => c.valor(a))),
          })),
    });
    abrirDocumento({ titulo: "Relatório de abastecimento", html, arquivo: nomeArquivoDocumento("Relatorio de abastecimento", assunto), telaCheia: true });
    setRelatorioAberto(false);
  }

  function excluir(id: string) {
    if (!confirm("Excluir este abastecimento?")) return;
    executar(() => removerAbastecimento(id), "Abastecimento excluído");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <BarraDeFiltros>
          <div className="space-y-1.5">
            <Label htmlFor="filtro_veiculo">Histórico por veículo</Label>
            <Select value={filtroValido} onValueChange={setFiltro}>
              <SelectTrigger id="filtro_veiculo" className="w-80 max-w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos os veículos</SelectItem>
                {veiculos.map((v) => <SelectItem key={v.id} value={v.id}>{rotuloDoVeiculo(parametros, v)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Input
            aria-label="Buscar abastecimento"
            placeholder="Buscar por veículo, data ou km"
            className="max-w-xs"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <div className="space-y-1.5">
            <Label htmlFor="abastecimento-inicio">Data início</Label>
            <Input id="abastecimento-inicio" type="date" className="w-40" value={inicio} max={fim || undefined} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="abastecimento-fim">Data fim</Label>
            <Input id="abastecimento-fim" type="date" className="w-40" value={fim} min={inicio || undefined} onChange={(e) => setFim(e.target.value)} />
          </div>
          <AtalhoPeriodo aoEscolher={(i, f) => { setInicio(i); setFim(f); }} />
          {(inicio || fim) && <Button type="button" variant="ghost" size="sm" onClick={() => { setInicio(""); setFim(""); }}>Limpar período</Button>}
        </BarraDeFiltros>
        <Button variant="outline" onClick={() => setRelatorioAberto(true)} disabled={periodoInvalido}>Relatório</Button>
        <Button requiresWrite onClick={abrir}>Novo abastecimento</Button>
      </div>

      {resumo && (
        <GradeDeCartoes colunas={4}>
          {/* Cartões no modelo da Frota (decisão 392): título, o que o número mostra, o valor e um detalhe. */}
          <StatCard titulo="Abastecimentos" subtitulo="Registros do veículo, no período e na busca escolhidos." valor={linhas.length} detalhe={linhas[0] ? `Último em ${formatarData(linhas[0].data)}` : "Nenhum no filtro"} icone={Fuel} compacto />
          <StatCard titulo="Litros" subtitulo="Soma dos litros abastecidos nos registros da tela." valor={resumo.litros.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} detalhe={resumo.litros > 0 ? `Preço médio de ${reais(resumo.gasto / resumo.litros)} por litro` : "Sem litros no filtro"} icone={Droplets} compacto />
          <StatCard titulo="Total gasto" subtitulo="Soma dos valores pagos nos abastecimentos da tela." valor={reais(resumo.gasto)} detalhe={`${linhas.length} abastecimento${linhas.length === 1 ? "" : "s"}`} icone={Banknote} compacto />
          <StatCard titulo="Média de consumo" subtitulo="Km rodados ÷ litros, em todo o histórico do veículo." valor={resumo.media === null ? "—" : `${resumo.media.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km/L`} detalhe={resumo.media === null ? "Precisa de pelo menos dois abastecimentos" : "Não muda com a busca nem com o período"} icone={Gauge} compacto />
        </GradeDeCartoes>
      )}

      {/* A lista usa o que sobra da janela e rola por dentro, para a página não rolar (decisão 337). */}
      <div className={`${resumo ? "max-h-[max(12rem,calc(100dvh-27rem))]" : "max-h-[max(12rem,calc(100dvh-18rem))]"} flex flex-col overflow-hidden rounded-xl border [&>div]:min-h-0 [&>div]:flex-1 [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-card`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data e hora</TableHead>
              {!doFiltro && <TableHead>Veículo</TableHead>}
              <TableHead className="text-right">Km</TableHead>
              <TableHead className="text-right">Km rodados</TableHead>
              <TableHead className="text-right">Litros</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">R$/L</TableHead>
              <TableHead className="text-right">Km/L</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 && (
              <TableRow><TableCell colSpan={doFiltro ? 8 : 9}>{busca.trim() || inicio || fim ? <EstadoVazio titulo="Nenhum resultado para a busca e o período." dica="Mude a busca ou as datas." /> : <EstadoVazio titulo="Nenhum abastecimento registrado." dica="Registre o primeiro para acompanhar consumo e custo por km." acao="+ Registrar Primeiro Abastecimento" aoAcionar={abrir} />}</TableCell></TableRow>
            )}
            {linhas.map((a) => {
              const v = veiculo(a.veiculoId);
              return (
                <TableRow key={a.id}>
                  <TableCell>{formatarData(a.data)}{a.hora ? ` ${a.hora}` : ""}</TableCell>
                  {!doFiltro && <TableCell>{v ? rotuloDoVeiculo(parametros, v) : "—"}</TableCell>}
                  <TableCell className="text-right">{numero(a.km)}</TableCell>
                  <TableCell className="text-right">{a.kmRodados === null ? "—" : numero(a.kmRodados)}</TableCell>
                  <TableCell className="text-right">{a.litros.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right">{reais(a.valor)}</TableCell>
                  <TableCell className="text-right">{reais(a.precoLitro)}</TableCell>
                  <TableCell className="text-right">{a.kmPorLitro === null ? "—" : a.kmPorLitro.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</TableCell>
                  <TableCell className="text-right">
                    {isAdmin && (
                      <Button requiresWrite variant="ghost" size="sm" aria-label="Excluir abastecimento" className="text-destructive hover:text-destructive" onClick={() => excluir(a.id)}>
                        Excluir
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <EscolherCamposRelatorio
        aberto={relatorioAberto}
        onAberto={setRelatorioAberto}
        titulo="Relatório de abastecimento"
        descricao={`Marque as colunas e as opções do relatório. Sai o que está na tela: o veículo, a busca e o período escolhidos (${linhas.length} abastecimento${linhas.length === 1 ? "" : "s"}).`}
        campos={COLUNAS_RELATORIO.map((c) => ({ id: c.id, rotulo: c.titulo }))}
        opcoes={OPCOES_RELATORIO}
        prefixo="rel-abastecimento"
        onGerar={gerarRelatorio}
      />
      <NovoAbastecimentoDialog aberto={aberto} aoMudar={setAberto} aoSalvar={(registro) => setFiltro(registro.veiculoId)} />
    </div>
  );
}
