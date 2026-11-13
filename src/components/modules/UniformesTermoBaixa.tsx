import { useState } from "react";
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
} from "@/lib/hooks-gemape";
import { bloqueioPorDemissao, hojeLocal } from "@/lib/empregados";
import { SeletorTamanho, TAMANHO_DISPONIVEL } from "@/components/SeletorTamanho";
import { nomeTamanho, tamanhoParaGravar } from "@/lib/estoque-tamanho";
import { useParametrosBase } from "@/lib/use-parametros-base";
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

  // O termo é só documental: gera o documento e NÃO grava movimentação, então o estoque não muda.
  function gerarTermo() {
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

    // Limpa a lista depois de gerar, para o próximo termo começar vazio.
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
            <div>
              <h3 className="font-bold">Itens para Baixa Definitiva</h3>
              <p className="text-xs text-muted-foreground">Termo somente documental: gerar o termo não movimenta o estoque.</p>
            </div>
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
          >
            Gerar Termo de Baixa
          </Button>
        </div>
      </div>
    </div>
  );
}
