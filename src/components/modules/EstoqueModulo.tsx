import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { TODAS, useEmpresa } from '@/lib/empresa-context';
import { MODO_DEMO } from '@/lib/modo-demo';
import { exportarCsv } from '@/lib/gemape';
import { lerItensEstoque } from '@/lib/itens-estoque-modulo';
import { prepararEstoqueFerramenta, prepararMinimoUnico, prepararMinimosEstoque, tamanhosConfiguraveisNoModulo } from '@/lib/estoque-configuracao';
import { CLASSE_DO_NIVEL, nivelDoAlerta, TEXTO_DO_NIVEL_ALERTA } from '@/lib/estoque-epi-visao';
import { controlaTamanho, estadoEstoqueModulo, nomeTamanho, preservarMinimosNaoSelecionados, tamanhosAutorizadosDoProduto, tamanhosDisponiveisDoProduto } from '@/lib/estoque-tamanho';
import { useCaixasFerramentas, useEmpresas, useMovimentacoes, useRegistrarMovimentacoesLote, useSalvar, useTodosCaixaItens } from '@/lib/hooks-gemape';
import { posicaoDasFerramentas, type PosicaoDaFerramenta } from '@/lib/estoque-ferramentas-posicao';
import { hojeLocal } from '@/lib/empregados';
import { combinaBusca, estaAtivo } from '@/lib/parametros-base';
import { useParametrosBase } from '@/lib/use-parametros-base';
import { BarraDeFiltros } from '@/components/layout/BarraDeFiltros';
import { ControleEstoqueModulo } from '@/components/modules/ControleEstoqueModulo';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// O EPI tem a sua tela de Estoque (EstoqueEpiModulo, decisão 329): esta é a dos uniformes e das ferramentas.
type ModuloEstoque = 'uniforme' | 'ferramenta';

