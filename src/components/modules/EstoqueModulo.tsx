import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/lib/empresa-context';
import { exportarCsv } from '@/lib/gemape';
import { lerItensEstoque } from '@/lib/itens-estoque-modulo';
import { estadoEstoqueModulo } from '@/lib/estoque-tamanho';
import { useParametrosBase } from '@/lib/use-parametros-base';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type ModuloEstoque = 'epi' | 'uniforme' | 'ferramenta';

export function EstoqueModulo({ modulo }: { modulo: ModuloEstoque }) {
  const { empresaId } = useEmpresa();
  const parametros = useParametrosBase();
  const { data: itens = [], isLoading, isError, error } = useQuery({
    queryKey: ['estoque-modulo', modulo, empresaId],
    queryFn: () => lerItensEstoque(supabase, modulo, empresaId),
  });
  const linhas = itens.map((item) => ({ item, estado: estadoEstoqueModulo(parametros, modulo, item) }));

  if (isError) return <p role="alert">Não foi possível carregar o estoque completo: {error.message}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Estoque</h2>
        <Button variant="outline" disabled={isLoading || itens.length === 0} onClick={() =>
          exportarCsv(`estoque-${modulo}`, linhas.map(({ item, estado }) => ({
            Código: item.codigo_sku,
            Item: item.nome,
            Saldo: estado.saldo,
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
            <TableHead>Código</TableHead><TableHead>Item</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
            <TableHead className="text-right">Estoque mínimo</TableHead>
            <TableHead>Alerta</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={5}>Carregando estoque…</TableCell></TableRow>
              : linhas.length === 0 ? <TableRow><TableCell colSpan={5}>Nenhum item cadastrado.</TableCell></TableRow>
                : linhas.map(({ item, estado }) => <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.codigo_sku}</TableCell>
                  <TableCell>{item.nome}</TableCell>
                  <TableCell className="text-right">{estado.saldo}{estado.detalheSaldo && <p className="text-xs text-muted-foreground">{estado.detalheSaldo}</p>}</TableCell>
                  <TableCell className="text-right">{estado.minimo}{estado.detalheMinimo && <p className="text-xs text-muted-foreground">{estado.detalheMinimo}</p>}</TableCell>
                  <TableCell className={estado.alerta ? 'font-bold text-destructive' : ''}>
                    {estado.alerta ? `Abaixo do mínimo${estado.detalheAlerta ? `: ${estado.detalheAlerta}` : ''}` : '—'}
                  </TableCell>
                </TableRow>)}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
