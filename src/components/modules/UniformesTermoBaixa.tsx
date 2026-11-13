import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { avisarComDesfazer } from "@/lib/toast-desfazer";
import { capitalizarTexto } from "@/lib/formatacao-cadastral";
import { useRef, useState } from "react";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { TODAS } from "@/lib/empresa-context";
import { empresasParaEscolha } from "@/lib/empresas";
import {
  useEmpresas,
  useItens,
  useEmpregados,
  useRegistrarMovimentacoesLote,
} from "@/lib/hooks-gemape";
import { bloqueioPorDemissao, hojeLocal } from "@/lib/empregados";
import { SeletorTamanho, TAMANHO_DISPONIVEL } from "@/components/SeletorTamanho";
import { nomeTamanho, tamanhoParaGravar, validarLinhasTamanho } from "@/lib/estoque-tamanho";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { empregadoDoTermo, validarSaidaDeUniformes } from "@/lib/termos-atomicos";
import { montarTermoBaixaUniformeHtml } from "@/lib/termo-baixa-uniforme-html";

interface ItemBaixa {
  item_id: string;
  quantidade: number;
  estado: string;
  // Tamanho da saída, quando o uniforme tem tamanho em Gerais (decisão 23).
  tamanho: string;
  observacao: string;
}