export function EstoqueModulo({ modulo }: { modulo: ModuloEstoque }) {
  const { empresaId } = useEmpresa();
  const parametros = useParametrosBase();
  const [itemId, setItemId] = useState<string | null>(null);
  // Busca por palavra-chave (decisão 339): código, nome do item ou empresa, sem acento e sem diferenciar maiúscula.
  const [busca, setBusca] = useState('');
  const tabela = modulo === 'uniforme' ? 'uniformes' : 'ferramentas';
  const salvar = useSalvar(tabela, ['estoque-modulo']);
  // Ferramentas (decisão 379): o saldo se reparte entre as caixas, os empregados e o que está sem caixa, e tem de bater com as entradas e as baixas.
  const ferr = modulo === 'ferramenta';
  const registrar = useRegistrarMovimentacoesLote(['estoque-modulo']);
  const { data: movimentos = [] } = useMovimentacoes('ferramenta', empresaId);
  const { data: itensDeCaixa = [] } = useTodosCaixaItens();
  const { data: caixas = [] } = useCaixasFerramentas(TODAS, '');
  const { data: itens = [], isLoading, isError, error } = useQuery({
    queryKey: ['estoque-modulo', modulo, empresaId],
    queryFn: () => lerItensEstoque(supabase, modulo, empresaId),
  });
  const { data: empresas = [] } = useEmpresas();
  // Dec 238: o estoque é por empresa; cada linha diz de qual empresa é, para o mesmo código não parecer repetido.
  const nomeDaEmpresa = (id: string | null) => empresas.find((e) => e.id === id)?.nome_fantasia ?? '—';
  const posicoes = useMemo(
    () => new Map<string, PosicaoDaFerramenta>(ferr ? posicaoDasFerramentas(itens, movimentos, itensDeCaixa).map((p) => [p.ferramentaId, p]) : []),
    [ferr, itens, movimentos, itensDeCaixa],
  );
  const codigoDaCaixa = (id: string | null) => caixas.find((c) => c.id === id)?.codigo ?? '—';
  const linhas = itens
    .filter((item) => combinaBusca(busca, item.codigo_sku, item.nome, nomeDaEmpresa(item.empresa_id)))
    .map((item) => ({ item, estado: estadoEstoqueModulo(parametros, modulo, item) }));
  const itemEditado = itens.find((item) => item.id === itemId);
  const porTamanho = Boolean(itemEditado && MODO_DEMO && modulo !== 'ferramenta' && (
    controlaTamanho(parametros, modulo, itemEditado)
    || Object.values(itemEditado.minimos_tamanho ?? {}).some((minimo) => Number(minimo) > 0)
  ));
  const tamanhosDaGrade = itemEditado && modulo !== 'ferramenta' && porTamanho
    ? tamanhosConfiguraveisNoModulo(
      tamanhosAutorizadosDoProduto(parametros, modulo, itemEditado)
        .filter((tamanho) => estaAtivo(parametros, tamanho.id)).map((tamanho) => tamanho.id),
      itemEditado.minimos_tamanho ?? {},
      itemEditado.tamanhos_selecionados,
    )
    : [];
  const usaGrade = porTamanho && tamanhosDaGrade.length > 0;
  const semSelecao = Boolean(itemEditado && modulo !== 'ferramenta' && MODO_DEMO &&
    Array.isArray(itemEditado.tamanhos_selecionados) && itemEditado.tamanhos_selecionados.length === 0 &&
    (tamanhosDisponiveisDoProduto(parametros, modulo, itemEditado).length > 0 ||
      Object.values(itemEditado.minimos_tamanho ?? {}).some((valor) => Number(valor) > 0)));

  function salvarConfiguracao(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!itemEditado || salvar.isPending || semSelecao) return;
    const formulario = new FormData(evento.currentTarget);
    try {
      let valores: Record<string, unknown>;
      if (modulo === 'ferramenta') {
        const { estoque_minimo, estoque_atual: novoSaldo } = prepararEstoqueFerramenta(String(formulario.get('estoque_minimo') ?? ''), String(formulario.get('estoque_atual') ?? ''));
        const saldoAtual = Number(itemEditado.estoque_atual) || 0;
        if (novoSaldo < saldoAtual) throw new Error('Para reduzir o saldo, registre a baixa (pela caixa ou em Movimentações): o ajuste só aumenta.');
        // O saldo só muda por movimentação, para as entradas e as baixas continuarem batendo com ele: o aumento vira uma entrada de ajuste.
        if (novoSaldo > saldoAtual) {
          registrar.mutate([{
            modulo: 'ferramenta', item_id: itemEditado.id, veiculo_id: null, empresa_id: itemEditado.empresa_id, empregado_id: null, tipo_movimentacao: 'Entrada',
            motivo_baixa: null, quantidade: novoSaldo - saldoAtual, onus_baixa: null, tipo_vistoria: null, sinalizar_ocorrencia: false, tipo_ocorrencia: null, conducao_ocorrencia: null,
            data_movimentacao: hojeLocal(), origem_local: null, destino_local: null, observacao: 'Ajuste de estoque feito na tela de Estoque.',
          }]);
        }
        valores = { estoque_minimo };
      } else if (usaGrade) {
        const digitados = Object.fromEntries(tamanhosDaGrade.map((id) => [id, Number(formulario.get(`minimo:${id}`))]));
        valores = prepararMinimosEstoque(digitados, tamanhosDaGrade);
        if (MODO_DEMO && Array.isArray(itemEditado.tamanhos_selecionados)) {
          const minimos = preservarMinimosNaoSelecionados(itemEditado.minimos_tamanho ?? {}, itemEditado.tamanhos_selecionados, valores['minimos_tamanho'] as Record<string, number>);
          valores['minimos_tamanho'] = minimos;
          valores['estoque_minimo'] = Object.values(minimos).reduce((soma, minimo) => soma + minimo, 0);
        }
      } else {
        valores = prepararMinimoUnico(String(formulario.get('estoque_minimo') ?? ''));
        if (!MODO_DEMO) delete valores['minimos_tamanho'];
      }
      salvar.mutate({ id: itemEditado.id, valores }, { onSuccess: () => setItemId(null) });
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : 'Configuração de estoque inválida.');
    }
  }

  // Alerta em três níveis (decisão 421): sem mínimo por tamanho, saldo igual ao mínimo é "Estoque mínimo" e 1 acima é "Próximo do mínimo"; os demais casos seguem como antes.
  const nivelDe = (estado: (typeof linhas)[number]['estado']) => {
    const porTotal = !estado.detalheMinimo && !estado.detalheAlerta;
    const calculado = porTotal ? nivelDoAlerta(estado.saldo, estado.minimo) : null;
    // "Abaixo" só vale se o estado já alertava (produto com tamanhos sem seleção não ganha alerta novo).
    const nivel = calculado === 'abaixo' && !estado.alerta ? null : calculado;
    return nivel ?? (estado.alerta ? 'abaixo' : 'nenhum');
  };
  const textoDe = (estado: (typeof linhas)[number]['estado']) => {
    const nivel = nivelDe(estado);
    return nivel === 'nenhum' ? '' : `${TEXTO_DO_NIVEL_ALERTA[nivel]}${estado.detalheAlerta ? `: ${estado.detalheAlerta}` : ''}`;
  };

  if (isError) return <p role="alert">Não foi possível carregar o estoque completo: {error.message}</p>;

  return (
    <div className="space-y-4">
      {/* Sem o título "Estoque" (a página já tem o dela): a busca no alto, à esquerda, e o Exportar CSV à direita, na mesma linha (decisões 339 e 406). */}
      <div className="flex flex-wrap items-end gap-2">
        <BarraDeFiltros>
          <Input
            aria-label="Buscar item do estoque"
            placeholder="Buscar por código, item ou empresa"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </BarraDeFiltros>
        <Button variant="outline" disabled={isLoading || linhas.length === 0} onClick={() =>
          exportarCsv(`estoque-${modulo}`, linhas.map(({ item, estado }) => ({
            Código: item.codigo_sku,
            Empresa: nomeDaEmpresa(item.empresa_id),
            Item: item.nome,
            ...(ferr ? (() => { const p = posicoes.get(item.id); return { Caixa: codigoDaCaixa(p?.caixaId ?? null), Entradas: p?.entradas ?? 0, Baixas: p?.baixas ?? 0, 'Guardada na caixa': p?.guardada ?? 0, 'Com empregado': p?.comEmpregado ?? 0, 'Sem caixa': p?.semCaixa ?? 0, Divergência: p?.divergencias.join(' ') ?? '' }; })() : {}),
            Saldo: estado.saldo,
            'Saldo histórico fora da seleção': estado.saldoForaDaSelecao,
            'Estoque mínimo': estado.minimo,
            'Saldo por tamanho': estado.detalheSaldo,
            'Mínimo por tamanho': estado.detalheMinimo,
            Alerta: textoDe(estado),
          })))
        }>Exportar CSV</Button>
      </div>
      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Código</TableHead><TableHead>Item</TableHead><TableHead>Empresa</TableHead>
            {ferr && <><TableHead>Caixa</TableHead><TableHead className="text-right">Entradas</TableHead><TableHead className="text-right">Baixas</TableHead></>}
            <TableHead className="text-right">Saldo</TableHead>
            {ferr && <><TableHead className="text-right">Guardada na caixa</TableHead><TableHead className="text-right">Com empregado</TableHead><TableHead className="text-right">Sem caixa</TableHead></>}
            <TableHead className="text-right">Estoque mínimo</TableHead>
            <TableHead>Alerta</TableHead><TableHead />
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={ferr ? 13 : 7}>Carregando estoque…</TableCell></TableRow>
              : linhas.length === 0 ? <TableRow><TableCell colSpan={ferr ? 13 : 7}>{busca.trim() ? 'Nenhum item para a busca.' : 'Nenhum item cadastrado.'}</TableCell></TableRow>
                : linhas.map(({ item, estado }) => <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.codigo_sku}</TableCell>
                  <TableCell>{item.nome}</TableCell>
                  <TableCell>{nomeDaEmpresa(item.empresa_id)}</TableCell>
                  {ferr && <>
                    <TableCell className="font-mono text-xs">{codigoDaCaixa(posicoes.get(item.id)?.caixaId ?? null)}</TableCell>
                    <TableCell className="text-right">{posicoes.get(item.id)?.entradas ?? 0}</TableCell>
                    <TableCell className="text-right">{posicoes.get(item.id)?.baixas ?? 0}</TableCell>
                  </>}
                  <TableCell className="text-right">{estado.saldo}{estado.detalheSaldo && <p className="text-xs text-muted-foreground">{estado.detalheSaldo}</p>}{estado.saldoForaDaSelecao !== 0 && <p className="text-xs text-muted-foreground">Saldo histórico fora da seleção: {estado.saldoForaDaSelecao}</p>}</TableCell>
                  {ferr && <>
                    <TableCell className="text-right">{posicoes.get(item.id)?.guardada ?? 0}</TableCell>
                    <TableCell className="text-right">{posicoes.get(item.id)?.comEmpregado ?? 0}</TableCell>
                    <TableCell className={`text-right ${(posicoes.get(item.id)?.semCaixa ?? 0) < 0 ? 'font-bold text-destructive' : ''}`}>{posicoes.get(item.id)?.semCaixa ?? 0}</TableCell>
                  </>}
                  <TableCell className="text-right">{estado.minimo}{estado.detalheMinimo && <p className="text-xs text-muted-foreground">{estado.detalheMinimo}</p>}</TableCell>
                  <TableCell className={CLASSE_DO_NIVEL[nivelDe(estado)]}>
                    {textoDe(estado) || '—'}
                    {(posicoes.get(item.id)?.divergencias ?? []).map((d) => <p key={d} className="text-xs font-bold text-destructive">Não bate: {d}</p>)}
                  </TableCell>
                  <TableCell><Button requiresWrite variant="outline" size="sm" onClick={() => setItemId(item.id)}>Configurar</Button></TableCell>
                </TableRow>)}
          </TableBody>
        </Table>
      </div>
      {ferr && <PosicaoPorCaixa caixas={caixas.filter((c) => itens.some((i) => i.empresa_id === c.empresa_id) || empresaId === TODAS)} itensDeCaixa={itensDeCaixa} itens={itens} posicoes={posicoes} />}
      {modulo !== 'ferramenta' && <ControleEstoqueModulo modulo={modulo} />}
      <Dialog open={Boolean(itemEditado)} onOpenChange={(aberto) => { if (!aberto) setItemId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar estoque — {itemEditado?.nome}{itemEditado ? ` (${nomeDaEmpresa(itemEditado.empresa_id)})` : ''}</DialogTitle>
            <DialogDescription>Saldo, mínimo e alertas pertencem ao módulo.</DialogDescription>
          </DialogHeader>
          {itemEditado && <form key={itemEditado.id} onSubmit={salvarConfiguracao} className="space-y-4">
            {semSelecao ? <p className="text-sm text-muted-foreground">Selecione um tamanho no cadastro do produto para configurar o mínimo.</p>
              : usaGrade ? <fieldset className="space-y-2">
              <legend className="font-medium">Estoque mínimo por tamanho</legend>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {tamanhosDaGrade.map((id) => <div key={id} className="space-y-1">
                  <Label htmlFor={`minimo:${id}`}>{nomeTamanho(parametros, id)}{!estaAtivo(parametros, id) ? ' (desativado)' : ''}</Label>
                  <Input id={`minimo:${id}`} name={`minimo:${id}`} type="number" min={0} step={1} defaultValue={itemEditado.minimos_tamanho?.[id] ?? 0} />
                </div>)}
              </div>
            </fieldset> : <div className="space-y-1">
              <Label htmlFor="estoque_minimo">Estoque mínimo</Label>
              <Input id="estoque_minimo" name="estoque_minimo" type="number" min={0} step={1} defaultValue={itemEditado.estoque_minimo ?? 0} />
            </div>}
            {modulo === 'ferramenta' && <div className="space-y-1">
              <Label htmlFor="estoque_atual">Estoque inicial</Label>
              <Input id="estoque_atual" name="estoque_atual" type="number" min={0} step={1} defaultValue={itemEditado.estoque_atual ?? 0} />
              <p className="text-xs text-muted-foreground">O saldo só muda por movimentação: aumentar aqui registra uma entrada de ajuste; para reduzir, registre a baixa (pela caixa ou em Movimentações).</p>
            </div>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setItemId(null)}>Cancelar</Button>
              <Button requiresWrite type="submit" disabled={salvar.isPending || semSelecao}>Salvar</Button>
            </DialogFooter>
          </form>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Posição por caixa (decisão 379): cada caixa com as suas ferramentas, o que está guardado, o que está com empregado e se o que ela tem bate com o estoque.
function PosicaoPorCaixa({ caixas, itensDeCaixa, itens, posicoes }: {
  caixas: { id: string; codigo: string; empresa_id: string | null }[];
  itensDeCaixa: { caixa_id: string; ferramenta_id: string; quantidade: number }[];
  itens: { id: string; codigo_sku: string | null; nome: string }[];
  posicoes: Map<string, PosicaoDaFerramenta>;
}) {
  const lista = caixas
    .map((caixa) => ({ caixa, linhas: itensDeCaixa.filter((i) => i.caixa_id === caixa.id).flatMap((i) => { const item = itens.find((x) => x.id === i.ferramenta_id); const p = posicoes.get(i.ferramenta_id); return item && p ? [{ item, p, cadastrada: Number(i.quantidade) || 0 }] : []; }) }))
    .filter((c) => c.linhas.length > 0)
    .sort((a, b) => a.caixa.codigo.localeCompare(b.caixa.codigo, 'pt-BR'));
  if (lista.length === 0) return null;
  return (
    <section className="space-y-2" aria-labelledby="posicao-caixas">
      <h2 id="posicao-caixas" className="text-lg font-semibold">Posição por caixa</h2>
      <p className="text-sm text-muted-foreground">O que cada caixa guarda, descontadas as baixas, e o que está com empregado. A soma das caixas nunca passa do saldo do estoque.</p>
      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Caixa</TableHead><TableHead>Código</TableHead><TableHead>Ferramenta</TableHead>
            <TableHead className="text-right">Cadastrada</TableHead><TableHead className="text-right">Baixas</TableHead>
            <TableHead className="text-right">Com empregado</TableHead><TableHead className="text-right">Guardada</TableHead>
            <TableHead className="text-right">Saldo no estoque</TableHead><TableHead>Confere</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {lista.flatMap(({ caixa, linhas }) => [
              ...linhas.map(({ item, p, cadastrada }, n) => (
                <TableRow key={`${caixa.id}-${item.id}`}>
                  <TableCell className="font-mono text-xs">{n === 0 ? caixa.codigo : ''}</TableCell>
                  <TableCell className="font-mono text-xs">{item.codigo_sku}</TableCell>
                  <TableCell>{item.nome}</TableCell>
                  <TableCell className="text-right">{cadastrada}</TableCell>
                  <TableCell className="text-right">{cadastrada - p.naCaixa}</TableCell>
                  <TableCell className="text-right">{p.comEmpregado}</TableCell>
                  <TableCell className="text-right font-semibold">{p.guardada}</TableCell>
                  <TableCell className="text-right">{p.saldo}</TableCell>
                  <TableCell className={p.divergencias.length ? 'font-bold text-destructive' : ''}>{p.divergencias.length ? 'Não bate' : 'Sim'}</TableCell>
                </TableRow>
              )),
              <TableRow key={`${caixa.id}-total`} className="bg-muted/40 font-semibold">
                <TableCell colSpan={3}>Total da caixa {caixa.codigo}</TableCell>
                <TableCell className="text-right">{linhas.reduce((t, l) => t + l.cadastrada, 0)}</TableCell>
                <TableCell className="text-right">{linhas.reduce((t, l) => t + (l.cadastrada - l.p.naCaixa), 0)}</TableCell>
                <TableCell className="text-right">{linhas.reduce((t, l) => t + l.p.comEmpregado, 0)}</TableCell>
                <TableCell className="text-right">{linhas.reduce((t, l) => t + l.p.guardada, 0)}</TableCell>
                <TableCell className="text-right">{linhas.reduce((t, l) => t + l.p.saldo, 0)}</TableCell>
                <TableCell />
              </TableRow>,
            ])}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
