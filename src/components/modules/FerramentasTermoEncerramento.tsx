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
  useMovimentacoes,
} from "@/lib/hooks-gemape";
import { bloqueioPorDemissao, hojeLocal } from "@/lib/empregados";

interface ItemEncerramento {
  id: string;
  item_id: string;
  quantidade: number;
  estado: string;
  observacao: string;
}

export function FerramentasTermoEncerramento() {
  const { empresaId } = useEmpresa();
  const [empresaSel, setEmpresaSel] = useState(empresaId !== TODAS ? empresaId : "");
  const [empregadoId, setEmpregadoId] = useState("");
  const [dataEncerramento, setDataEncerramento] = useState(hojeLocal());
  const [itensEncerramento, setItensEncerramento] = useState<ItemEncerramento[]>([]);

  const { data: empresas = [] } = useEmpresas();
  const { data: empregados = [] } = useEmpregados(empresaSel || TODAS);
  const { data: itens = [] } = useItens("ferramenta", TODAS);
  const { data: movimentacoes = [] } = useMovimentacoes("ferramenta", TODAS, 1000);

  const salvarMovimentacao = useSalvar("movimentacoes", ["movimentacoes", "itens"]);

  function carregarHistoricoEmpregado() {
    if (!empregadoId) {
      alert("Selecione um empregado.");
      return;
    }

    // Filtrar o que está com o empregado (Saídas - Devoluções - Baixas)
    const historico = movimentacoes.filter((m) => m.empregado_id === empregadoId);

    // Simplificadamente, vamos listar as ferramentas que tiveram saída para este empregado
    const idsItens = Array.from(new Set(historico.map((h) => h.item_id))).filter(
      Boolean,
    ) as string[];

    setItensEncerramento(
      idsItens.map((id) => {
        const item = itens.find((i) => i.id === id);
        return {
          id: Math.random().toString(36).substr(2, 9),
          item_id: id,
          quantidade: 1,
          estado: "Usado",
          observacao: "",
        };
      }),
    );
  }

  function adicionarItem() {
    setItensEncerramento([
      ...itensEncerramento,
      {
        id: Math.random().toString(36).substr(2, 9),
        item_id: "",
        quantidade: 1,
        estado: "Usado",
        observacao: "",
      },
    ]);
  }

  function removerItem(id: string) {
    setItensEncerramento(itensEncerramento.filter((i) => i.id !== id));
  }

  function atualizarItem(id: string, campo: keyof ItemEncerramento, valor: string | number) {
    setItensEncerramento(
      itensEncerramento.map((i) => (i.id === id ? { ...i, [campo]: valor } : i)),
    );
  }

  async function gerarTermo() {
    if (!empregadoId || itensEncerramento.length === 0) {
      alert("Selecione um empregado e adicione pelo menos um item.");
      return;
    }

    const empregado = empregados.find((e) => e.id === empregadoId);
    const empresa = empresas.find((e) => e.id === empresaSel);
    const bloqueio = bloqueioPorDemissao(empregado, "encerramento", dataEncerramento);
    if (bloqueio) {
      alert(bloqueio);
      return;
    }

    if (!empregado || !empresa) return;

    // Registrar movimentações (Devolução)
    for (const item of itensEncerramento) {
      await salvarMovimentacao.mutateAsync({
        valores: {
          modulo: "ferramenta",
          tipo_movimentacao: "Devolucao",
          quantidade: item.quantidade,
          data_movimentacao: dataEncerramento,
          item_id: item.item_id,
          empresa_id: empresaSel,
          empregado_id: empregadoId,
          tipo_vistoria: "Final (Desligamento)",
          observacao: `Devolução de ferramenta - Termo de Encerramento de Responsabilidade. Obs: ${item.observacao}`,
        },
      });
    }

    const itensHtml = itensEncerramento
      .map((it, index) => {
        const itemInfo = itens.find((i) => i.id === it.item_id);
        return `
        <tr>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${index + 1}</td>
          <td style="border: 1px solid #000; padding: 8px;">${itemInfo?.codigo_sku || "—"}</td>
          <td style="border: 1px solid #000; padding: 8px;">${itemInfo?.nome || "—"}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${it.quantidade}</td>
          <td style="border: 1px solid #000; padding: 8px;">${it.estado}</td>
          <td style="border: 1px solid #000; padding: 8px;">${it.observacao || "OK"}</td>
        </tr>
      `;
      })
      .join("");

    const dataObj = new Date(dataEncerramento);
    const dataFormatada = dataObj.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const html = `
      <html>
        <head>
          <title>Termo de Encerramento de Responsabilidade - ${empregado.nome}</title>
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
            <div class="title">TERMO DE ENCERRAMENTO DE RESPONSABILIDADE</div>
            <strong>${empresa.razao_social}</strong><br>
            CNPJ: ${empresa.cnpj}
          </div>
          
          <div class="content">
            <p>Pelo presente instrumento, a empresa <strong>${empresa.razao_social}</strong> declara que o(a) empregado(a) <strong>${empregado.nome}</strong>, CPF <strong>${empregado.cpf}</strong>, efetuou nesta data a devolução das ferramentas e equipamentos abaixo relacionados, que estavam sob sua responsabilidade conforme termo assinado anteriormente.</p>
            
            <p>Após conferência, atesta-se que os itens foram devolvidos conforme o estado de conservação indicado na tabela abaixo, dando-se por encerrada a responsabilidade individual do referido empregado sobre os mesmos.</p>
          </div>
          
          <table class="table">
            <thead>
              <tr style="background-color: #eee;">
                <th style="border: 1px solid #000; padding: 8px;">Item</th>
                <th style="border: 1px solid #000; padding: 8px;">Código</th>
                <th style="border: 1px solid #000; padding: 8px;">Descrição</th>
                <th style="border: 1px solid #000; padding: 8px;">Qtd</th>
                <th style="border: 1px solid #000; padding: 8px;">Estado</th>
                <th style="border: 1px solid #000; padding: 8px;">Observações</th>
              </tr>
            </thead>
            <tbody>
              ${itensHtml}
            </tbody>
          </table>
          
          <div class="content">
            <p>Este termo refere-se apenas aos itens listados, não eximindo o empregado de responsabilidades sobre outros ativos que possam estar em seu poder e que não constem desta relação.</p>
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
          <div className="space-y-1.5 lg:col-span-4">
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
          <div className="lg:col-span-2">
            <Button
              type="button"
              variant="secondary"
              onClick={carregarHistoricoEmpregado}
              className="w-full"
            >
              Carregar Histórico
            </Button>
          </div>
          <div className="space-y-1.5 lg:col-span-3">
            <Label>Data de Encerramento</Label>
            <Input
              type="date"
              value={dataEncerramento}
              onChange={(e) => setDataEncerramento(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-lg font-bold">Ferramentas Devolvidas</Label>
            <Button type="button" variant="outline" size="sm" onClick={adicionarItem}>
              + Adicionar Ferramenta
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ferramenta</TableHead>
                  <TableHead className="w-24">Qtd</TableHead>
                  <TableHead className="w-32">Estado</TableHead>
                  <TableHead>Observação/Avaria</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itensEncerramento.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum item carregado.
                    </TableCell>
                  </TableRow>
                ) : (
                  itensEncerramento.map((it) => (
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
                            <SelectItem value="Danificado">Danificado</SelectItem>
                            <SelectItem value="Extraviado">Extraviado</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={it.observacao}
                          onChange={(e) => atualizarItem(it.id, "observacao", e.target.value)}
                          placeholder="Ex: Riscos leves"
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
          <Button requiresWrite="operar" onClick={gerarTermo} disabled={salvarMovimentacao.isPending}>
            Gerar Termo de Encerramento
          </Button>
        </div>
      </div>
    </div>
  );
}
