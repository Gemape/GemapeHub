import { LinhasEsqueleto } from "@/components/Esqueletos";
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { TODAS, useEmpresa } from '@/lib/empresa-context';
import { exportarCsv } from '@/lib/gemape';
import { lerItensEstoque } from '@/lib/itens-estoque-modulo';
import { prepararMinimoUnico } from '@/lib/estoque-configuracao';
import { CLASSE_DO_NIVEL, nivelDoAlerta, TEXTO_DO_NIVEL_ALERTA } from '@/lib/estoque-epi-visao';
import { estadoEstoqueModulo } from '@/lib/estoque-tamanho';
import { useCaixasFerramentas, useEmpresas, useMovimentacoes, useSalvar, useTodosCaixaItens } from '@/lib/hooks-gemape';
import { agruparEstoquePorGrupo, type GrupoDeEstoque } from '@/lib/estoque-por-grupo';
import { posicaoDasFerramentas, type PosicaoDaFerramenta } from '@/lib/estoque-ferramentas-posicao';
import { combinaBuscaTolerante } from '@/lib/busca-tolerante';
import { useParametrosBase } from '@/lib/use-parametros-base';
import { AlternarDensidade } from '@/components/AlternarDensidade';
import { CarimboAtualizacao } from '@/components/CarimboAtualizacao';
import { BarraDeFiltros } from '@/components/layout/BarraDeFiltros';
import { MinimoEditavel } from '@/components/modules/MinimoEditavel';
import { ControleEstoqueModulo } from '@/components/modules/ControleEstoqueModulo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// O EPI tem a sua tela de Estoque (EstoqueEpiModulo, decisão 329): esta é a dos uniformes e das ferramentas.
type ModuloEstoque = 'uniforme' | 'ferramenta';

