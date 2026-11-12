import { AlertTriangle, Boxes, Building2 } from "lucide-react";
import type { ReactNode } from "react";

import { StatCard } from "@/components/StatCard";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatarMoeda, MODULO_LABEL, valorTotalEmEstoque, type Modulo } from "@/lib/gemape";
import type { ItemDoPainel } from "@/lib/painel-kpis";

export type RelatorioDoPainel = "categorias" | "alertas";
export type LinhaDeAlerta = { id: string; nome: string; modulo: string; empresaId: string | null; estoque: string; minimo: string };

const categoria = (m: string) => MODULO_LABEL[m as Modulo] ?? m;
const porcento = (parte: number, total: number) => (total === 0 ? "—" : `${((parte / total) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);

const TEXTO = new Set(["Item", "Categoria", "Empresa", "Situação"]);
function Quadro({ titulo, colunas, linhas, vazio }: { titulo: string; colunas: string[]; linhas: ReactNode[][]; vazio: string }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">{titulo}</h3>
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

// Relatório aberto ao clicar nos quadros "Patrimônio por categoria" e "Alertas críticos" do Dashboard consolidado: o quadro completo, sem o corte de dez linhas, com a quebra por empresa.
export function RelatorioPainelDialog({ relatorio, itens, alertas, empresas, totalVeiculos, onFechar }: {
  relatorio: RelatorioDoPainel | null;
  itens: ItemDoPainel[];
  alertas: LinhaDeAlerta[];
  empresas: { id: string; nome: string }[];
  totalVeiculos: number;
  onFechar: () => void;
}) {
  const nomeEmpresa = (id: string | null) => empresas.find((e) => e.id === id)?.nome ?? "—";
  const modulos = [...new Set(itens.map((i) => i.modulo))];
  const valorTotal = valorTotalEmEstoque(itens);
  const unidades = itens.reduce((s, i) => s + (i.estoque_atual ?? 0), 0);
  const alertasPorModulo = modulos.map((m) => ({ modulo: m, n: new Set(alertas.filter((a) => a.modulo === m).map((a) => a.id)).size }));
  const itensEmAlerta = new Set(alertas.map((a) => a.id)).size;
  const semEstoque = itens.filter((i) => (i.estoque_atual ?? 0) <= 0).length;
  return (
    <Dialog open={relatorio !== null} onOpenChange={(a) => { if (!a) onFechar(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        {relatorio === "categorias" && (
          <>
            <DialogHeader><DialogTitle>Patrimônio por categoria</DialogTitle><DialogDescription>Quanto há em cada categoria, onde está e quanto vale, por empresa.</DialogDescription></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard titulo="Valor total" subtitulo="Estoque atual × preço de cada item." valor={formatarMoeda(valorTotal)} detalhe={`${modulos.length} categorias`} icone={Boxes} compacto />
              <StatCard titulo="Itens cadastrados" subtitulo="Em todas as categorias de estoque." valor={itens.length} detalhe={`${unidades.toLocaleString("pt-BR")} unidades`} icone={Boxes} compacto />
              <StatCard titulo="Veículos" subtitulo="Controlados à parte, sem estoque." valor={totalVeiculos} detalhe="Frota do grupo" icone={Building2} compacto />
            </div>
            <Quadro titulo="Por categoria" colunas={["Categoria", "Itens", "Unidades", "Valor", "% do valor", "Em alerta"]} vazio="Sem itens."
              linhas={modulos.map((m) => {
                const doModulo = itens.filter((i) => i.modulo === m);
                const valor = valorTotalEmEstoque(doModulo);
                return [categoria(m), doModulo.length, doModulo.reduce((s, i) => s + (i.estoque_atual ?? 0), 0).toLocaleString("pt-BR"), formatarMoeda(valor), porcento(valor, valorTotal), alertasPorModulo.find((a) => a.modulo === m)?.n ?? 0];
              })} />
            <Quadro titulo="Valor por categoria e empresa" colunas={["Categoria", "Empresa", "Itens", "Unidades", "Valor"]} vazio="Sem itens."
              linhas={modulos.flatMap((m) => empresas.map((e) => {
                const dela = itens.filter((i) => i.modulo === m && i.empresa_id === e.id);
                return { dela, linha: [categoria(m), e.nome, dela.length, dela.reduce((s, i) => s + (i.estoque_atual ?? 0), 0).toLocaleString("pt-BR"), formatarMoeda(valorTotalEmEstoque(dela))] };
              }).filter((x) => x.dela.length > 0).map((x) => x.linha))} />
          </>
        )}
        {relatorio === "alertas" && (
          <>
            <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="size-5 text-destructive" aria-hidden="true" /> Alertas críticos</DialogTitle><DialogDescription>Todos os itens no estoque mínimo ou abaixo, com a empresa de cada um (EPI e uniforme alertam por tamanho).</DialogDescription></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard titulo="Itens em alerta" subtitulo="Itens no mínimo ou abaixo ÷ itens cadastrados." valor={itensEmAlerta} pct={itens.length === 0 ? null : Math.round((1 - itensEmAlerta / itens.length) * 1000) / 10} faixa={itensEmAlerta === 0 ? "verde" : itensEmAlerta / Math.max(itens.length, 1) >= 0.3 ? "vermelho" : "amarelo"} detalhe={`de ${itens.length} itens`} icone={AlertTriangle} compacto />
              <StatCard titulo="Sem estoque" subtitulo="Itens com saldo zerado." valor={semEstoque} faixa={semEstoque === 0 ? "verde" : "vermelho"} detalhe={`de ${itens.length} itens`} icone={Boxes} compacto />
              <StatCard titulo="Linhas de alerta" subtitulo="Contando um alerta por tamanho." valor={alertas.length} detalhe={alertas.length === 0 ? "Sem alertas" : alertasPorModulo.filter((a) => a.n > 0).map((a) => `${a.n} ${categoria(a.modulo).toLowerCase()}`).join(" · ")} icone={AlertTriangle} compacto />
            </div>
            <Quadro titulo="Por empresa" colunas={["Empresa", "Itens", "Em alerta"]} vazio="Sem empresas."
              linhas={empresas.map((e) => [e.nome, itens.filter((i) => i.empresa_id === e.id).length, new Set(alertas.filter((a) => a.empresaId === e.id).map((a) => a.id)).size])} />
            <Quadro titulo="Itens em alerta" colunas={["Item", "Categoria", "Estoque", "Mínimo", "Empresa"]} vazio="Nenhum item abaixo do estoque mínimo."
              linhas={alertas.map((a) => [a.nome, categoria(a.modulo), a.estoque, a.minimo, nomeEmpresa(a.empresaId)])} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
