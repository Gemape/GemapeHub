import { useState, useEffect } from "react";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";
import { AjudaTermo } from "@/components/AjudaTermo";
import { ProgressoRelatorio, type EstadoProgresso } from "@/components/ProgressoRelatorio";
import { percentualDaEtapa } from "@/lib/ler-todas";
import { ConfirmarFichaAvulsa } from "@/components/modules/ConfirmarFichaAvulsa";
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
import { linhasDaFichaEpi } from "@/lib/entrega-epi";
import { lerHistoricoEpiEmpregado, type MovimentacaoFicha } from "@/lib/historico-epi-empregado";
import { soEmpregadosDeEpi } from "@/lib/empregados-epi";
import { receptoresDeEntrega } from "@/lib/empregados-habilitados";
import { empregadoAtivo } from "@/lib/empregados";
import { useEmpresas, useItens, useEmpregados } from "@/lib/hooks-gemape";
import { TAMANHO_DISPONIVEL } from "@/components/SeletorTamanho";
import { nomeTamanhoGravado } from "@/lib/estoque-tamanho";
import { useParametrosBase } from "@/lib/use-parametros-base";

export function EpiFichaEpiAvulsa() {
  const { empresaId } = useEmpresa();
  const [empresaSel, setEmpresaSel] = useState(empresaId !== TODAS ? empresaId : "");
  const [empregadoId, setEmpregadoId] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [progresso, setProgresso] = useState<EstadoProgresso | null>(null);

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

    // Histórico inteiro do empregado nesta empresa, lido do banco na hora de gerar a ficha. A barra vai até 80% conforme as linhas lidas.
    let historico: MovimentacaoFicha[];
    setProgresso({ percentual: 0, texto: "Carregando dados de EPIs…" });
    try {
      historico = await lerHistoricoEpiEmpregado(supabase, {
        empregadoId: empregado.id,
        empresaId: empresa.id,
        comTamanho: TAMANHO_DISPONIVEL,
      }, (lidas, total) => setProgresso({ percentual: percentualDaEtapa(lidas, total, 0, 80), texto: "Carregando dados de EPIs…" }));
    } catch (erro) {
      setProgresso(null);
      alert(`Não foi possível carregar o histórico: ${(erro as Error).message}`);
      return;
    }

    // A janela de progresso não tem botão de fechar: qualquer falha daqui em diante precisa fechá-la.
    try {
      setProgresso({ percentual: 90, texto: "Montando a ficha…" });
      await new Promise((r) => setTimeout(r, 0)); // deixa a tela desenhar a etapa antes do trabalho síncrono
      const html = montarFichaEpiAvulsaHtml({
        empresa,
        empregado,
        linhas: linhasDaFichaEpi(historico, itens, (tamanhoId) => nomeTamanhoGravado(parametros, tamanhoId)),
      });
      setProgresso({ percentual: 100, texto: "Abrindo a ficha…" });
      abrirDocumento({
        titulo: "Ficha de EPI",
        html,
        arquivo: nomeArquivoDocumento("Ficha de EPI", empregado.nome),
      });
    } catch (erro) {
      alert(`Não foi possível gerar a ficha: ${(erro as Error).message}`);
    } finally {
      setProgresso(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="panel p-6 max-w-2xl mx-auto space-y-6">
        <div className="space-y-4">
          <h3 className="flex items-center gap-1.5 text-lg font-bold">Gerar Ficha de EPI (Avulsa/Empregado)<AjudaTermo termo="Ficha de EPI Avulsa">Use para itens de consumo corriqueiro (luva, óculos, protetor). Itens de maior custo e durabilidade (botina, capacete, cinto) vão pelo Termo de Entrega.</AjudaTermo></h3>
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
                {receptoresDeEntrega(empregados, soEmpregadosDeEpi, empregadoAtivo).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={() => setConfirmando(true)} disabled={!empregadoId} className="w-full sm:w-auto">
            Gerar Ficha para Impressão
          </Button>
        </div>
        <ProgressoRelatorio progresso={progresso} titulo="Gerando a Ficha de EPI" />
        <ConfirmarFichaAvulsa
          aberto={confirmando}
          onNao={() => setConfirmando(false)}
          onSim={() => {
            setConfirmando(false);
            void gerarFicha();
          }}
        />
      </div>
    </div>
  );
}
