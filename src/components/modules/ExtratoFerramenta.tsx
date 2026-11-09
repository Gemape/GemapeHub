import { useEffect, useMemo, useState } from 'react';

import { PONTO_TELA, TEXTO_TELA } from '@/components/modules/ExtratoVeiculo';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { montarExtratoHtml, type Celula, type TabelaExtrato } from '@/lib/extrato-html';
import { formatarData } from '@/lib/gemape';
import { ehBaixa } from '@/lib/historico-movimentacoes';
import { imprimirDocumento } from '@/lib/visualizador-documento';

// Extrato da ferramenta (Ferramentas > Estoque), na mesma lógica do extrato do veículo: período, resumo, posição de hoje (caixa, empregado, sem caixa),
// as movimentações do período e o PDF. Com a ferramenta repetida em mais de uma empresa, os números são a soma delas.
export type AlvoDoExtrato = { titulo: string; ids: string[] };
type Movimento = { item_id: string | null; tipo_movimentacao: string; empregado_id: string | null; motivo_baixa: string | null; quantidade: number | null; data_movimentacao: string; observacao: string | null };
export type OndeEstaDados = { caixasDe: { codigo: string; quantidade: number }[]; comEmpregados: { nome: string; quantidade: number }[]; semCaixa: number; guardada: number };

const tipoDoMovimento = (m: Movimento) => {
  if (m.tipo_movimentacao === 'Entrada') return 'Entrada';
  if (m.tipo_movimentacao === 'Devolucao') return 'Devolução';
  return ehBaixa(m) ? `Baixa · ${m.motivo_baixa}` : 'Entrega ao empregado';
};

export function ExtratoFerramenta({ alvo, movimentos, saldo, onde, nomeEmpregado, empresa, onFechar }: {
  alvo: AlvoDoExtrato | null; movimentos: Movimento[]; saldo: number; onde: OndeEstaDados; nomeEmpregado: (id: string | null) => string; empresa: string; onFechar: () => void;
}) {
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  useEffect(() => { setInicio(''); setFim(''); }, [alvo?.titulo]);
  const periodoInvalido = !!inicio && !!fim && inicio > fim;
  const tabelas = useMemo<TabelaExtrato[]>(() => {
    if (!alvo) return [];
    const doPeriodo = movimentos
      .filter((m) => m.item_id && alvo.ids.includes(m.item_id) && (!inicio || m.data_movimentacao >= inicio) && (!fim || m.data_movimentacao <= fim))
      .sort((a, b) => b.data_movimentacao.localeCompare(a.data_movimentacao));
    return [
      {
        titulo: 'Onde está hoje', vazio: '',
        colunas: [{ titulo: 'Posição' }, { titulo: 'Onde' }, { titulo: 'Quantidade', direita: true }],
        linhas: [
          ...onde.caixasDe.map((c): Celula[] => ['Na caixa', `Caixa ${c.codigo}`, String(c.quantidade)]),
          ...onde.comEmpregados.map((e): Celula[] => ['Com empregado', e.nome, String(e.quantidade)]),
          ['Sem caixa', 'Estoque, fora das caixas', String(onde.semCaixa)],
        ],
      },
      {
        titulo: 'Movimentações', vazio: 'Nenhuma movimentação no período.',
        colunas: [{ titulo: 'Data' }, { titulo: 'Movimento' }, { titulo: 'Empregado' }, { titulo: 'Quantidade', direita: true }, { titulo: 'Observação' }],
        linhas: doPeriodo.map((m): Celula[] => [formatarData(m.data_movimentacao), tipoDoMovimento(m), m.empregado_id ? nomeEmpregado(m.empregado_id) : '—', String(Number(m.quantidade) || 0), m.observacao ?? '']),
      },
    ];
  }, [alvo, movimentos, inicio, fim, onde, nomeEmpregado]);
  const resumo: [string, string][] = [
    ['Saldo no estoque', String(saldo)],
    ['Guardada nas caixas', String(onde.guardada)],
    ['Com empregados', String(onde.comEmpregados.reduce((t, e) => t + e.quantidade, 0))],
  ];
  const gerarPdf = () => alvo && imprimirDocumento(montarExtratoHtml({
    titulo: 'Extrato da ferramenta', assunto: alvo.titulo, empresa, resumo,
    subtitulo: `Período: ${inicio || fim ? `${inicio ? formatarData(inicio) : 'desde o início'} a ${fim ? formatarData(fim) : 'hoje'}` : 'todo o histórico'}`,
    tabelas,
  }));
  return (
    <Dialog open={!!alvo} onOpenChange={(a) => { if (!a) onFechar(); }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Extrato da ferramenta</DialogTitle>
          <DialogDescription>{alvo?.titulo}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5"><Label htmlFor="extrato-fer-inicio" className="block text-center">Data início</Label><Input id="extrato-fer-inicio" type="date" className="w-40" value={inicio} max={fim || undefined} onChange={(e) => setInicio(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="extrato-fer-fim" className="block text-center">Data fim</Label><Input id="extrato-fer-fim" type="date" className="w-40" value={fim} min={inicio || undefined} onChange={(e) => setFim(e.target.value)} /></div>
          <p className="max-w-md text-xs text-muted-foreground">O período vale para as movimentações. A posição (caixa, empregado, sem caixa) mostra sempre a situação de hoje.</p>
          <Button type="button" className="ml-auto" disabled={periodoInvalido || !alvo} onClick={gerarPdf}>Gerar PDF</Button>
        </div>
        {periodoInvalido && <p className="text-sm text-destructive">A data início não pode ser depois da data fim.</p>}
        {!periodoInvalido && alvo && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              {resumo.map(([rotulo, valor]) => <div key={rotulo} className="rounded-xl border bg-muted/30 p-3"><p className="text-eyebrow">{rotulo}</p><p className="mt-1 text-lg font-bold">{valor}</p></div>)}
            </div>
            {tabelas.map((t, n) => (
              <section key={t.titulo} className="space-y-3" aria-label={t.titulo}>
                <div className={`rounded-xl bg-gradient-to-r px-4 py-2.5 text-white shadow-sm ${n === 0 ? 'from-emerald-800 to-emerald-600' : 'from-blue-800 to-blue-600'}`}><h3 className="text-xl font-bold tracking-tight">{t.titulo}</h3></div>
                <div className="overflow-x-auto rounded-xl border">
                  <Table>
                    <TableHeader><TableRow>{t.colunas.map((c) => <TableHead key={c.titulo} className={c.direita ? 'text-right' : ''}>{c.titulo}</TableHead>)}</TableRow></TableHeader>
                    <TableBody>
                      {t.linhas.length === 0
                        ? <TableRow><TableCell colSpan={t.colunas.length} className="py-5 text-center text-muted-foreground">{t.vazio}</TableCell></TableRow>
                        : t.linhas.map((l, k) => <TableRow key={k}>{l.map((c, m) => <TableCell key={m} className={t.colunas[m]?.direita ? 'text-right tabular-nums' : ''}>{typeof c === 'string' ? c : <span className="inline-flex items-center gap-2"><span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${PONTO_TELA[c.cor]}`} /><span className={TEXTO_TELA[c.cor]}>{c.texto}</span></span>}</TableCell>)}</TableRow>)}
                    </TableBody>
                  </Table>
                </div>
              </section>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
