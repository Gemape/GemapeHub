import { AlertTriangle, Boxes, Car, Users, Wallet } from "lucide-react";
import type { ReactNode } from "react";

import { StatCard } from "@/components/StatCard";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatarMoeda, MODULO_LABEL, type Modulo } from "@/lib/gemape";
import type { kpisDeEmpregados, kpisDeItens, kpisDeValor, kpisDeVeiculos } from "@/lib/painel-kpis";

export type CardDoPainel = "itens" | "valor" | "veiculos" | "empregados";
export type KpisDoPainel = {
  itens: ReturnType<typeof kpisDeItens>; valor: ReturnType<typeof kpisDeValor>; veiculos: ReturnType<typeof kpisDeVeiculos>; empregados: ReturnType<typeof kpisDeEmpregados>;
};

const categoria = (m: string) => MODULO_LABEL[m as Modulo] ?? m;
const porcento = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
const numero = (n: number | null) => (n === null ? "—" : n.toLocaleString("pt-BR", { maximumFractionDigits: 1 }));

function Quadro({ titulo, colunas, linhas, vazio = "Sem dados." }: { titulo: string; colunas: string[]; linhas: ReactNode[][]; vazio?: string }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">{titulo}</h3>
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader><TableRow>{colunas.map((c, i) => <TableHead key={c} className={i > 0 ? "text-right" : ""}>{c}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {linhas.length === 0 && <TableRow><TableCell colSpan={colunas.length} className="py-4 text-center text-muted-foreground">{vazio}</TableCell></TableRow>}
            {linhas.map((l, n) => <TableRow key={n}>{l.map((c, i) => <TableCell key={i} className={i > 0 ? "text-right" : ""}>{c}</TableCell>)}</TableRow>)}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

// Janela aberta ao clicar num card do Dashboard consolidado: os KPIs que o gestor precisa para decidir, com os números do próprio card como ponto de partida.
export function PainelKpisDialog({ card, kpis, onFechar }: { card: CardDoPainel | null; kpis: KpisDoPainel; onFechar: () => void }) {
  const { itens, valor, veiculos, empregados } = kpis;
  return (
    <Dialog open={card !== null} onOpenChange={(a) => { if (!a) onFechar(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        {card === "itens" && (
          <>
            <DialogHeader><DialogTitle>Itens cadastrados: o que pede ação</DialogTitle><DialogDescription>Tamanho do cadastro e onde o estoque está curto, por categoria e por empresa.</DialogDescription></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard titulo="Itens no mínimo ou abaixo" subtitulo="Itens em alerta ÷ itens cadastrados." valor={itens.abaixoMinimo} pct={itens.pctAbaixoMinimo} faixa={itens.abaixoMinimo === 0 ? "verde" : (itens.pctAbaixoMinimo ?? 0) > 20 ? "vermelho" : "amarelo"} detalhe={`${porcento(itens.pctAbaixoMinimo)} do cadastro`} icone={AlertTriangle} compacto />
              <StatCard titulo="Sem estoque" subtitulo="Itens com saldo zerado." valor={itens.semEstoque} faixa={itens.semEstoque === 0 ? "verde" : "vermelho"} detalhe={`de ${itens.total} itens`} icone={Boxes} compacto />
              <StatCard titulo="Unidades em estoque" subtitulo="Soma do saldo de todos os itens." valor={itens.unidades.toLocaleString("pt-BR")} detalhe={`${itens.total} itens cadastrados`} icone={Boxes} compacto />
            </div>
            <Quadro titulo="Por categoria" colunas={["Categoria", "Itens", "Unidades", "Em alerta"]} linhas={itens.porModulo.map((m) => [categoria(m.modulo), m.itens, m.unidades.toLocaleString("pt-BR"), m.abaixoMinimo])} />
            <Quadro titulo="Por empresa" colunas={["Empresa", "Itens", "Em alerta"]} linhas={itens.porEmpresa.map((e) => [e.nome, e.itens, e.abaixoMinimo])} />
          </>
        )}
        {card === "valor" && (
          <>
            <DialogHeader><DialogTitle>Valor em estoque: onde está o dinheiro</DialogTitle><DialogDescription>Distribuição do valor parado em estoque e os itens que mais pesam.</DialogDescription></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard titulo="Valor total" subtitulo="Estoque atual × preço de cada item." valor={formatarMoeda(valor.total)} icone={Wallet} compacto />
              <StatCard titulo="Valor médio por unidade" subtitulo="Valor total ÷ unidades em estoque." valor={formatarMoeda(valor.valorMedioPorUnidade)} icone={Wallet} compacto />
              <StatCard titulo="Concentração nos 5 maiores" subtitulo="Parcela do valor que está em cinco itens." valor={porcento(valor.pctDosCincoMaiores)} pct={valor.pctDosCincoMaiores} faixa={valor.pctDosCincoMaiores === null ? null : valor.pctDosCincoMaiores > 60 ? "vermelho" : valor.pctDosCincoMaiores > 40 ? "amarelo" : "verde"} detalhe="Quanto maior, mais depende de poucos itens" compacto />
            </div>
            <Quadro titulo="Por categoria" colunas={["Categoria", "Valor", "% do total"]} linhas={valor.porModulo.map((m) => [categoria(m.modulo), formatarMoeda(m.valor), porcento(m.pct)])} />
            <Quadro titulo="Por empresa" colunas={["Empresa", "Valor", "% do total"]} linhas={valor.porEmpresa.map((e) => [e.nome, formatarMoeda(e.valor), porcento(e.pct)])} />
            <Quadro titulo="Cinco itens de maior valor" colunas={["Item", "Categoria", "Valor", "% do total"]} linhas={valor.maiores.map((i) => [i.nome, categoria(i.modulo), formatarMoeda(i.valor), porcento(i.pct)])} />
          </>
        )}
        {card === "veiculos" && (
          <>
            <DialogHeader><DialogTitle>Veículos: disponibilidade da frota</DialogTitle><DialogDescription>Situação dos veículos e ocorrências que ainda pedem ação.</DialogDescription></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard titulo="Frota ativa" subtitulo="Veículos ativos ÷ veículos cadastrados." valor={porcento(veiculos.pctAtivos)} pct={veiculos.pctAtivos} faixa={veiculos.pctAtivos === null ? null : veiculos.pctAtivos >= 90 ? "verde" : veiculos.pctAtivos >= 75 ? "amarelo" : "vermelho"} detalhe={`${veiculos.ativos} de ${veiculos.total} veículos`} icone={Car} compacto />
              <StatCard titulo="Ocorrências abertas" subtitulo="Ocorrências ainda sem tratativa." valor={veiculos.ocorrenciasAbertas} faixa={veiculos.ocorrenciasAbertas === 0 ? "verde" : "vermelho"} detalhe="Aguardando início da tratativa" icone={AlertTriangle} compacto />
              <StatCard titulo="Em tratativa" subtitulo="Ocorrências com tratativa salva e não encerrada." valor={veiculos.ocorrenciasEmTratativa} faixa={veiculos.ocorrenciasEmTratativa === 0 ? "verde" : "amarelo"} detalhe="Falta encerrar" icone={AlertTriangle} compacto />
            </div>
            <Quadro titulo="Por situação" colunas={["Situação", "Veículos"]} linhas={veiculos.porStatus.map((s) => [s.status, s.total])} />
            <Quadro titulo="Por empresa" colunas={["Empresa", "Veículos", "Ativos"]} linhas={veiculos.porEmpresa.map((e) => [e.nome, e.total, e.ativos])} />
          </>
        )}
        {card === "empregados" && (
          <>
            <DialogHeader><DialogTitle>Empregados ativos: onde está a equipe</DialogTitle><DialogDescription>Distribuição da equipe e cobertura de EPI e uniforme em estoque.</DialogDescription></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard titulo="Empregados ativos" subtitulo="Somente colaboradores em atividade." valor={empregados.ativos} icone={Users} compacto />
              <StatCard titulo="EPI e uniforme por empregado" subtitulo="Unidades em estoque ÷ empregados ativos." valor={numero(empregados.unidadesDeVestuarioPorEmpregado)} detalhe="Unidades de EPI e uniforme" icone={Boxes} compacto />
            </div>
            <Quadro titulo="Por empresa" colunas={["Empresa", "Empregados", "% da equipe", "EPI e uniforme por empregado"]} linhas={empregados.porEmpresa.map((e) => [e.nome, e.ativos, porcento(e.pct), numero(e.unidadesPorEmpregado)])} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
