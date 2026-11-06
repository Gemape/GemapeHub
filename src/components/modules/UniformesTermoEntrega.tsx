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
import { TODAS } from "@/lib/empresa-context";
import { empresasParaEscolha } from "@/lib/empresas";
import { montarTermoEntregaUniformeHtml } from "@/lib/termo-entrega-uniforme-html";
import {
  useEmpresas,
  useItens,
  useEmpregados,
} from "@/lib/hooks-gemape";
import { receptoresDeEntrega } from "@/lib/empregados-habilitados";
import { listaDeUniformeDesatualizada, soEmpregadosDeUniforme } from "@/lib/empregados-uniforme";
import { AvisoHabilitados } from "@/components/AvisoHabilitados";
import { bloqueioPorDemissao, empregadoAtivo, hojeLocal } from "@/lib/empregados";
import { SeletorTamanho, TAMANHO_DISPONIVEL } from "@/components/SeletorTamanho";
import { nomeTamanho, tamanhoParaGravar } from "@/lib/estoque-tamanho";
import { useParametrosBase } from "@/lib/use-parametros-base";

interface ItemTermo {
  item_id: string;
  quantidade: number;
  estado: string;
  // Tamanho da saída, quando o uniforme tem tamanho em Gerais (decisão 23).
  tamanho: string;
}

export function UniformesTermoEntrega() {
  const [empresaId, setEmpresaId] = useState("");
  const [empregadoId, setEmpregadoId] = useState("");
  // Quem entrega o uniforme: o nome completo sai no termo e na observação do histórico, ao lado do de quem recebe.
  const [responsavelId, setResponsavelId] = useState("");
  const [dataEntrega, setDataEntrega] = useState(hojeLocal());
  const [itensEntrega, setItensEntrega] = useState<ItemTermo[]>([]);

  const { data: empresas = [] } = useEmpresas();
  const { data: empregados = [] } = useEmpregados(empresaId || TODAS, true);
  // Lista completa só para conferir a demissão: quem já saiu da lista de ativos continua bloqueado.
  const { data: todosEmpregados = [] } = useEmpregados(empresaId || TODAS);
  const { data: uniformes = [] } = useItens("uniforme", empresaId || TODAS);
  const parametros = useParametrosBase();


  const empresa = empresas.find((e) => e.id === empresaId);
  const empregado = empregados.find((e) => e.id === empregadoId);
  const habilitadosDesatualizados = !!empresaId && listaDeUniformeDesatualizada(empregados.filter((e) => empregadoAtivo(e)));
  // Quem pode entregar: empregado ativo, entre os habilitados dos uniformes, que não seja quem recebe (tirado depois do filtro, para quem recebe ser o único habilitado não liberar todos).
  const responsaveis = soEmpregadosDeUniforme(empregados.filter((e) => empregadoAtivo(e))).filter((e) => e.id !== empregadoId);

  function adicionarItem() {
    setItensEntrega([...itensEntrega, { item_id: "", quantidade: 1, estado: "Novo", tamanho: "" }]);
  }

  function removerItem(index: number) {
    setItensEntrega(itensEntrega.filter((_, i) => i !== index));
  }

  function atualizarItem(index: number, campo: keyof ItemTermo, valor: string | number) {
    setItensEntrega((atuais) =>
      atuais.map((item, i) =>
        i !== index
          ? item
          : // Trocar o uniforme limpa o tamanho escolhido para o anterior.
            { ...item, [campo]: valor, ...(campo === "item_id" ? { tamanho: "" } : {}) },
      ),
    );
  }

  async function gerarTermo() {
    if (!empresaId || !empregadoId || itensEntrega.length === 0) {
      alert("Preencha todos os campos e adicione pelo menos um item.");
      return;
    }
    if (!dataEntrega) {
      alert("Informe a data da entrega.");
      return;
    }
    const responsavel = empregados.find((e) => e.id === responsavelId);
    if (!responsavel) {
      alert("Informe o responsável pela entrega.");
      return;
    }
    if (responsavel.id === empregadoId) {
      alert("Quem entrega não pode ser quem recebe: escolha outro responsável pela entrega.");
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

    // O termo só documenta (decisão 415): não mexe no estoque. A saída só conta quando lançada em Entrega Uniforme.
    const itensDoTermo = itensEntrega;

    const html = montarTermoEntregaUniformeHtml({
      empresa,
      empregado,
      responsavel: { nome: responsavel.nome },
      data: dataEntrega,
      linhas: itensDoTermo.map((i) => {
        const u = uniformes.find((uni) => uni.id === i.item_id);
        return {
          nome: u?.nome,
          marca: u?.marca,
          modelo: u?.modelo,
          tamanho: tamanhoParaGravar(i.tamanho) ? nomeTamanho(parametros, i.tamanho) : undefined,
          quantidade: i.quantidade,
          estado: i.estado,
        };
      }),
    });
    abrirDocumento({
      titulo: "Termo de Entrega de Uniforme",
      html,
      arquivo: nomeArquivoDocumento("Termo de Entrega de Uniforme", empregado?.nome, dataEntrega),
    });
  }

  return (
    <div className="space-y-6">
      <div className="panel p-6 space-y-6">
        <p className="rounded-lg border bg-muted/40 p-2 text-xs text-muted-foreground">
          O termo só documenta a entrega e não movimenta o estoque. A saída só é contabilizada quando lançada no menu Entrega Uniforme.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AvisoHabilitados desatualizada={habilitadosDesatualizados} onde="Parâmetros &gt; Uniformes &gt; Parâmetros Específicos" />
          <div className="space-y-1.5">
            <Label>Empresa</Label>
            <Select value={empresaId} onValueChange={(v) => { if (!v) return; setEmpresaId(v); setEmpregadoId(""); setResponsavelId(""); setItensEntrega([]); }}>
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
            <Select value={empregadoId} onValueChange={(v) => { setEmpregadoId(v); if (v === responsavelId) setResponsavelId(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o empregado" />
              </SelectTrigger>
              <SelectContent>
                {receptoresDeEntrega(empregados, soEmpregadosDeUniforme, empregadoAtivo).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Responsável pela entrega</Label>
            <Select value={responsavelId} onValueChange={setResponsavelId}>
              <SelectTrigger aria-label="Responsável pela entrega">
                <SelectValue placeholder="Selecione quem entrega" />
              </SelectTrigger>
              <SelectContent>
                {responsaveis.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {empresaId && empregadoId && responsaveis.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum outro empregado habilitado para entregar uniformes. Habilite em Parâmetros &gt; Uniformes &gt; Parâmetros Específicos.</p>
            )}
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
                  <TableHead className="w-40">Tamanho</TableHead>
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
                      <Button variant="ghost" size="sm" onClick={() => removerItem(index)}>
                        Remover
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {itensEntrega.length === 0 && (
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
          <Button requiresWrite="operar" size="lg" onClick={gerarTermo}>
            Gerar Termo de Entrega
          </Button>
        </div>
      </div>
    </div>
  );
}
