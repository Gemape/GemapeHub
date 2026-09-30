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
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { formatarData } from "@/lib/gemape";
import { useEmpresas, useItens, useEmpregados, useRegistrarMovimentacoesLote } from "@/lib/hooks-gemape";
import { bloqueioPorDemissao } from "@/lib/empregados";

interface ItemTermo {
  id: string;
  item_id: string;
  quantidade: number;
  estado: string;
}

export function EpiTermoEntrega() {
  const { empresaId } = useEmpresa();
  const [empresaSel, setEmpresaSel] = useState(empresaId !== TODAS ? empresaId : "");
  const [empregadoId, setEmpregadoId] = useState("");
  const [dataEntrega, setDataEntrega] = useState(new Date().toISOString().slice(0, 10));
  const [itensTermo, setItensTermo] = useState<ItemTermo[]>([]);

  const { data: empresas = [] } = useEmpresas();
  const { data: empregados = [] } = useEmpregados(empresaSel || TODAS);
  const { data: itens = [] } = useItens("epi", TODAS);

  const registrarLote = useRegistrarMovimentacoesLote(["movimentacoes", "epis"]);

  function adicionarItem() {
    setItensTermo([
      ...itensTermo,
      { id: Math.random().toString(36).substr(2, 9), item_id: "", quantidade: 1, estado: "Novo" },
    ]);
  }

  function removerItem(id: string) {
    setItensTermo(itensTermo.filter((i) => i.id !== id));
  }

  function atualizarItem(id: string, campo: keyof ItemTermo, valor: string | number) {
    setItensTermo(itensTermo.map((i) => (i.id === id ? { ...i, [campo]: valor } : i)));
  }

  async function gerarTermo() {
    if (!empregadoId || itensTermo.length === 0) {
      alert("Selecione um empregado e adicione pelo menos um item.");
      return;
    }

    const empregado = empregados.find((e) => e.id === empregadoId);
    const empresa = empresas.find((e) => e.id === empresaSel);
    const bloqueio = bloqueioPorDemissao(empregado);
    if (bloqueio) {
      alert(bloqueio);
      return;
    }

    if (!empregado || !empresa) return;

    // Registrar movimentações em lote
    const movimentacoesLote = itensTermo.map((item) => ({
      modulo: "epi",
      tipo_movimentacao: "Saida",
      quantidade: item.quantidade,
      data_movimentacao: dataEntrega,
      item_id: item.item_id,
      empresa_id: empresaSel,
      empregado_id: empregadoId,
      observacao: `Entrega de EPI - Termo Gerado em ${formatarData(new Date().toISOString())}`,
    }));

    try {
      await registrarLote.mutateAsync(movimentacoesLote);
    } catch (error) {
      // O hook já mostra toast de erro. Paramos o processo.
      return;
    }

    // Gerar HTML para impressão
    const itensHtml = itensTermo
      .map((it, index) => {
        const itemInfo = itens.find((i) => i.id === it.item_id);
        return `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${index + 1}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${itemInfo?.nome || "—"}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${itemInfo?.ca || "—"}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${it.quantidade}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${it.estado}</td>
        </tr>
      `;
      })
      .join("");

    const dataObj = new Date(dataEntrega);
    const dataFormatada = dataObj.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const html = `
      <html>
        <head>
          <title>Termo de Entrega de EPI</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; padding: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .title { font-size: 20px; font-weight: bold; text-decoration: underline; margin-bottom: 20px; }
            .content { margin-bottom: 30px; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .footer { margin-top: 50px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 80px; }
            .sig-box { width: 45%; border-top: 1px solid #000; text-align: center; padding-top: 5px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${empresa.razao_social}</h2>
            <p>CNPJ: ${empresa.cnpj}</p>
            <div class="title">TERMO DE RESPONSABILIDADE E ENTREGA DE EPI</div>
          </div>
          <div class="content">
            <p>Declaro ter recebido da empresa <strong>${empresa.razao_social}</strong>, os Equipamentos de Proteção Individual (EPI) abaixo relacionados, novos e/ou em perfeitas condições de uso, obrigando-me a utilizá-los corretamente, zelar pela sua guarda e conservação, bem como devolvê-los quando solicitado ou no ato de minha rescisão contratual.</p>
            
            <p><strong>Empregado:</strong> ${empregado.nome}<br>
            <strong>CPF:</strong> ${empregado.cpf}<br>
            <strong>Matrícula:</strong> ${empregado.matricula || "—"}</p>
          </div>
          
          <table class="table">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th style="border: 1px solid #ddd; padding: 8px;">Nº</th>
                <th style="border: 1px solid #ddd; padding: 8px;">Descrição</th>
                <th style="border: 1px solid #ddd; padding: 8px;">CA</th>
                <th style="border: 1px solid #ddd; padding: 8px;">Qtd</th>
                <th style="border: 1px solid #ddd; padding: 8px;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${itensHtml}
            </tbody>
          </table>
          
          <div class="content">
            <p>Estou ciente de que o uso do EPI é obrigatório e que a sua não utilização poderá acarretar sanções disciplinares conforme a legislação vigente.</p>
          </div>
          
          <p style="text-align: right;">${empresa.nome_fantasia}, ${dataFormatada}</p>
          
          <div class="signatures">
            <div class="sig-box">
              Assinatura do Empregado
            </div>
            <div class="sig-box">
              Assinatura do Responsável
            </div>
          </div>
          
          <div class="no-print" style="margin-top: 50px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer;">Imprimir Termo</button>
          </div>
        </body>
      </html>
    `;

    const win = window.open("", "_blank");
    win?.document.write(html);
    win?.document.close();
  }

  return (
    <div className="space-y-6">
      <div className="panel p-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
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
            <Label className="text-lg font-bold">Itens Entregues</Label>
            <Button type="button" variant="outline" size="sm" onClick={adicionarItem}>
              + Adicionar EPI
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>EPI</TableHead>
                  <TableHead className="w-32">Quantidade</TableHead>
                  <TableHead className="w-40">Estado</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itensTermo.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Nenhum item adicionado. Clique em "+ Adicionar EPI".
                    </TableCell>
                  </TableRow>
                ) : (
                  itensTermo.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>
                        <Select
                          value={it.item_id}
                          onValueChange={(v) => atualizarItem(it.id, "item_id", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o EPI" />
                          </SelectTrigger>
                          <SelectContent>
                            {itens.map((i) => (
                              <SelectItem key={i.id} value={i.id}>
                                {i.codigo_sku} · {i.nome}
                                {i.ca ? ` (CA: ${i.ca})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={it.quantidade}
                          onChange={(e) =>
                            atualizarItem(it.id, "quantidade", Number(e.target.value))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={it.estado}
                          onValueChange={(v) => atualizarItem(it.id, "estado", v)}
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removerItem(it.id)}
                          className="text-red-500"
                        >
                          Remover
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button requiresWrite="operar" onClick={gerarTermo} disabled={registrarLote.isPending}>
            Gerar Termo de Entrega
          </Button>
        </div>
      </div>
    </div>
  );
}
