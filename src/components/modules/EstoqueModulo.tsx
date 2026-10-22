import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/lib/empresa-context';
import { MODO_DEMO } from '@/lib/modo-demo';
import { exportarCsv } from '@/lib/gemape';
import { lerItensEstoque } from '@/lib/itens-estoque-modulo';
import { prepararEstoqueFerramenta, prepararMinimoUnico, prepararMinimosEstoque, tamanhosConfiguraveisNoModulo } from '@/lib/estoque-configuracao';
import { controlaTamanho, estadoEstoqueModulo, nomeTamanho, preservarMinimosNaoSelecionados, tamanhosAutorizadosDoProduto, tamanhosDisponiveisDoProduto } from '@/lib/estoque-tamanho';
import { useEmpresas, useSalvar } from '@/lib/hooks-gemape';
import { estaAtivo } from '@/lib/parametros-base';
import { useParametrosBase } from '@/lib/use-parametros-base';
import { EpiControleEstoque } from '@/components/modules/EpiControleEstoque';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type ModuloEstoque = 'epi' | 'uniforme' | 'ferramenta';

export function EstoqueModulo({ modulo }: { modulo: ModuloEstoque }) {
  const { empresaId } = useEmpresa();
  const parametros = useParametrosBase();
  const [itemId, setItemId] = useState<string | null>(null);
  const tabela = modulo === 'epi' ? 'epis' : modulo === 'uniforme' ? 'uniformes' : 'ferramentas';
  const salvar = useSalvar(tabela, ['estoque-modulo']);
  const { data: itens = [], isLoading, isError, error } = useQuery({
    queryKey: ['estoque-modulo', modulo, empresaId],
    queryFn: () => lerItensEstoque(supabase, modulo, empresaId),
  });
  const { data: empresas = [] } = useEmpresas();
  // Dec 238: o estoque é por empresa; cada linha diz de qual empresa é, para o mesmo código não parecer repetido.
  const nomeDaEmpresa = (id: string | null) => empresas.find((e) => e.id === id)?.nome_fantasia ?? '—';
  const linhas = itens.map((item) => ({ item, estado: estadoEstoqueModulo(parametros, modulo, item) }));
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
        valores = prepararEstoqueFerramenta(String(formulario.get('estoque_minimo') ?? ''), String(formulario.get('estoque_atual') ?? ''));
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

  if (isError) return <p role="alert">Não foi possível carregar o estoque completo: {error.message}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Estoque</h2>
        <Button variant="outline" disabled={isLoading || itens.length === 0} onClick={() =>
          exportarCsv(`estoque-${modulo}`, linhas.map(({ item, estado }) => ({
            Código: item.codigo_sku,
            Empresa: nomeDaEmpresa(item.empresa_id),
            Item: item.nome,
            Saldo: estado.saldo,
            'Saldo histórico fora da seleção': estado.saldoForaDaSelecao,
            'Estoque mínimo': estado.minimo,
            'Saldo por tamanho': estado.detalheSaldo,
            'Mínimo por tamanho': estado.detalheMinimo,
            Alerta: estado.alerta ? `Abaixo do mínimo${estado.detalheAlerta ? `: ${estado.detalheAlerta}` : ''}` : '',
          })))
        }>Exportar CSV</Button>
      </div>
      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Código</TableHead><TableHead>Item</TableHead><TableHead>Empresa</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
            <TableHead className="text-right">Estoque mínimo</TableHead>
            <TableHead>Alerta</TableHead><TableHead />
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={7}>Carregando estoque…</TableCell></TableRow>
              : linhas.length === 0 ? <TableRow><TableCell colSpan={7}>Nenhum item cadastrado.</TableCell></TableRow>
                : linhas.map(({ item, estado }) => <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.codigo_sku}</TableCell>
                  <TableCell>{item.nome}</TableCell>
                  <TableCell>{nomeDaEmpresa(item.empresa_id)}</TableCell>
                  <TableCell className="text-right">{estado.saldo}{estado.detalheSaldo && <p className="text-xs text-muted-foreground">{estado.detalheSaldo}</p>}{estado.saldoForaDaSelecao !== 0 && <p className="text-xs text-muted-foreground">Saldo histórico fora da seleção: {estado.saldoForaDaSelecao}</p>}</TableCell>
                  <TableCell className="text-right">{estado.minimo}{estado.detalheMinimo && <p className="text-xs text-muted-foreground">{estado.detalheMinimo}</p>}</TableCell>
                  <TableCell className={estado.alerta ? 'font-bold text-destructive' : ''}>
                    {estado.alerta ? `Abaixo do mínimo${estado.detalheAlerta ? `: ${estado.detalheAlerta}` : ''}` : '—'}
                  </TableCell>
                  <TableCell><Button requiresWrite variant="outline" size="sm" onClick={() => setItemId(item.id)}>Configurar</Button></TableCell>
                </TableRow>)}
          </TableBody>
        </Table>
      </div>
      {modulo === 'epi' && <EpiControleEstoque />}
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
              <p className="text-xs text-muted-foreground">O ajuste altera o saldo diretamente, inclusive após movimentações.</p>
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
