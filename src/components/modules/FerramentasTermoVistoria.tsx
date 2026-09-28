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
import {
  useEmpresas,
  useItens,
  useEmpregados,
  useSalvar,
  useCaixasFerramentas,
  useCaixaItens,
} from "@/lib/hooks-gemape";

interface ItemVistoria {
  id: string;
  item_id: string;
  quantidade: number;
  estado: string;
  conformidade: "Conforme" | "Não Conforme";
  observacao: string;
}

export function FerramentasTermoVistoria() {
  const { empresaId } = useEmpresa();
  const [empresaSel, setEmpresaSel] = useState(empresaId !== TODAS ? empresaId : "");
  const [empregadoId, setEmpregadoId] = useState("");
  const [caixaSel, setCaixaSel] = useState("");
  const [dataVistoria, setDataVistoria] = useState(new Date().toISOString().slice(0, 10));
  const [itensVistoria, setItensVistoria] = useState<ItemVistoria[]>([]);

  const { data: empresas = [] } = useEmpresas();
  const { data: empregados = [] } = useEmpregados(empresaSel || TODAS);
  const { data: itens = [] } = useItens("ferramenta", TODAS);
  const { data: caixas = [] } = useCaixasFerramentas(empresaSel || TODAS);

  const { data: itensCaixa = [], refetch: buscarItensCaixa } = useCaixaItens(caixaSel || null);

  const salvarMovimentacao = useSalvar("movimentacoes", ["movimentacoes", "ferramentas"]);

  async function carregarItensDaCaixa() {
    if (!caixaSel) {
      alert("Selecione uma caixa.");
      return;
    }

    const { data: novosItens } = await buscarItensCaixa();

    if (!novosItens || novosItens.length === 0) {
      alert("Nenhum item encontrado nesta caixa.");
      return;
    }

    setItensVistoria(
      novosItens.map((ci) => ({
        id: Math.random().toString(36).substr(2, 9),
        item_id: ci.ferramenta_id,
        quantidade: ci.quantidade,
        estado: ci.ferramenta?.status || "Usado",
        conformidade: "Conforme",
        observacao: ci.observacao || "",
      })),
    );
  }

  function adicionarItem() {
    setItensVistoria([
      ...itensVistoria,
      {
        id: Math.random().toString(36).substr(2, 9),
        item_id: "",
        quantidade: 1,
        estado: "Usado",
        conformidade: "Conforme",
        observacao: "",
      },
    ]);
  }

  function removerItem(id: string) {
    setItensVistoria(itensVistoria.filter((i) => i.id !== id));
  }

  function atualizarItem(id: string, campo: keyof ItemVistoria, valor: string | number) {
    setItensVistoria(itensVistoria.map((i) => (i.id === id ? { ...i, [campo]: valor } : i)));
  }

  async function gerarTermo() {
    if (itensVistoria.length === 0) {
      alert("Adicione pelo menos um item para vistoria.");
      return;
    }

    const empresa = empresas.find((e) => e.id === empresaSel);
    const empregado = empregados.find((e) => e.id === empregadoId);
    const caixa = caixas.find((c) => c.id === caixaSel);

    if (!empresa) return;

    // Registrar movimentações (Vistoria Periódica)
    for (const item of itensVistoria) {
      await salvarMovimentacao.mutateAsync({
        valores: {
          modulo: "ferramenta",
          tipo_movimentacao: "Entrada", // Apenas registro, não altera estoque físico de saída/entrada real
          quantidade: item.quantidade,
          data_movimentacao: dataVistoria,
          item_id: item.item_id,
          empresa_id: empresaSel,
          empregado_id: empregadoId || null,
          tipo_vistoria: "Periódica",
          observacao: `Vistoria Periódica - Caixa: ${caixa?.codigo || "N/A"} - Status: ${item.conformidade}. Obs: ${item.observacao}`,
        },
      });
    }

    const itensHtml = itensVistoria
      .map((it, index) => {
        const itemInfo = itens.find((i) => i.id === it.item_id);
        return `
        <tr>
          <td style="border: 1px solid #000; padding: 6px; text-align: center;">${index + 1}</td>
          <td style="border: 1px solid #000; padding: 6px;">${itemInfo?.codigo_sku || "—"}</td>
          <td style="border: 1px solid #000; padding: 6px;">${itemInfo?.nome || "—"}</td>
          <td style="border: 1px solid #000; padding: 6px; text-align: center;">${it.conformidade}</td>
          <td style="border: 1px solid #000; padding: 6px;">${it.estado}</td>
          <td style="border: 1px solid #000; padding: 6px;">${it.observacao || "—"}</td>
        </tr>
      `;
      })
      .join("");

    const dataObj = new Date(dataVistoria);
    const dataFormatada = dataObj.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const html = `
      <html>
        <head>
          <title>Termo de Vistoria Periódica - Caixa ${caixa?.codigo || ""}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.3; padding: 25px; font-size: 10pt; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .title { font-size: 14pt; font-weight: bold; text-transform: uppercase; }
            .content { margin-bottom: 15px; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 50px; }
            .sig-box { width: 45%; border-top: 1px solid #000; text-align: center; padding-top: 5px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">RELATÓRIO DE VISTORIA PERIÓDICA DE FERRAMENTAS</div>
            <strong>${empresa.razao_social}</strong><br>
            CNPJ: ${empresa.cnpj}
          </div>
          
          <div class="info">
            <p><strong>DATA DA VISTORIA:</strong> ${dataFormatada}<br>
            <strong>CAIXA Nº:</strong> ${caixa?.codigo || "N/A"}${caixa?.nome ? ` - ${caixa.nome}` : ""}<br>
            <strong>RESPONSÁVEL PELA CAIXA (EMPREGADO):</strong> ${empregado?.nome || caixa?.responsavel?.nome || "NÃO ATRIBUÍDO"}</p>
          </div>
          
          <div class="content">
            <p>A presente vistoria tem por objetivo verificar as condições de uso, conservação e limpeza das ferramentas e equipamentos que compõem a caixa acima identificada, visando a segurança do trabalho e a durabilidade do patrimônio da empresa.</p>
          </div>
          
          <table class="table">
            <thead>
              <tr style="background-color: #eee;">
                <th style="border: 1px solid #000; padding: 6px;">Item</th>
                <th style="border: 1px solid #000; padding: 6px;">Código</th>
                <th style="border: 1px solid #000; padding: 6px;">Descrição</th>
                <th style="border: 1px solid #000; padding: 6px;">Status</th>
                <th style="border: 1px solid #000; padding: 6px;">Estado</th>
                <th style="border: 1px solid #000; padding: 6px;">Observações/Ações</th>
              </tr>
            </thead>
            <tbody>
              ${itensHtml}
            </tbody>
          </table>
          
          <div class="content">
            <p><strong>PARECER FINAL:</strong> As ferramentas vistoriadas encontram-se em condições adequadas de uso, salvo as observações anotadas acima. O empregado foi orientado sobre a importância da manutenção preventiva e correta guarda dos itens.</p>
          </div>
          
          <div class="signatures">
            <div class="sig-box">
              Assinatura do Responsável pela Vistoria
            </div>
            <div class="sig-box">
              Assinatura do Empregado (Ciente)
            </div>
          </div>
          
          <div class="no-print" style="margin-top: 40px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer;">Imprimir Relatório</button>
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 items-end">
          <div className="space-y-1.5 lg:col-span-3">
            <Label>Empresa</Label>
            <Select value={empresaSel} onValueChange={setEmpresaSel}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
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
          <div className="space-y-1.5 lg:col-span-3">
            <Label>Responsável (Empregado)</Label>
            <Select value={empregadoId} onValueChange={setEmpregadoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
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
          <div className="space-y-1.5 lg:col-span-3">
            <Label>Caixa de Ferramentas</Label>
            <div className="flex gap-2">
              <Select value={caixaSel} onValueChange={setCaixaSel}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione a caixa" />
                </SelectTrigger>
                <SelectContent>
                  {caixas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.codigo} - {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="secondary" onClick={carregarItensDaCaixa}>
                Carregar
              </Button>
            </div>
          </div>
          <div className="space-y-1.5 lg:col-span-3">
            <Label>Data da Vistoria</Label>
            <Input
              type="date"
              value={dataVistoria}
              onChange={(e) => setDataVistoria(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-lg font-bold">Itens Vistoriados</Label>
            <Button type="button" variant="outline" size="sm" onClick={adicionarItem}>
              + Adicionar Item
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ferramenta</TableHead>
                  <TableHead className="w-32">Status</TableHead>
                  <TableHead className="w-32">Estado</TableHead>
                  <TableHead>Observação/Ação</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itensVistoria.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum item adicionado.
                    </TableCell>
                  </TableRow>
                ) : (
                  itensVistoria.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>
                        <Select
                          value={it.item_id}
                          onValueChange={(v) => atualizarItem(it.id, "item_id", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {itens.map((i) => (
                              <SelectItem key={i.id} value={i.id}>
                                {i.nome} ({i.codigo_sku})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={it.conformidade}
                          onValueChange={(v: "Conforme" | "Não Conforme") =>
                            atualizarItem(it.id, "conformidade", v)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Conforme">Conforme</SelectItem>
                            <SelectItem value="Não Conforme">Não Conforme</SelectItem>
                          </SelectContent>
                        </Select>
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
                            <SelectItem value="Danificado">Danificado</SelectItem>
                            <SelectItem value="Manutenção">Manutenção</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={it.observacao}
                          onChange={(e) => atualizarItem(it.id, "observacao", e.target.value)}
                          placeholder="Ex: Necessita limpeza"
                        />
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
          <Button requiresWrite onClick={gerarTermo} disabled={salvarMovimentacao.isPending}>
            Gerar Termo de Vistoria
          </Button>
        </div>
      </div>
    </div>
  );
}
