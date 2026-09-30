import { useRef, useState } from "react";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";
import { caixasHabilitadas } from "@/lib/caixas-habilitadas";
import { useParametrosBase } from "@/lib/use-parametros-base";
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
  useRegistrarMovimentacoesLote,
  useCaixasFerramentas,
  useCaixaItens,
} from "@/lib/hooks-gemape";
import { bloqueioPorDemissao, hojeLocal } from "@/lib/empregados";
import { validarTermoResponsabilidade } from "@/lib/encerramento-ferramentas";
import { montarTermoResponsabilidadeHtml } from "@/lib/termo-responsabilidade-html";

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
  const { data: todasAsCaixas = [] } = useCaixasFerramentas(empresaSel || TODAS);
  // Só caixas habilitadas em Cadastros > Gerais > Caixas.
  const caixas = caixasHabilitadas(todasAsCaixas, useParametrosBase().caixasHabilitadas);

  const { data: itensCaixa = [], refetch: buscarItensCaixa } = useCaixaItens(caixaSel || null);

  const registrarEntregas = useRegistrarMovimentacoesLote(["movimentacoes", "ferramentas"]);
  const salvando = useRef(false);

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
    if (salvando.current) return;
    if (!empregadoId || itensTermo.length === 0) {
      alert("Selecione um empregado e adicione pelo menos um item.");
      return;
    }

    const empregado = empregados.find((e) => e.id === empregadoId);
    const empresa = empresas.find((e) => e.id === empresaSel);
    const caixa = caixas.find((c) => c.id === caixaSel);
    const bloqueio = bloqueioPorDemissao(empregado, "entrega", dataTermo);
    if (bloqueio) {
      alert(bloqueio);
      return;
    }

    if (!empregado || !empresa) return;

    // Não entrega mais do que o estoque disponível de cada ferramenta.
    const erro = validarTermoResponsabilidade(itensTermo, itens);
    if (erro) {
      alert(erro);
      return;
    }

    // Registra todas as saídas de uma vez: ou entram todas, ou nenhuma.
    salvando.current = true;
    try {
      await registrarEntregas.mutateAsync(
        itensTermo.map((item) => ({
          modulo: "ferramenta",
          tipo_movimentacao: "Saida",
          quantidade: item.quantidade,
          data_movimentacao: dataTermo,
          item_id: item.item_id,
          empresa_id: empresaSel,
          empregado_id: empregadoId,
          tipo_vistoria: "Inicial (Entrega da caixa)",
          observacao: `Entrega de ferramentas/caixa ${caixa?.codigo || "AVULSA"} - Termo de Responsabilidade Individual`,
        })),
      );
    } catch {
      // A falha já aparece no aviso da gravação.
      return;
    } finally {
      salvando.current = false;
    }
    // Limpa a lista para um segundo clique não registrar a mesma entrega de novo.
    const itensDoTermo = itensTermo;
    setItensTermo([]);

    const html = montarTermoResponsabilidadeHtml({
      empresa,
      empregado,
      caixaCodigo: caixa?.codigo,
      data: dataTermo,
      linhas: itensDoTermo.map((it) => {
        const itemInfo = itens.find((i) => i.id === it.item_id);
        return {
          codigo: itemInfo?.codigo_sku,
          nome: itemInfo?.nome,
          marca: itemInfo?.marca,
          quantidade: it.quantidade,
          estado: it.estado,
        };
      }),
    });

    abrirDocumento({
      titulo: "Termo de Responsabilidade",
      html,
      arquivo: nomeArquivoDocumento("Termo de Responsabilidade", empregado?.nome, dataTermo),
    });
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
          <Button requiresWrite="operar" onClick={gerarTermo} disabled={registrarEntregas.isPending}>
            Gerar Termo de Responsabilidade
          </Button>
        </div>
      </div>
    </div>
  );
}
