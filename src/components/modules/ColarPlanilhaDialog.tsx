import { ClipboardPaste } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { empresasParaEscolha } from "@/lib/empresas";
import { linhasDaColagem, somarPorItem } from "@/lib/colar-planilha";
import { hojeLocal } from "@/lib/empregados";
import { useEmpresas, useItens, useRegistrarMovimentacoesLote } from "@/lib/hooks-gemape";
import { useAvisoNaoSalvo } from "@/lib/use-aviso-nao-salvo";

// Entrada de estoque em lote colando do Excel: o operador copia as colunas (código e quantidade) da planilha e cola aqui.
// A prévia confere cada linha contra o cadastro antes de lançar; nada é gravado enquanto houver linha com problema ou sem confirmação.
export function ColarPlanilhaDialog({ aberto, onAbertoMudou }: { aberto: boolean; onAbertoMudou: (aberto: boolean) => void }) {
  const { empresaId } = useEmpresa();
  const { data: empresas = [] } = useEmpresas();
  const opcoesEmpresa = empresasParaEscolha(empresas);
  const [empresaSel, setEmpresaSel] = useState("");
  const empresa = empresaSel || (opcoesEmpresa.some((e) => e.id === empresaId) ? empresaId : "");
  const [data, setData] = useState(hojeLocal());
  const [texto, setTexto] = useState("");
  const { data: itens = [], isLoading } = useItens("ferramenta", empresa || TODAS, "", aberto && Boolean(empresa));
  const registrar = useRegistrarMovimentacoesLote(["estoque-modulo"]);
  const aviso = useAvisoNaoSalvo(aberto);

  const linhas = useMemo(() => linhasDaColagem(texto, itens), [texto, itens]);
  const somadas = useMemo(() => somarPorItem(linhas), [linhas]);
  const comErro = linhas.filter((l) => l.erro).length;
  const podeLancar = Boolean(empresa) && linhas.length > 0 && comErro === 0 && !registrar.isPending;

  function fechar() {
    setTexto("");
    aviso.limpar();
    onAbertoMudou(false);
  }

  function lancar() {
    if (!podeLancar) return;
    registrar.mutate(
      somadas.map(({ item, quantidade }) => ({
        modulo: "ferramenta", item_id: item.id, veiculo_id: null, empresa_id: empresa, empregado_id: null, tipo_movimentacao: "Entrada",
        motivo_baixa: null, quantidade, onus_baixa: null, tipo_vistoria: null, sinalizar_ocorrencia: false, tipo_ocorrencia: null, conducao_ocorrencia: null,
        data_movimentacao: data, origem_local: null, destino_local: null, observacao: "Entrada em lote colada da planilha",
      })),
      { onSuccess: () => { toast.success(`${somadas.length} ${somadas.length === 1 ? "item lançado" : "itens lançados"} no estoque`); fechar(); } },
    );
  }

  return (
    <Dialog open={aberto} onOpenChange={aviso.aoMudarAberto((a) => { if (!a) fechar(); })}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Colar da planilha (entrada em lote)</DialogTitle>
          <DialogDescription>Copie as células no Excel (duas colunas: código e quantidade, com ou sem cabeçalho) e cole no quadro abaixo.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="colar-empresa">Estoque a alimentar (empresa)</Label>
            <Select value={empresa} onValueChange={setEmpresaSel}>
              <SelectTrigger id="colar-empresa"><SelectValue placeholder="Selecione o estoque" /></SelectTrigger>
              <SelectContent>{opcoesEmpresa.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome_fantasia}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="colar-data">Data da entrada</Label>
            <Input id="colar-data" type="date" value={data} max={hojeLocal()} onChange={(e) => setData(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="colar-texto">Células copiadas</Label>
          <Textarea id="colar-texto" rows={5} value={texto} onChange={(e) => { setTexto(e.target.value); aviso.aoAlterar(); }} placeholder={"FER-001\t10\nFER-002\t4"} className="font-mono text-xs" />
        </div>
        {linhas.length > 0 && (
          <div className="panel overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Linha</TableHead><TableHead>Código colado</TableHead><TableHead>Item do cadastro</TableHead><TableHead className="text-right">Qtde</TableHead><TableHead>Situação</TableHead></TableRow></TableHeader>
              <TableBody>
                {linhas.map((l) => (
                  <TableRow key={l.linha}>
                    <TableCell className="tabular-nums">{l.linha}</TableCell>
                    <TableCell className="font-mono text-xs">{l.codigo || "—"}</TableCell>
                    <TableCell>{l.item?.nome ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{l.quantidade ?? "—"}</TableCell>
                    <TableCell className={l.erro ? "font-medium text-destructive" : "text-emerald-700 dark:text-emerald-400"}>{l.erro ?? "Confere"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {empresa && isLoading && <p role="status" className="text-xs text-muted-foreground">Carregando o cadastro de ferramentas…</p>}
        <DialogFooter className="items-center gap-2">
          <p className="mr-auto text-xs text-muted-foreground" aria-live="polite">
            {linhas.length === 0 ? "" : comErro > 0 ? `${comErro} linha(s) com problema: corrija na planilha e cole de novo.` : `${somadas.length} ${somadas.length === 1 ? "item" : "itens"} para lançar (linhas do mesmo item são somadas).`}
          </p>
          <Button type="button" variant="outline" onClick={() => aviso.aoMudarAberto((a) => { if (!a) fechar(); })(false)}>Cancelar</Button>
          <Button type="button" disabled={!podeLancar} onClick={lancar}><ClipboardPaste className="mr-1 size-4" aria-hidden="true" />Lançar entradas</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
