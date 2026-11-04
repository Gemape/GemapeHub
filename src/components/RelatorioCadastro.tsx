import { FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { camposPadrao, montarRelatorioCadastroHtml, type CampoRelatorio } from "@/lib/relatorio-cadastro";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";

// Botão "Relatório" dos Cadastros (decisão 377): abre a janela com uma caixa de marcação por campo e gera o relatório no visualizador do sistema, com a lista como está na tela
// (a busca vale). `nome` é o plural em minúsculas ("clientes"), usado no título e no nome do arquivo.
export function RelatorioCadastro<T>({ nome, campos, linhas, empresa, filtro }: { nome: string; campos: readonly CampoRelatorio<T>[]; linhas: readonly T[]; empresa?: string; filtro?: string }) {
  const [aberto, setAberto] = useState(false);
  const [escolhidos, setEscolhidos] = useState<string[]>(() => camposPadrao(campos));
  const alternar = (id: string, marcado: boolean) => setEscolhidos((a) => (marcado ? [...a, id] : a.filter((x) => x !== id)));
  const titulo = `Relatório de ${nome}`;

  function gerar() {
    try {
      const html = montarRelatorioCadastroHtml({ titulo, campos, escolhidos, linhas, empresa, subtitulos: filtro ? [`Busca: ${filtro}`] : [] });
      abrirDocumento({ titulo, html, arquivo: nomeArquivoDocumento(titulo) });
      setAberto(false);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível gerar o relatório.");
    }
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setAberto(true)}>
        <FileText className="h-4 w-4" /> Relatório
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
            <DialogDescription>Marque os campos que devem sair no relatório. Sai a lista como está na tela ({linhas.length} registro{linhas.length === 1 ? "" : "s"}).</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setEscolhidos(campos.map((c) => c.id))}>Marcar todos</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setEscolhidos([])}>Limpar</Button>
          </div>
          <fieldset className="grid gap-2 sm:grid-cols-2" aria-label="Campos do relatório">
            {campos.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <Checkbox id={`rel-${nome}-${c.id}`} checked={escolhidos.includes(c.id)} onCheckedChange={(v) => alternar(c.id, v === true)} />
                <Label htmlFor={`rel-${nome}-${c.id}`} className="cursor-pointer font-normal">{c.rotulo}</Label>
              </div>
            ))}
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button type="button" disabled={escolhidos.length === 0} onClick={gerar}>Gerar relatório</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
