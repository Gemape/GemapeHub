import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export type CampoEscolha = { id: string; rotulo: string; padrao?: boolean };

// Janela de personalização dos relatórios (decisão 377): uma caixa de marcação por campo, com Marcar todos e Limpar, e, quando a tela tem, caixas de opções do relatório (por
// exemplo, o resumo do topo ou os totais). Ao gerar entrega os ids marcados, na ordem da lista; sem nenhum campo o botão fica desabilitado.
export function EscolherCamposRelatorio({ aberto, onAberto, titulo, descricao, campos, opcoes = [], prefixo, onGerar }: {
  aberto: boolean;
  onAberto: (aberto: boolean) => void;
  titulo: string;
  descricao: string;
  campos: readonly CampoEscolha[];
  opcoes?: readonly CampoEscolha[];
  prefixo: string;
  onGerar: (campos: string[], opcoes: string[]) => void;
}) {
  const padrao = (l: readonly CampoEscolha[]) => l.filter((c) => c.padrao !== false).map((c) => c.id);
  const [marcados, setMarcados] = useState<string[]>(() => padrao(campos));
  const [marcadas, setMarcadas] = useState<string[]>(() => padrao(opcoes));
  // Cada abertura recomeça do padrão da tela.
  useEffect(() => {
    if (aberto) {
      setMarcados(padrao(campos));
      setMarcadas(padrao(opcoes));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);
  const alternar = (lista: string[], id: string, v: boolean) => (v ? [...lista, id] : lista.filter((x) => x !== id));
  const caixa = (c: CampoEscolha, lista: string[], mudar: (l: string[]) => void) => (
    <div key={c.id} className="flex items-center gap-2">
      <Checkbox id={`${prefixo}-${c.id}`} checked={lista.includes(c.id)} onCheckedChange={(v) => mudar(alternar(lista, c.id, v === true))} />
      <Label htmlFor={`${prefixo}-${c.id}`} className="cursor-pointer font-normal">{c.rotulo}</Label>
    </div>
  );
  return (
    <Dialog open={aberto} onOpenChange={onAberto}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setMarcados(campos.map((c) => c.id))}>Marcar todos</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setMarcados([])}>Limpar</Button>
        </div>
        <fieldset className="grid gap-2 sm:grid-cols-2" aria-label="Campos do relatório">
          {campos.map((c) => caixa(c, marcados, setMarcados))}
        </fieldset>
        {opcoes.length > 0 && (
          <fieldset className="space-y-2 border-t pt-3" aria-label="Opções do relatório">
            {opcoes.map((c) => caixa(c, marcadas, setMarcadas))}
          </fieldset>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onAberto(false)}>Cancelar</Button>
          <Button type="button" disabled={marcados.length === 0} onClick={() => onGerar(campos.map((c) => c.id).filter((id) => marcados.includes(id)), marcadas)}>Gerar relatório</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
