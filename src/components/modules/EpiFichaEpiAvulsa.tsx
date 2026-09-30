import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { montarFichaEpiAvulsaHtml } from "@/lib/ficha-epi-avulsa-html";
import { useEmpresas, useItens, useEmpregados, useMovimentacoes } from "@/lib/hooks-gemape";

export function EpiFichaEpiAvulsa() {
  const { empresaId } = useEmpresa();
  const [empresaSel, setEmpresaSel] = useState(empresaId !== TODAS ? empresaId : "");
  const [empregadoId, setEmpregadoId] = useState("");

  const { data: empresas = [] } = useEmpresas();
  const { data: empregados = [] } = useEmpregados(empresaSel || TODAS);
  const { data: itens = [] } = useItens("epi", TODAS);
  const { data: movimentacoes = [] } = useMovimentacoes("epi", TODAS, 1000);

  const historico = movimentacoes.filter((m) => m.empregado_id === empregadoId);
  const empregado = empregados.find((e) => e.id === empregadoId);
  const empresa = empresas.find((e) => e.id === empresaSel);

  function gerarFicha() {
    if (!empregado || !empresa) {
      alert("Selecione um empregado.");
      return;
    }

    const html = montarFichaEpiAvulsaHtml({
      empresa,
      empregado,
      linhas: historico.map((h) => {
        const itemInfo = itens.find((i) => i.id === h.item_id);
        return {
          data: h.data_movimentacao,
          quantidade: h.quantidade,
          nome: itemInfo?.nome,
          ca: itemInfo?.ca,
          tipo: h.tipo_movimentacao,
        };
      }),
    });

    const win = window.open("", "_blank");
    win?.document.write(html);
    win?.document.close();
  }

  return (
    <div className="space-y-6">
      <div className="panel p-6 max-w-2xl mx-auto space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-bold">Gerar Ficha de EPI (Avulsa/Empregado)</h3>
          <p className="text-sm text-muted-foreground">
            Selecione o funcionário para gerar a ficha de controle de EPI completa com o histórico
            de movimentações.
          </p>
        </div>

        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label>Empresa</Label>
            <Select value={empresaSel} onValueChange={setEmpresaSel}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a empresa" />
              </SelectTrigger>
              <SelectContent>
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome_fantasia}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Empregado</Label>
            <Select value={empregadoId} onValueChange={setEmpregadoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o empregado" />
              </SelectTrigger>
              <SelectContent>
                {empregados.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={gerarFicha} disabled={!empregadoId} className="w-full sm:w-auto">
            Gerar Ficha para Impressão
          </Button>
        </div>
      </div>
    </div>
  );
}