export function UniformesTermoBaixa() {
  const [empresaId, setEmpresaId] = useState("");
  const [empregadoId, setEmpregadoId] = useState("");
  const [dataBaixa, setDataBaixa] = useState(hojeLocal());
  const [motivoBaixa, setMotivoBaixa] = useState("Desgaste Natural");
  const [onusBaixa, setOnusBaixa] = useState("Da Empresa");
  const [itensBaixa, setItensBaixa] = useState<ItemBaixa[]>([]);

  const { data: empresas = [] } = useEmpresas();
  const { data: empregados = [] } = useEmpregados(empresaId || TODAS, true);
  // Lista completa só para conferir a demissão: quem já saiu da lista de ativos continua bloqueado.
  const { data: todosEmpregados = [] } = useEmpregados(empresaId || TODAS);
  const { data: uniformes = [] } = useItens("uniforme", empresaId || TODAS);
  const parametros = useParametrosBase();

  const registrarBaixas = useRegistrarMovimentacoesLote(["movimentacoes", "uniformes"], false);
  const queryClient = useQueryClient();
  const salvando = useRef(false);

  const empresa = empresas.find((e) => e.id === empresaId);
  const empregado = empregados.find((e) => e.id === empregadoId);

  function adicionarItem() {
    setItensBaixa([
      ...itensBaixa,
      { item_id: "", quantidade: 1, estado: "Usado", observacao: "", tamanho: "" },
    ]);
  }

  function removerItem(index: number) {
    setItensBaixa(itensBaixa.filter((_, i) => i !== index));
  }

  function atualizarItem(index: number, campo: keyof ItemBaixa, valor: string | number) {
    setItensBaixa((atuais) =>
      atuais.map((item, i) =>
        i !== index
          ? item
          : // Trocar o uniforme limpa o tamanho escolhido para o anterior.
            { ...item, [campo]: valor, ...(campo === "item_id" ? { tamanho: "" } : {}) },
      ),
    );
  }

  async function gerarTermo() {
    if (salvando.current) return;
    if (!empresaId || itensBaixa.length === 0) {
      alert("Preencha os campos obrigatórios e adicione pelo menos um item.");
      return;
    }
    if (!dataBaixa) {
      alert("Informe a data da baixa.");
      return;
    }
    const bloqueio = bloqueioPorDemissao(
      todosEmpregados.find((p) => p.id === empregadoId),
      "baixa",
      dataBaixa,
    );
    if (bloqueio) {
      alert(bloqueio);
      return;
    }

    // Não baixa mais do que o estoque disponível de cada uniforme.
    // Com tamanho, a conta é feita no saldo de cada tamanho.
    const erro =
      validarSaidaDeUniformes(itensBaixa, uniformes, "baixa") ??
      (TAMANHO_DISPONIVEL
        ? validarLinhasTamanho(itensBaixa, uniformes, parametros, "uniforme", "baixa")
        : null);
    if (erro) {
      alert(erro);
      return;
    }

    // Registra todas as baixas de uma vez: ou entram todas, ou nenhuma.
    salvando.current = true;
    try {
      await registrarBaixas.mutateAsync(
        itensBaixa.map((item) => ({
          modulo: "uniforme",
          tipo_movimentacao: "Saida",
          motivo_baixa: motivoBaixa,
          onus_baixa: onusBaixa,
          item_id: item.item_id,
          empresa_id: empresaId,
          empregado_id: empregadoDoTermo(empregadoId),
          quantidade: item.quantidade,
          ...(TAMANHO_DISPONIVEL ? { tamanho_id: tamanhoParaGravar(item.tamanho) } : {}),
          data_movimentacao: dataBaixa,
          observacao: `Baixa de uniforme via termo - Motivo: ${motivoBaixa} - Obs: ${capitalizarTexto(item.observacao)}`,
        })),
      );
    } catch {
      // A falha já aparece no aviso da gravação.
      return;
    } finally {
      salvando.current = false;
    }
    // Desfazer a baixa: devolve ao estoque com uma entrada igual (o histórico guarda a baixa e a correção, nada some).
    avisarComDesfazer("Baixa registrada", async () => {
      const { error } = await supabase.from("movimentacoes").insert(itensBaixa.map((item) => ({
        modulo: "uniforme",
        tipo_movimentacao: "Entrada",
        item_id: item.item_id,
        empresa_id: empresaId,
        empregado_id: null,
        quantidade: item.quantidade,
        ...(TAMANHO_DISPONIVEL ? { tamanho_id: tamanhoParaGravar(item.tamanho) } : {}),
        data_movimentacao: hojeLocal(),
        observacao: "Baixa desfeita pelo operador",
      })) as never);
      if (error) throw error;
      queryClient.invalidateQueries();
    });
    // Limpa a lista para um segundo clique não registrar a mesma baixa de novo.
    const itensDoTermo = itensBaixa;
    setItensBaixa([]);

    const html = montarTermoBaixaUniformeHtml({
      empresa,
      empregado,
      data: dataBaixa,
      motivo: motivoBaixa,
      onus: onusBaixa,
      linhas: itensDoTermo.map((i) => ({
        nome: uniformes.find((uni) => uni.id === i.item_id)?.nome,
        tamanho: tamanhoParaGravar(i.tamanho) ? nomeTamanho(parametros, i.tamanho) : undefined,
        quantidade: i.quantidade,
        estado: i.estado,
      })),
    });
    abrirDocumento({
      titulo: "Termo de Baixa de Uniforme",
      html,
      arquivo: nomeArquivoDocumento("Termo de Baixa de Uniforme", empregado?.nome, dataBaixa),
    });
  }

  return (
    <div className="space-y-6">
      <div className="panel p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Empresa</Label>
            <Select value={empresaId} onValueChange={(v) => { if (!v) return; setEmpresaId(v); setEmpregadoId(""); setItensBaixa([]); }}>
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
            <Label>Empregado (Opcional)</Label>
            <Select value={empregadoId} onValueChange={setEmpregadoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o empregado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODAS}>Nenhum / Empresa</SelectItem>
                {empregados.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Motivo da Baixa</Label>
            <Select value={motivoBaixa} onValueChange={setMotivoBaixa}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Desgaste Natural">Desgaste Natural</SelectItem>
                <SelectItem value="Quebra">Quebra</SelectItem>
                <SelectItem value="Desaparecimento">Desaparecimento</SelectItem>
                <SelectItem value="Perda">Perda</SelectItem>
                <SelectItem value="Mau Uso">Mau Uso</SelectItem>
                <SelectItem value="Desligamento">Desligamento</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Ônus da Baixa</Label>
            <Select value={onusBaixa} onValueChange={setOnusBaixa}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Da Empresa">Da Empresa</SelectItem>
                <SelectItem value="Do Empregado">Do Empregado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold">Itens para Baixa Definitiva</h3>
            <Button variant="outline" size="sm" onClick={adicionarItem}>
              + Adicionar Item
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Uniforme</TableHead>
                  <TableHead className="w-40">Tamanho</TableHead>
                  <TableHead className="w-24">Qtd</TableHead>
                  <TableHead className="w-32">Estado</TableHead>
                  <TableHead>Observação</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itensBaixa.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Select
                        value={item.item_id}
                        onValueChange={(v) => atualizarItem(index, "item_id", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o uniforme" />
                        </SelectTrigger>
                        <SelectContent>
                          {uniformes.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.codigo_sku} · {u.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <SeletorTamanho
                        parametros={parametros}
                        modulo="uniforme"
                        produto={uniformes.find((u) => u.id === item.item_id)}
                        uso="saida"
                        valor={item.tamanho}
                        onChange={(v) => atualizarItem(index, "tamanho", v)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantidade}
                        onChange={(e) => atualizarItem(index, "quantidade", Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.estado}
                        onValueChange={(v) => atualizarItem(index, "estado", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Novo">Novo</SelectItem>
                          <SelectItem value="Usado">Usado</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        capitalizar="texto"
                        placeholder="Justificativa item"
                        value={item.observacao}
                        onChange={(e) => atualizarItem(index, "observacao", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => removerItem(index)}>
                        Remover
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {itensBaixa.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum item adicionado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button requiresWrite="operar"
            size="lg"
            variant="destructive"
            onClick={gerarTermo}
            disabled={registrarBaixas.isPending}
          >
            Gerar Termo de Baixa
          </Button>
        </div>
      </div>
    </div>
  );
}
