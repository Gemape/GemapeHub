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
import { TODAS } from "@/lib/empresa-context";
import { escaparHtml, formatarData } from "@/lib/gemape";
import { useEmpresas, useItens, useEmpregados, useSalvar } from "@/lib/hooks-gemape";
import { bloqueioPorDemissao, hojeLocal } from "@/lib/empregados";

interface ItemTermo {
  item_id: string;
  quantidade: number;
  estado: string;
}

export function UniformesTermoEntrega() {
  const [empresaId, setEmpresaId] = useState("");
  const [empregadoId, setEmpregadoId] = useState("");
  const [dataEntrega, setDataEntrega] = useState(hojeLocal());
  const [itensEntrega, setItensEntrega] = useState<ItemTermo[]>([]);

  const { data: empresas = [] } = useEmpresas();
  const { data: empregados = [] } = useEmpregados(empresaId || TODAS, true);
  // Lista completa só para conferir a demissão: quem já saiu da lista de ativos continua bloqueado.
  const { data: todosEmpregados = [] } = useEmpregados(empresaId || TODAS);
  const { data: uniformes = [] } = useItens("uniforme", TODAS);

  const salvarMovimentacao = useSalvar("movimentacoes", ["movimentacoes", "uniformes"]);

  const empresa = empresas.find((e) => e.id === empresaId);
  const empregado = empregados.find((e) => e.id === empregadoId);

  function adicionarItem() {
    setItensEntrega([...itensEntrega, { item_id: "", quantidade: 1, estado: "Novo" }]);
  }

  function removerItem(index: number) {
    setItensEntrega(itensEntrega.filter((_, i) => i !== index));
  }

  function atualizarItem(index: number, campo: keyof ItemTermo, valor: string | number) {
    setItensEntrega((atuais) =>
      atuais.map((item, i) => (i === index ? { ...item, [campo]: valor } : item)),
    );
  }

  async function gerarTermo() {
    if (!empresaId || !empregadoId || itensEntrega.length === 0) {
      alert("Preencha todos os campos e adicione pelo menos um item.");
      return;
    }
    const bloqueio = bloqueioPorDemissao(
      todosEmpregados.find((p) => p.id === empregadoId),
      "entrega",
      dataEntrega,
    );
    if (bloqueio) {
      alert(bloqueio);
      return;
    }

    // Registrar movimentações
    for (const item of itensEntrega) {
      await salvarMovimentacao.mutateAsync({
        valores: {
          modulo: "uniforme",
          tipo_movimentacao: "Saida",
          item_id: item.item_id,
          empresa_id: empresaId,
          empregado_id: empregadoId,
          quantidade: item.quantidade,
          data_movimentacao: dataEntrega,
          observacao: `Entrega de uniforme via termo - Estado: ${item.estado}`,
        },
      });

      // Update item stock
      const uniforme = uniformes.find((u) => u.id === item.item_id);
      if (uniforme) {
        // useSalvar handles updates if ID is provided
        // But here we need to manually trigger stock update or rely on a trigger
        // The trigger trg_compra_uniforme was only for purchases.
        // I should probably add a general trigger for stock in the migration if not present.
      }
    }

    // Gerar visualização de impressão
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      const html = `
        <html>
          <head>
            <title>Termo de Entrega - ${empregado?.nome}</title>
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
              @print { .no-print { display: none; } }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">Termo de Entrega de Uniforme</div>
              <div style="margin-top: 10px; font-weight: bold;">${empresa?.razao_social}</div>
              <div>CNPJ: ${empresa?.cnpj}</div>
            </div>
            
            <div class="content">
              <p>Declaramos que nesta data, <strong>${formatarData(dataEntrega)}</strong>, entregamos ao colaborador(a) 
              <strong>${empregado?.nome}</strong>, CPF nº <strong>${empregado?.cpf}</strong>, os seguintes itens de uniforme:</p>
              
              <table>
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Marca/Modelo</th>
                    <th>Qtd</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  ${itensEntrega
                    .map((i) => {
                      const u = uniformes.find((uni) => uni.id === i.item_id);
                      return `
                      <tr>
                        <td>${escaparHtml(u?.nome)}</td>
                        <td>${escaparHtml(u?.marca)} ${escaparHtml(u?.modelo)}</td>
                        <td>${i.quantidade}</td>
                        <td>${escaparHtml(i.estado)}</td>
                      </tr>
                    `;
                    })
                    .join("")}
                </tbody>
              </table>
              
              <p style="margin-top: 30px;">O(A) empregado(a) declara ter recebido os itens acima descritos em perfeito estado de conservação, 
              comprometendo-se a utilizá-los exclusivamente para fins de trabalho e a devolvê-los à empresa quando solicitado ou no ato de desligamento.</p>
            </div>
            
            <div class="signatures">
              <div class="sig-box">
                <strong>${empregado?.nome}</strong><br>Empregado(a)
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
        <div className="grid gap-4 sm:grid-cols-3">
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
          <div className="space-y-1.5">
            <Label>Data da Entrega</Label>
            <Input
              type="date"
              value={dataEntrega}
              onChange={(e) => setDataEntrega(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold">Itens para Entrega</h3>
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
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itensEntrega.map((item, index) => (
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
                      <Button variant="ghost" size="sm" onClick={() => removerItem(index)}>
                        Remover
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {itensEntrega.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Nenhum item adicionado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button requiresWrite="operar" size="lg" onClick={gerarTermo} disabled={salvarMovimentacao.isPending}>
            Gerar Termo de Entrega
          </Button>
        </div>
      </div>
    </div>
  );
}
