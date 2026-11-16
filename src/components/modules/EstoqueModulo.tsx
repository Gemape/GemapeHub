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
import { useCaixasFerramentas, useEmpregados, useEmpresas, useMovimentacoes, useSalvar, useTodosCaixaItens } from '@/lib/hooks-gemape';
import { controleDaFerramenta } from '@/lib/controle-caixa';
import { posicaoDasFerramentas, type PosicaoDaFerramenta } from '@/lib/estoque-ferramentas-posicao';
import { combinaBuscaTolerante } from '@/lib/busca-tolerante';
import { useParametrosBase } from '@/lib/use-parametros-base';
import { temValorInformativo } from '@/lib/valor-informativo';
import { AlternarDensidade } from '@/components/AlternarDensidade';
import { CarimboAtualizacao } from '@/components/CarimboAtualizacao';
import { BarraDeFiltros } from '@/components/layout/BarraDeFiltros';
import { MinimoEditavel } from '@/components/modules/MinimoEditavel';
import { ExtratoFerramenta, type AlvoDoExtrato } from '@/components/modules/ExtratoFerramenta';
import { ControleEstoqueModulo } from '@/components/modules/ControleEstoqueModulo';
import { Button } from '@/components/ui/button';
import { NomeComResumo } from '@/components/GavetaResumo';
import { GavetaItemMovimentado } from '@/components/modules/GavetasDeResumo';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// O EPI tem a sua tela de Estoque (EstoqueEpiModulo, decisão 329): esta é a dos uniformes e das ferramentas.
type ModuloEstoque = 'uniforme' | 'ferramenta';

