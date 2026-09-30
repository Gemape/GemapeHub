import { useState } from "react";
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
import { formatarData, formatarMoeda } from "@/lib/gemape";
import { useEmpresas, useItens, useEmpregados, useSalvar } from "@/lib/hooks-gemape";
import { bloqueioPorDemissao } from "@/lib/empregados";

interface ItemBaixa {
  item_id: string;
  quantidade: number;
  estado: string;
  observacao: string;
}

export function UniformesTermoBaixa() {
  const [empresaId, setEmpresaId] = useState("");
  const [empregadoId, setEmpregadoId] = useState("");
  const [dataBaixa, setDataBaixa] = useState(new Date().toISOString().slice(0, 10));
  const [motivoBaixa, setMotivoBaixa] = useState("Desgaste Natural");
  const [onusBaixa, setOnusBaixa] = useState("Da Empresa");
  const [itensBaixa, setItensBaixa] = useState<ItemBaixa[]>([]);

  const { data: empresas = [] } = useEmpresas();
  const { data: empregados = [] } = useEmpregados(empresaId || TODAS, true);
  const { data: uniformes = [] } = useItens("uniforme", TODAS);

  const salvarMovimentacao = useSalvar("movimentacoes", ["movimentacoes", "uniformes"]);

  const empresa = empresas.find((e) => e.id === empresaId);
  const empregado = empregados.find((e) => e.id === empregadoId);

  function adicionarItem() {
    setItensBaixa([...itensBaixa, { item_id: "", quantidade: 1, estado: "Usado", observacao: "" }]);
  }

  function removerItem(index: number) {
    setItensBaixa(itensBaixa.filter((_, i) => i !== index));
  }

  function atualizarItem(index: number, campo: keyof ItemBaixa, valor: string | number) {
    const novos = [...itensBaixa];
    novos[index] = { ...novos[index], [campo]: valor } as ItemBaixa;
    setItensBaixa(novos);
  }

  async function gerarTermo() {
    if (!empresaId || itensBaixa.length === 0) {
      alert("Preencha os campos obrigatórios e adicione pelo menos um item.");
      return;
    }
    const bloqueio = bloqueioPorDemissao(empregado);
    if (bloqueio) {
      alert(bloqueio);
      return;
    }

    let valorTotalBaixa = 0;

    // Registrar movimentações
    for (const item of itensBaixa) {
      const u = uniformes.find((uni) => uni.id === item.item_id);
      valorTotalBaixa += item.quantidade * 0;

      await salvarMovimentacao.mutateAsync({
        valores: {
          modulo: "uniforme",
          tipo_movimentacao: "Saida",
          motivo_baixa: motivoBaixa,
          onus_baixa: onusBaixa,
          item_id: item.item_id,
          empresa_id: empresaId,
          empregado_id: empregadoId || null,
          quantidade: item.quantidade,
          data_movimentacao: dataBaixa,
          observacao: `Baixa de uniforme via termo - Motivo: ${motivoBaixa} - Obs: ${item.observacao}`,
        },
      });
    }

    // Gerar visualização de impressão
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      const html = `
        <html>
          <head>
            <title>Termo de Baixa - Uniforme</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
              .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #000; padding-bottom: 20px; }
              .title { font-size: 20px; font-weight: bold; text-transform: uppercase; }
              .content { margin-bottom: 40px; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { border: 1px solid #000; padding: 10px; text-align: left; }
              .footer { margin-top: 60px; }
              .signatures { display: flex; justify-content: space-between; margin-top: 80px; }
              .sig-box { width: 45%; border-top: 1px solid #000; text-align: center; padding-top: 10px; }
              .total-box { text-align: right; font-weight: bold; font-size: 18px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">Termo de Baixa Definitiva de Uniforme</div>
              <div style="margin-top: 10px; font-weight: bold;">${empresa?.razao_social}</div>
              <div>CNPJ: ${empresa?.cnpj}</div>
            </div>
            
            <div class="content">
              <p>Registramos nesta data, <strong>${formatarData(dataBaixa)}</strong>, a baixa definitiva 
              dos seguintes itens de uniforme vinculados ao colaborador(a) 
              <strong>${empregado?.nome || "N/A"}</strong>:</p>
              
              <table>
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Qtd</th>
                    <th>Estado</th>
                    <th>Motivo</th>
                    <th>Valor Unit.</th>
                    <th>Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itensBaixa
                    .map((i) => {
                      const u = uniformes.find((uni) => uni.id === i.item_id);
                      const total = i.quantidade * 0;
                      return `
                      <tr>
                        <td>${u?.nome}</td>
                        <td>${i.quantidade}</td>
                        <td>${i.estado}</td>
                        <td>${motivoBaixa}</td>
                        <td>${formatarMoeda(0)}</td>
                        <td>${formatarMoeda(total)}</td>
                      </tr>
                    `;
                    })
                    .join("")}
                </tbody>
              </table>
              
              <div class="total-box">VALOR TOTAL DA BAIXA: ${formatarMoeda(valorTotalBaixa)}</div>
              
              <div style="margin-top: 30px; border: 1px solid #ddd; padding: 15px; background: #f9f9f9;">
                <strong>Motivo:</strong> ${motivoBaixa}<br>
                <strong>Ônus:</strong> ${onusBaixa}
              </div>

              <p style="margin-top: 30px;">O(A) empregado(a) está ciente da baixa dos itens acima e das responsabilidades financeiras caso o ônus seja do colaborador.</p>
            </div>
            
            <div class="signatures">
              <div class="sig-box">
                <strong>${empregado?.nome || "___________________"}</strong><br>Empregado(a)
              </div>
              <div class="sig-box">
                <strong>Responsável</strong><br>${empresa?.nome_fantasia}
              </div>
            </div>
            
            <script>window.print();</script>
          </body>
        </html>
      `;
      printWindow.document.write(html);
      printWindow.document.close();
    }
  }

  return (
    <div className="space-y-6">
      <div className="panel p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Empresa</Label>
            <Select value={empresaId} onValueChange={setEmpresaId}>
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
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
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
            disabled={salvarMovimentacao.isPending}
          >
            Gerar Termo de Baixa
          </Button>
        </div>
      </div>
    </div>
  );
}