export function EstoqueModulo({ modulo, buscaInicial = '' }: { modulo: ModuloEstoque; buscaInicial?: string }) {
  const { empresaId } = useEmpresa();
  const parametros = useParametrosBase();
  const [itemId, setItemId] = useState<string | null>(null);
  // Busca por palavra-chave (decisão 339): código, nome do item ou empresa, sem acento e sem diferenciar maiúscula.
  const [busca, setBusca] = useState(buscaInicial);
  // Ferramentas: botão que troca a lista pelo estoque consolidado por posição (guardada na caixa, com empregado, sem caixa).
  const [porPosicao, setPorPosicao] = useState(false);
  // Ferramentas: o estoque também se vê por grupo (chave L, chave de fenda...), com os saldos somados.
  const [porGrupo, setPorGrupo] = useState(false);
  const tabela = modulo === 'uniforme' ? 'uniformes' : 'ferramentas';
  const salvar = useSalvar(tabela, ['estoque-modulo']);
  // Ferramentas (decisão 379): o saldo se reparte entre as caixas, os empregados e o que está sem caixa, e tem de bater com as entradas e as baixas. As entradas e saídas em si ficam em Relatórios > Entradas e saídas.
  const ferr = modulo === 'ferramenta';
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
    .filter((item) => combinaBuscaTolerante(busca, item.codigo_sku, item.nome, nomeDaEmpresa(item.empresa_id)))
    .map((item) => ({ item, estado: estadoEstoqueModulo(parametros, modulo, item) }));
  // Estoque mínimo editado no próprio campo da tabela, como no Estoque de EPIs e uniformes (decisão 416): sem botão nem janela.
  function gravarMinimo(item: (typeof itens)[number], texto: string): boolean {
    if (salvar.isPending) return false;
    try {
      const { estoque_minimo } = prepararMinimoUnico(texto);
      salvar.mutate({ id: item.id, valores: { estoque_minimo } });
      return true;
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : 'Estoque mínimo inválido.');
      return false;
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
        <CarimboAtualizacao className="self-center" />
        <AlternarDensidade />
        {ferr && <Button type="button" variant={porGrupo ? 'default' : 'outline'} aria-pressed={porGrupo} onClick={() => { setPorGrupo((v) => !v); setPorPosicao(false); }}>{porGrupo ? 'Ver estoque por item' : 'Estoque por grupo'}</Button>}
        {ferr && <Button type="button" variant={porPosicao ? 'default' : 'outline'} aria-pressed={porPosicao} onClick={() => { setPorPosicao((v) => !v); setPorGrupo(false); }}>{porPosicao ? 'Ver estoque por item' : 'Estoque por posição'}</Button>}
        <Button variant="outline" hidden={porPosicao || porGrupo} disabled={isLoading || linhas.length === 0} onClick={() =>
          exportarCsv(`estoque-${modulo}`, linhas.map(({ item, estado }) => ({
            Código: item.codigo_sku,
            Empresa: nomeDaEmpresa(item.empresa_id),
            Item: item.nome,
            ...(ferr ? (() => { const p = posicoes.get(item.id); return { Caixa: codigoDaCaixa(p?.caixaId ?? null), 'Guardada na caixa': p?.guardada ?? 0, 'Com empregado': p?.comEmpregado ?? 0, 'Sem caixa': p?.semCaixa ?? 0, Divergência: p?.divergencias.join(' ') ?? '' }; })() : {}),
            Saldo: estado.saldo,
            'Saldo histórico fora da seleção': estado.saldoForaDaSelecao,
            'Estoque mínimo': estado.minimo,
            'Saldo por tamanho': estado.detalheSaldo,
            'Mínimo por tamanho': estado.detalheMinimo,
            Alerta: textoDe(estado),
          })))
        }>Exportar CSV</Button>
      </div>
      {ferr && porGrupo && <EstoquePorGrupo grupos={agruparEstoquePorGrupo(linhas.map(({ item }) => item), posicoes)} />}
      {ferr && porPosicao && <ConsolidadoPorPosicao linhas={linhas.map(({ item }) => item)} posicoes={posicoes} />}
      {!(ferr && (porPosicao || porGrupo)) && <div className="panel overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Código</TableHead><TableHead>Item</TableHead><TableHead>Empresa</TableHead>
            {ferr && <><TableHead>Caixa</TableHead></>}
            <TableHead className="text-right">Saldo</TableHead>
            {ferr && <><TableHead className="text-right">Guardada na caixa</TableHead><TableHead className="text-right">Com empregado</TableHead><TableHead className="text-right">Sem caixa</TableHead></>}
            <TableHead className="text-right">Estoque mínimo</TableHead>
            <TableHead>Alerta</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <LinhasEsqueleto colunas={ferr ? 10 : 6} />
              : linhas.length === 0 ? <TableRow><TableCell colSpan={ferr ? 10 : 6}>{busca.trim() ? 'Nenhum item para a busca.' : 'Nenhum item cadastrado.'}</TableCell></TableRow>
                : linhas.map(({ item, estado }) => <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.codigo_sku}</TableCell>
                  <TableCell>{item.nome}</TableCell>
                  <TableCell>{nomeDaEmpresa(item.empresa_id)}</TableCell>
                  {ferr && <>
                    <TableCell className="font-mono text-xs">{codigoDaCaixa(posicoes.get(item.id)?.caixaId ?? null)}</TableCell>
                  </>}
                  <TableCell className="text-right">{estado.saldo}{estado.detalheSaldo && <p className="text-xs text-muted-foreground">{estado.detalheSaldo}</p>}{estado.saldoForaDaSelecao !== 0 && <p className="text-xs text-muted-foreground">Saldo histórico fora da seleção: {estado.saldoForaDaSelecao}</p>}</TableCell>
                  {ferr && <>
                    <TableCell className="text-right">{posicoes.get(item.id)?.guardada ?? 0}</TableCell>
                    <TableCell className="text-right">{posicoes.get(item.id)?.comEmpregado ?? 0}</TableCell>
                    <TableCell className={`text-right ${(posicoes.get(item.id)?.semCaixa ?? 0) < 0 ? 'font-bold text-destructive' : ''}`}>{posicoes.get(item.id)?.semCaixa ?? 0}</TableCell>
                  </>}
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}><MinimoEditavel className="ml-auto text-right" valor={estado.minimo} rotulo={item.nome} onSalvar={(texto) => gravarMinimo(item, texto)} />{estado.detalheMinimo && <p className="text-xs text-muted-foreground">{estado.detalheMinimo}</p>}</TableCell>
                  <TableCell className={CLASSE_DO_NIVEL[nivelDe(estado)]}>
                    {textoDe(estado) || '—'}
                    {(posicoes.get(item.id)?.divergencias ?? []).map((d) => <p key={d} className="text-xs font-bold text-destructive">Não bate: {d}</p>)}
                  </TableCell>
                </TableRow>)}
          </TableBody>
        </Table>
      </div>}
      {ferr && !porPosicao && !porGrupo && <PosicaoPorCaixa caixas={caixas.filter((c) => itens.some((i) => i.empresa_id === c.empresa_id) || empresaId === TODAS)} itensDeCaixa={itensDeCaixa} itens={itens} posicoes={posicoes} />}
      {modulo !== 'ferramenta' && <ControleEstoqueModulo modulo={modulo} />}
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
            <TableHead className="text-right">Cadastrada</TableHead>
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
                  <TableCell className="text-right">{p.comEmpregado}</TableCell>
                  <TableCell className="text-right font-semibold">{p.guardada}</TableCell>
                  <TableCell className="text-right">{p.saldo}</TableCell>
                  <TableCell className={p.divergencias.length ? 'font-bold text-destructive' : ''}>{p.divergencias.length ? 'Não bate' : 'Sim'}</TableCell>
                </TableRow>
              )),
              <TableRow key={`${caixa.id}-total`} className="bg-muted/40 font-semibold">
                <TableCell colSpan={3}>Total da caixa {caixa.codigo}</TableCell>
                <TableCell className="text-right">{linhas.reduce((t, l) => t + l.cadastrada, 0)}</TableCell>
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