export function EstoqueModulo({ modulo }: { modulo: ModuloEstoque }) {
  const { empresaId } = useEmpresa();
  const parametros = useParametrosBase();
  const [itemId, setItemId] = useState<string | null>(null);
  // Busca por palavra-chave (decisão 339): código, nome do item ou empresa, sem acento e sem diferenciar maiúscula.
  const [busca, setBusca] = useState('');
  // Ferramentas: botão que troca a lista pelo estoque consolidado por posição (guardada na caixa, com empregado, sem caixa).
  const [porPosicao, setPorPosicao] = useState(false);
  const tabela = modulo === 'uniforme' ? 'uniformes' : 'ferramentas';
  const salvar = useSalvar(tabela, ['estoque-modulo']);
  // Ferramentas (decisão 379): o saldo se reparte entre as caixas, os empregados e o que está sem caixa, e tem de bater com as entradas e as baixas.
  const ferr = modulo === 'ferramenta';
  const { data: movimentos = [] } = useMovimentacoes('ferramenta', empresaId);
  const { data: itensDeCaixa = [] } = useTodosCaixaItens();
  const { data: caixas = [] } = useCaixasFerramentas(TODAS, '');
  const { data: itens = [], isLoading, isError, error } = useQuery({
    queryKey: ['estoque-modulo', modulo, empresaId],
    queryFn: () => lerItensEstoque(supabase, modulo, empresaId),
  });
  const { data: empresas = [] } = useEmpresas();
  const { data: empregados = [] } = useEmpregados(TODAS);
  const [extrato, setExtrato] = useState<AlvoDoExtrato | null>(null);
  const [resumo, setResumo] = useState<{ id: string; nome: string; empresa: string | null; codigo: string | null } | null>(null);
  // Dec 238: o estoque é por empresa; cada linha diz de qual empresa é, para o mesmo código não parecer repetido.
  const nomeDaEmpresa = (id: string | null) => empresas.find((e) => e.id === id)?.nome_fantasia ?? '—';
  const posicoes = useMemo(
    () => new Map<string, PosicaoDaFerramenta>(ferr ? posicaoDasFerramentas(itens, movimentos, itensDeCaixa).map((p) => [p.ferramentaId, p]) : []),
    [ferr, itens, movimentos, itensDeCaixa],
  );
  // Onde cada ferramenta está: em qual caixa, com qual empregado e quanto está sem caixa (clique na linha).
  const ondeEsta = (ids: string[]) => {
    const caixasDe = itensDeCaixa.filter((i) => ids.includes(i.ferramenta_id)).map((i) => ({ codigo: caixas.find((c) => c.id === i.caixa_id)?.codigo ?? '—', quantidade: Number(i.quantidade) || 0 }));
    const porEmpregado = new Map<string, number>();
    for (const id of ids) {
      const doItem = movimentos.filter((m) => m.item_id === id && m.empregado_id);
      for (const eid of new Set(doItem.map((m) => m.empregado_id as string))) {
        const q = controleDaFerramenta(doItem.filter((m) => m.empregado_id === eid), id).comEmpregado;
        if (q > 0) porEmpregado.set(eid, (porEmpregado.get(eid) ?? 0) + q);
      }
    }
    const comEmpregados = [...porEmpregado].map(([eid, quantidade]) => ({ nome: empregados.find((e) => e.id === eid)?.nome ?? 'Empregado não encontrado', quantidade }));
    const semCaixa = ids.reduce((t, id) => t + (posicoes.get(id)?.semCaixa ?? 0), 0);
    const guardada = ids.reduce((t, id) => t + (posicoes.get(id)?.guardada ?? 0), 0);
    return { caixasDe, comEmpregados, semCaixa, guardada };
  };
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
        {ferr && <Button type="button" variant={porPosicao ? 'default' : 'outline'} aria-pressed={porPosicao} onClick={() => setPorPosicao((v) => !v)}>{porPosicao ? 'Ver estoque por item' : 'Estoque por posição'}</Button>}
        <Button variant="outline" hidden={porPosicao} disabled={isLoading || linhas.length === 0} onClick={() =>
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
      {ferr && porPosicao && <ConsolidadoPorPosicao linhas={linhas.map(({ item }) => item)} posicoes={posicoes} onAbrir={setExtrato} />}
      {!(ferr && porPosicao) && <div className="panel overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Código</TableHead><TableHead>Item</TableHead><TableHead>Empresa</TableHead>
            {ferr && <><TableHead>Caixa</TableHead><TableHead className="text-right">Entradas</TableHead><TableHead className="text-right">Baixas</TableHead></>}
            <TableHead className="text-right">Saldo</TableHead>
            {ferr && <><TableHead className="text-right">Guardada na caixa</TableHead><TableHead className="text-right">Com empregado</TableHead><TableHead className="text-right">Sem caixa</TableHead></>}
            <TableHead className="text-right">Estoque mínimo</TableHead>
            <TableHead>Alerta</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <LinhasEsqueleto colunas={ferr ? 12 : 6} />
              : linhas.length === 0 ? <TableRow><TableCell colSpan={ferr ? 12 : 6}>{busca.trim() ? 'Nenhum item para a busca.' : 'Nenhum item cadastrado.'}</TableCell></TableRow>
                : linhas.map(({ item, estado }) => <TableRow key={item.id} {...(ferr ? linhaClicavel(() => setExtrato({ titulo: `${item.codigo_sku ?? ''} · ${item.nome} (${nomeDaEmpresa(item.empresa_id)})`, ids: [item.id] })) : {})}>
                  <TableCell className="font-mono text-xs">{item.codigo_sku}</TableCell>
                  <TableCell>{ferr ? <NomeComResumo rotulo={item.nome} aoAbrir={() => setResumo({ id: item.id, nome: item.nome, empresa: item.empresa_id, codigo: item.codigo_sku })}>{item.nome}</NomeComResumo> : item.nome}</TableCell>
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
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}><MinimoEditavel className="ml-auto text-right" valor={estado.minimo} rotulo={item.nome} onSalvar={(texto) => gravarMinimo(item, texto)} />{estado.detalheMinimo && <p className="text-xs text-muted-foreground">{estado.detalheMinimo}</p>}</TableCell>
                  <TableCell className={CLASSE_DO_NIVEL[nivelDe(estado)]}>
                    {textoDe(estado) || '—'}
                    {(posicoes.get(item.id)?.divergencias ?? []).map((d) => <p key={d} className="text-xs font-bold text-destructive">Não bate: {d}</p>)}
                  </TableCell>
                </TableRow>)}
          </TableBody>
        </Table>
      </div>}
      {ferr && <GavetaItemMovimentado
        modulo="ferramenta"
        alvo={resumo ? { id: resumo.id, campo: "item_id", titulo: resumo.nome, subtitulo: [resumo.codigo, nomeDaEmpresa(resumo.empresa)].filter(temValorInformativo).join(" · "), indicadores: [
          { rotulo: "Saldo", valor: posicoes.get(resumo.id)?.saldo ?? 0 },
          { rotulo: "Guardada na caixa", valor: posicoes.get(resumo.id)?.guardada ?? 0 },
          { rotulo: "Com empregado", valor: posicoes.get(resumo.id)?.comEmpregado ?? 0 },
          { rotulo: "Sem caixa", valor: posicoes.get(resumo.id)?.semCaixa ?? 0, alerta: (posicoes.get(resumo.id)?.semCaixa ?? 0) < 0 },
        ] } : null}
        aoFechar={() => setResumo(null)}
        aoAbrirFicha={() => { if (resumo) setExtrato({ titulo: `${resumo.codigo ?? ''} · ${resumo.nome} (${nomeDaEmpresa(resumo.empresa)})`, ids: [resumo.id] }); }}
        rotuloFicha="Abrir extrato completo"
      />}
      {ferr && <ExtratoFerramenta alvo={extrato} movimentos={movimentos} saldo={(extrato?.ids ?? []).reduce((t, id) => t + (posicoes.get(id)?.saldo ?? 0), 0)} onde={ondeEsta(extrato?.ids ?? [])} nomeEmpregado={(id) => empregados.find((e) => e.id === id)?.nome ?? 'Empregado não encontrado'} empresa={empresaId === TODAS ? 'Todas as empresas' : nomeDaEmpresa(empresaId)} onFechar={() => setExtrato(null)} />}
      {ferr && !porPosicao && <PosicaoPorCaixa caixas={caixas.filter((c) => itens.some((i) => i.empresa_id === c.empresa_id) || empresaId === TODAS)} itensDeCaixa={itensDeCaixa} itens={itens} posicoes={posicoes} />}
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

