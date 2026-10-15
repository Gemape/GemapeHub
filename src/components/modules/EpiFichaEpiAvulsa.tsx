import { useState, useEffect } from "react";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { empresasParaEscolha } from "@/lib/empresas";
import { montarFichaEpiAvulsaHtml } from "@/lib/ficha-epi-avulsa-html";
import { ehBaixa } from "@/lib/historico-movimentacoes";
import { lerHistoricoEpiEmpregado, type MovimentacaoFicha } from "@/lib/historico-epi-empregado";
import { useEmpresas, useItens, useEmpregados } from "@/lib/hooks-gemape";
import { TAMANHO_DISPONIVEL } from "@/components/SeletorTamanho";
import { nomeTamanhoGravado } from "@/lib/estoque-tamanho";
import { useParametrosBase } from "@/lib/use-parametros-base";

export function EpiFichaEpiAvulsa() {
  const { empresaId } = useEmpresa();
  const [empresaSel, setEmpresaSel] = useState(empresaId !== TODAS ? empresaId : "");
  const [empregadoId, setEmpregadoId] = useState("");

  const { data: empresas = [] } = useEmpresas();
  // Empresa inativa não é escolhida: se o cabeçalho está nela, a escolha começa vazia.
  useEffect(() => {
    if (empresas.length > 0 && empresaSel && !empresasParaEscolha(empresas).some((e) => e.id === empresaSel)) setEmpresaSel("");
  }, [empresas, empresaSel]);
  const { data: empregados = [] } = useEmpregados(empresaSel || TODAS);
  const { data: itens = [] } = useItens("epi", TODAS);
  const empregado = empregados.find((e) => e.id === empregadoId);
  const empresa = empresas.find((e) => e.id === empresaSel);
  const parametros = useParametrosBase();

  async function gerarFicha() {
    if (!empregado || !empresa) {
      alert("Selecione um empregado.");
      return;
    }

    // Histórico inteiro do empregado nesta empresa, lido do banco na hora de gerar a ficha.
    let historico: MovimentacaoFicha[];
    try {
      historico = await lerHistoricoEpiEmpregado(supabase, {
        empregadoId: empregado.id,
        empresaId: empresa.id,
        comTamanho: TAMANHO_DISPONIVEL,
      });
    } catch (erro) {
      alert(`Não foi possível carregar o histórico: ${(erro as Error).message}`);
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
          baixaMotivo: ehBaixa({ tipo_movimentacao: h.tipo_movimentacao, motivo_baixa: h.motivo_baixa ?? null }) ? h.motivo_baixa : null,
          tamanho: nomeTamanhoGravado(parametros, h.tamanho_id),
        };
      }),
    });

    abrirDocumento({
      titulo: "Ficha de EPI",
      html,
      arquivo: nomeArquivoDocumento("Ficha de EPI", empregado.nome),
    });
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
            <Select value={empresaSel} onValueChange={(v) => { if (!v) return; setEmpresaSel(v); setEmpregadoId(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a empresa" />
              </SelectTrigger>
              <SelectContent>
                {empresasParaEscolha(empresas).map((e) => (
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
