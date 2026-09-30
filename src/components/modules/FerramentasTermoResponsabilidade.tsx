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
import { bloqueioPorDemissao, hojeLocal } from "@/lib/empregados";

interface ItemTermo {
  id: string;
  item_id: string;
  quantidade: number;
  estado: string;
}

export function FerramentasTermoResponsabilidade() {
  const { empresaId } = useEmpresa();
  const [empresaSel, setEmpresaSel] = useState(empresaId !== TODAS ? empresaId : "");
  const [empregadoId, setEmpregadoId] = useState("");
  const [dataTermo, setDataTermo] = useState(hojeLocal());
  const [caixaSel, setCaixaSel] = useState("");
  const [itensTermo, setItensTermo] = useState<ItemTermo[]>([]);

  const { data: empresas = [] } = useEmpresas();
  const { data: empregados = [] } = useEmpregados(empresaSel || TODAS);
  const { data: itens = [] } = useItens("ferramenta", TODAS);
  const { data: caixas = [] } = useCaixasFerramentas(empresaSel || TODAS);

  const { data: itensCaixa = [], refetch: buscarItensCaixa } = useCaixaItens(caixaSel || null);

  const salvarMovimentacao = useSalvar("movimentacoes", ["movimentacoes", "ferramentas"]);

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

  // Filtrar itens por caixa se o número da caixa for preenchido
  async function carregarItensDaCaixa() {
    if (!caixaSel) {
      alert("Selecione uma caixa para carregar os itens.");
      return;
    }

    const { data: novosItens } = await buscarItensCaixa();

    if (!novosItens || novosItens.length === 0) {
      alert("Nenhum item encontrado para esta caixa.");
      return;
    }

    setItensTermo(
      novosItens.map((ci) => ({
        id: Math.random().toString(36).substr(2, 9),
        item_id: ci.ferramenta_id,
        quantidade: ci.quantidade,
        estado: ci.ferramenta?.status || "Novo",
      })),
    );
  }

  async function gerarTermo() {
    if (!empregadoId || itensTermo.length === 0) {
      alert("Selecione um empregado e adicione pelo menos um item.");
      return;
    }

    const empregado = empregados.find((e) => e.id === empregadoId);
    const empresa = empresas.find((e) => e.id === empresaSel);
    const caixa = caixas.find((c) => c.id === caixaSel);
    const bloqueio = bloqueioPorDemissao(empregado, dataTermo);
    if (bloqueio) {
      alert(bloqueio);
      return;
    }

    if (!empregado || !empresa) return;

    // Registrar movimentações (Saída para o empregado)
    for (const item of itensTermo) {
      await salvarMovimentacao.mutateAsync({
        valores: {
          modulo: "ferramenta",
          tipo_movimentacao: "Saida",
          quantidade: item.quantidade,
          data_movimentacao: dataTermo,
          item_id: item.item_id,
          empresa_id: empresaSel,
          empregado_id: empregadoId,
          tipo_vistoria: "Inicial (Entrega da caixa)",
          observacao: `Entrega de ferramentas/caixa ${caixa?.codigo || "AVULSA"} - Termo de Responsabilidade Individual`,
        },
      });
    }

    const itensHtml = itensTermo
      .map((it, index) => {
        const itemInfo = itens.find((i) => i.id === it.item_id);
        return `
        <tr>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${index + 1}</td>
          <td style="border: 1px solid #000; padding: 8px;">${itemInfo?.codigo_sku || "—"}</td>
          <td style="border: 1px solid #000; padding: 8px;">${itemInfo?.nome || "—"}</td>
          <td style="border: 1px solid #000; padding: 8px;">${itemInfo?.marca || "—"}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${it.quantidade}</td>
          <td style="border: 1px solid #000; padding: 8px;">${it.estado}</td>
        </tr>
      `;
      })
      .join("");

    const dataObj = new Date(dataTermo);
    const dataFormatada = dataObj.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const html = `
      <html>
        <head>
          <title>Termo de Responsabilidade Individual - ${empregado.nome}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.4; padding: 30px; font-size: 11pt; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .title { font-size: 16pt; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; }
            .content { margin-bottom: 20px; text-align: justify; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 60px; }
            .sig-box { width: 45%; border-top: 1px solid #000; text-align: center; padding-top: 5px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">TERMO DE RESPONSABILIDADE INDIVIDUAL DE FERRAMENTAS</div>
            <strong>${empresa.razao_social}</strong><br>
            CNPJ: ${empresa.cnpj}
          </div>
          
          <div class="content">
            <p>Pelo presente instrumento, eu <strong>${empregado.nome}</strong>, CPF <strong>${empregado.cpf}</strong>, declaro que recebi da empresa supra citada, em perfeito estado de conservação e funcionamento, as ferramentas e equipamentos abaixo relacionados, componentes da <strong>CAIXA Nº ${caixa?.codigo || "AVULSA"}</strong>, para uso exclusivo no desempenho de minhas atividades profissionais.</p>
            
            <p>Comprometo-me a zelar pela guarda, conservação e limpeza das mesmas, assumindo total responsabilidade pelo seu uso correto. Estou ciente de que, em caso de perda, extravio ou danos causados por mau uso ou negligência, poderei ser responsabilizado pelos custos de reparo ou reposição, conforme preceitua o Art. 462, § 1º da CLT.</p>
          </div>
          
          <table class="table">
            <thead>
              <tr style="background-color: #eee;">
                <th style="border: 1px solid #000; padding: 8px;">Item</th>
                <th style="border: 1px solid #000; padding: 8px;">Código</th>
                <th style="border: 1px solid #000; padding: 8px;">Descrição</th>
                <th style="border: 1px solid #000; padding: 8px;">Marca</th>
                <th style="border: 1px solid #000; padding: 8px;">Qtd</th>
                <th style="border: 1px solid #000; padding: 8px;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${itensHtml}
            </tbody>
          </table>
          
          <div class="content">
            <p>Comprometo-me, ainda, a devolver todos os itens acima relacionados no ato de meu desligamento da empresa ou sempre que me for solicitado, sob as mesmas condições em que foram recebidos.</p>
          </div>
          
          <p style="text-align: right; margin-top: 30px;">Local e data: ____________________, ${dataFormatada}</p>
          
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 items-end">
          <div className="space-y-1.5 lg:col-span-3">
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
          <div className="space-y-1.5 lg:col-span-3">
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
          <div className="space-y-1.5 lg:col-span-3">
            <Label>Caixa de Ferramentas (Opcional)</Label>
            <div className="flex gap-2">
              <Select value={caixaSel} onValueChange={setCaixaSel}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione a caixa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Avulsa / Sem Caixa</SelectItem>
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
            <Label>Data do Termo</Label>
            <Input type="date" value={dataTermo} onChange={(e) => setDataTermo(e.target.value)} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-lg font-bold">Ferramentas Selecionadas</Label>
            <Button type="button" variant="outline" size="sm" onClick={adicionarItem}>
              + Adicionar Ferramenta
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ferramenta</TableHead>
                  <TableHead className="w-32">Quantidade</TableHead>
                  <TableHead className="w-40">Estado</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itensTermo.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Nenhum item selecionado.
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
                            <SelectValue placeholder="Selecione a ferramenta" />
                          </SelectTrigger>
                          <SelectContent>
                            {itens.map((i) => (
                              <SelectItem key={i.id} value={i.id}>
                                {i.nome} (Cód: {i.codigo_sku})
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
          <Button requiresWrite="operar" onClick={gerarTermo} disabled={salvarMovimentacao.isPending}>
            Gerar Termo de Responsabilidade
          </Button>
        </div>
      </div>
    </div>
  );
}