// Linha da tabela que abre o extrato: clique, e Enter ou espaço para quem usa o teclado.
const linhaClicavel = (abrir: () => void) => ({
  className: 'cursor-pointer', tabIndex: 0,
  onClick: abrir,
  onKeyDown: (e: React.KeyboardEvent) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); abrir(); } },
});

// Estoque consolidado por posição: cada ferramenta com o saldo somado das empresas e repartido entre guardada na caixa, com empregado e sem caixa.
function ConsolidadoPorPosicao({ linhas, posicoes, onAbrir }: { linhas: { id: string; codigo_sku: string | null; nome: string }[]; posicoes: Map<string, PosicaoDaFerramenta>; onAbrir: (alvo: AlvoDoExtrato) => void }) {
  const grupos = new Map<string, { ids: string[]; codigo: string; nome: string; saldo: number; guardada: number; comEmpregado: number; semCaixa: number }>();
  for (const item of linhas) {
    const p = posicoes.get(item.id);
    const chave = `${item.codigo_sku ?? ''}|${item.nome}`;
    const g = grupos.get(chave) ?? { ids: [], codigo: item.codigo_sku ?? '—', nome: item.nome, saldo: 0, guardada: 0, comEmpregado: 0, semCaixa: 0 };
    g.ids.push(item.id);
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
              <TableRow key={`${g.codigo}|${g.nome}`} {...linhaClicavel(() => onAbrir({ titulo: `${g.codigo} · ${g.nome}`, ids: g.ids }))}>
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