// Estoque consolidado por posição: cada ferramenta com o saldo somado das empresas e repartido entre guardada na caixa, com empregado e sem caixa.
function ConsolidadoPorPosicao({ linhas, posicoes }: { linhas: { id: string; codigo_sku: string | null; nome: string }[]; posicoes: Map<string, PosicaoDaFerramenta> }) {
  const grupos = new Map<string, { codigo: string; nome: string; saldo: number; guardada: number; comEmpregado: number; semCaixa: number }>();
  for (const item of linhas) {
    const p = posicoes.get(item.id);
    const chave = `${item.codigo_sku ?? ''}|${item.nome}`;
    const g = grupos.get(chave) ?? { codigo: item.codigo_sku ?? '—', nome: item.nome, saldo: 0, guardada: 0, comEmpregado: 0, semCaixa: 0 };
    g.saldo += p?.saldo ?? 0; g.guardada += p?.guardada ?? 0; g.comEmpregado += p?.comEmpregado ?? 0; g.semCaixa += p?.semCaixa ?? 0;
    grupos.set(chave, g);
  }
  const lista = [...grupos.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const total = (campo: 'saldo' | 'guardada' | 'comEmpregado' | 'semCaixa') => lista.reduce((t, g) => t + g[campo], 0);
  return (
    <section className="space-y-2" aria-labelledby="estoque-por-posicao">
      <h2 id="estoque-por-posicao" className="text-lg font-semibold">Estoque consolidado por posição</h2>
      <p className="text-sm text-muted-foreground">O saldo de cada ferramenta, somadas as empresas, repartido entre o que está guardado nas caixas, com empregados e sem caixa.</p>
      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Código</TableHead><TableHead>Ferramenta</TableHead>
            <TableHead className="text-right">Guardada na caixa</TableHead><TableHead className="text-right">Com empregado</TableHead>
            <TableHead className="text-right">Sem caixa</TableHead><TableHead className="text-right">Saldo total</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {lista.length === 0 ? <TableRow><TableCell colSpan={3 + 3}>Nenhum item para mostrar.</TableCell></TableRow> : lista.map((g) => (
              <TableRow key={`${g.codigo}|${g.nome}`}>
                <TableCell className="font-mono text-xs">{g.codigo}</TableCell><TableCell>{g.nome}</TableCell>
                <TableCell className="text-right">{g.guardada}</TableCell><TableCell className="text-right">{g.comEmpregado}</TableCell>
                <TableCell className="text-right">{g.semCaixa}</TableCell><TableCell className="text-right font-semibold">{g.saldo}</TableCell>
              </TableRow>
            ))}
            {lista.length > 0 && <TableRow className="bg-muted/40 font-semibold">
              <TableCell colSpan={2}>Total</TableCell>
              <TableCell className="text-right">{total('guardada')}</TableCell><TableCell className="text-right">{total('comEmpregado')}</TableCell>
              <TableCell className="text-right">{total('semCaixa')}</TableCell><TableCell className="text-right">{total('saldo')}</TableCell>
            </TableRow>}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

// Estoque por grupo: cada grupo de ferramentas com o saldo somado e repartido entre guardada na caixa, com empregado e sem caixa; "Ver itens" abre as ferramentas do grupo.
function EstoquePorGrupo({ grupos }: { grupos: GrupoDeEstoque[] }) {
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const alternar = (grupo: string) => setAbertos((a) => { const n = new Set(a); if (n.has(grupo)) n.delete(grupo); else n.add(grupo); return n; });
  const total = (campo: 'saldo' | 'guardada' | 'comEmpregado' | 'semCaixa' | 'minimo') => grupos.reduce((t, g) => t + g[campo], 0);
  return (
    <section className="space-y-2" aria-labelledby="estoque-por-grupo">
      <h2 id="estoque-por-grupo" className="text-lg font-semibold">Estoque por grupo</h2>
      <p className="text-sm text-muted-foreground">As ferramentas agrupadas pelo grupo do cadastro (chave L, chave de fenda...), com o saldo somado e repartido entre as caixas, os empregados e o que está sem caixa.</p>
      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Grupo</TableHead><TableHead className="text-right">Ferramentas</TableHead>
            <TableHead className="text-right">Guardada na caixa</TableHead><TableHead className="text-right">Com empregado</TableHead>
            <TableHead className="text-right">Sem caixa</TableHead><TableHead className="text-right">Saldo total</TableHead>
            <TableHead className="text-right">Estoque mínimo</TableHead><TableHead>Alerta</TableHead><TableHead><span className="sr-only">Itens do grupo</span></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {grupos.length === 0 ? <TableRow><TableCell colSpan={9}>Nenhum item para mostrar.</TableCell></TableRow> : grupos.flatMap((g) => [
              <TableRow key={g.grupo}>
                <TableCell className="font-medium">{g.grupo}</TableCell>
                <TableCell className="text-right">{g.itens.length}</TableCell>
                <TableCell className="text-right">{g.guardada}</TableCell><TableCell className="text-right">{g.comEmpregado}</TableCell>
                <TableCell className="text-right">{g.semCaixa}</TableCell><TableCell className="text-right font-semibold">{g.saldo}</TableCell>
                <TableCell className="text-right">{g.minimo}</TableCell>
                <TableCell className={g.abaixoDoMinimo > 0 ? 'font-bold text-destructive' : ''}>{g.abaixoDoMinimo > 0 ? `${g.abaixoDoMinimo} abaixo do mínimo` : '—'}</TableCell>
                <TableCell><Button type="button" size="sm" variant="outline" aria-expanded={abertos.has(g.grupo)} onClick={() => alternar(g.grupo)}>{abertos.has(g.grupo) ? 'Ocultar itens' : 'Ver itens'}</Button></TableCell>
              </TableRow>,
              ...(abertos.has(g.grupo) ? g.itens.map(({ item, posicao }) => (
                <TableRow key={`${g.grupo}-${item.id}`} className="bg-muted/30 text-sm">
                  <TableCell className="pl-8"><span className="font-mono text-xs">{item.codigo_sku}</span> {item.nome}</TableCell>
                  <TableCell />
                  <TableCell className="text-right">{posicao.guardada}</TableCell><TableCell className="text-right">{posicao.comEmpregado}</TableCell>
                  <TableCell className="text-right">{posicao.semCaixa}</TableCell><TableCell className="text-right">{posicao.saldo}</TableCell>
                  <TableCell className="text-right">{Number(item.estoque_minimo) || 0}</TableCell><TableCell /><TableCell />
                </TableRow>
              )) : []),
            ])}
            {grupos.length > 0 && <TableRow className="bg-muted/40 font-semibold">
              <TableCell>Total</TableCell><TableCell className="text-right">{grupos.reduce((t, g) => t + g.itens.length, 0)}</TableCell>
              <TableCell className="text-right">{total('guardada')}</TableCell><TableCell className="text-right">{total('comEmpregado')}</TableCell>
              <TableCell className="text-right">{total('semCaixa')}</TableCell><TableCell className="text-right">{total('saldo')}</TableCell>
              <TableCell className="text-right">{total('minimo')}</TableCell><TableCell /><TableCell />
            </TableRow>}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
