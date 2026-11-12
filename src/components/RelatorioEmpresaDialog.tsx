import { AlertTriangle, Boxes, Building2, Car, Users, Wallet } from "lucide-react";
import type { ReactNode } from "react";

import { StatCard } from "@/components/StatCard";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatarMoeda, MODULO_LABEL, type Modulo } from "@/lib/gemape";
import type { LinhaDeAlerta } from "@/components/RelatorioPainelDialog";
import { kpisDeEmpregados, kpisDeItens, kpisDeValor, kpisDeVeiculos, type ItemDoPainel } from "@/lib/painel-kpis";

const TEXTO = new Set(["Item", "Categoria", "Empresa", "Situação"]);
function Quadro({ titulo, colunas, linhas, vazio }: { titulo: ReactNode; colunas: string[]; linhas: ReactNode[][]; vazio: string }) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold">{titulo}</h3>
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader><TableRow>{colunas.map((c, i) => <TableHead key={c} className={TEXTO.has(c) || i === 0 ? "" : "text-right"}>{c}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {linhas.length === 0 && <TableRow><TableCell colSpan={colunas.length} className="py-4 text-center text-muted-foreground">{vazio}</TableCell></TableRow>}
            {linhas.map((l, n) => <TableRow key={n}>{l.map((c, i) => <TableCell key={i} className={TEXTO.has(colunas[i]!) || i === 0 ? "" : "text-right"}>{c}</TableCell>)}</TableRow>)}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

const categoria = (m: string) => MODULO_LABEL[m as Modulo] ?? m;
const porcento = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);

// Relatório de uma empresa do grupo, aberto ao clicar no card dela em "Distribuição por empresa" do Dashboard consolidado: estoque, itens em alerta, frota e equipe.
export function RelatorioEmpresaDialog({ empresa, itens, alertas, criticos, veiculos, ocorrencias, empregados, onFechar }: {
  empresa: { id: string; nome: string } | null;
  itens: ItemDoPainel[];
  alertas: LinhaDeAlerta[];
  criticos: ReadonlySet<string>;
  veiculos: { id: string; empresa_id: string | null; status: string }[];
  ocorrencias: { veiculoId: string; status: string }[];
  empregados: { empresa_id: string | null }[];
  onFechar: () => void;
}) {
  const lista = empresa ? [empresa] : [];
  const meus = itens.filter((i) => i.empresa_id === empresa?.id);
  const k = kpisDeItens(meus, criticos, lista);
  const v = kpisDeValor(meus, lista);
  const f = kpisDeVeiculos(veiculos.filter((x) => x.empresa_id === empresa?.id), ocorrencias, lista);
  const e = kpisDeEmpregados(empregados.filter((x) => x.empresa_id === empresa?.id), meus, lista);
  const emAlerta = alertas.filter((a) => a.empresaId === empresa?.id);
  const valorPorModulo = new Map(v.porModulo.map((m) => [m.modulo, m]));
  const pctSemAlerta = k.pctAbaixoMinimo === null ? null : Math.round((100 - k.pctAbaixoMinimo) * 10) / 10;
  return (
    <Dialog open={empresa !== null} onOpenChange={(a) => { if (!a) onFechar(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        {empresa && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Building2 className="size-5" aria-hidden="true" /> Relatório de {empresa.nome}</DialogTitle>
              <DialogDescription>Estoque, itens em alerta, frota e equipe da empresa.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard titulo="Valor em estoque" subtitulo="Estoque atual × preço de cada item." valor={formatarMoeda(v.total)} detalhe={`${k.unidades.toLocaleString("pt-BR")} unidades`} icone={Wallet} compacto />
              <StatCard titulo="Itens" subtitulo="Itens sem alerta ÷ itens cadastrados." valor={k.total} pct={pctSemAlerta} faixa={k.abaixoMinimo === 0 ? "verde" : (k.pctAbaixoMinimo ?? 0) >= 30 ? "vermelho" : "amarelo"} detalhe={`${k.abaixoMinimo} em alerta · ${k.semEstoque} sem estoque`} icone={Boxes} compacto />
              <StatCard titulo="Veículos" subtitulo="Veículos ativos ÷ cadastrados." valor={f.total} pct={f.pctAtivos} detalhe={`${f.ativos} ativos · ${f.ocorrenciasAbertas + f.ocorrenciasEmTratativa} ocorrência(s) pendente(s)`} icone={Car} compacto />
              <StatCard titulo="Equipe" subtitulo="Empregados ativos da empresa." valor={e.ativos} detalhe={e.unidadesDeVestuarioPorEmpregado === null ? "Sem empregados ativos" : `${e.unidadesDeVestuarioPorEmpregado.toLocaleString("pt-BR")} un. de EPI e uniforme por empregado`} icone={Users} compacto />
            </div>
            <Quadro titulo="Estoque por categoria" colunas={["Categoria", "Itens", "Unidades", "Em alerta", "Valor"]} vazio="Sem itens."
              linhas={k.porModulo.map((m) => [categoria(m.modulo), m.itens, m.unidades.toLocaleString("pt-BR"), m.abaixoMinimo, `${formatarMoeda(valorPorModulo.get(m.modulo)?.valor ?? 0)} (${porcento(valorPorModulo.get(m.modulo)?.pct ?? null)})`])} />
            <Quadro titulo="Itens de maior valor" colunas={["Item", "Categoria", "Valor", "% da empresa"]} vazio="Sem itens com preço."
              linhas={v.maiores.map((i) => [i.nome, categoria(i.modulo), formatarMoeda(i.valor), porcento(i.pct)])} />
            <Quadro titulo={<><AlertTriangle className="size-4 text-destructive" aria-hidden="true" /> Itens em alerta ({emAlerta.length})</>} colunas={["Item", "Categoria", "Estoque", "Mínimo"]} vazio="Nenhum item abaixo do estoque mínimo."
              linhas={emAlerta.slice(0, 10).map((a) => [a.nome, categoria(a.modulo), a.estoque, a.minimo])} />
            {emAlerta.length > 10 && <p className="text-xs text-muted-foreground">Mostrando 10 de {emAlerta.length}.</p>}
            <Quadro titulo="Veículos por situação" colunas={["Situação", "Veículos"]} vazio="Sem veículos." linhas={f.porStatus.map((s) => [s.status, s.total])} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
