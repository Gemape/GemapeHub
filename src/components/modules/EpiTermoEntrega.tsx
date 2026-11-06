import { useState, useEffect } from "react";
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
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { empresasParaEscolha } from "@/lib/empresas";
import { useEmpresas, useItens, useEmpregados } from "@/lib/hooks-gemape";
import { receptoresDeEntrega } from "@/lib/empregados-habilitados";
import { listaDeEpiDesatualizada, soEmpregadosDeEpi } from "@/lib/empregados-epi";
import { AvisoHabilitados } from "@/components/AvisoHabilitados";
import { bloqueioPorDemissao, empregadoAtivo, hojeLocal } from "@/lib/empregados";
import { montarTermoEntregaEpiHtml } from "@/lib/termo-entrega-epi-html";
import { SeletorTamanho } from "@/components/SeletorTamanho";
import { nomeTamanho, tamanhoParaGravar } from "@/lib/estoque-tamanho";
import { useParametrosBase } from "@/lib/use-parametros-base";

interface ItemTermo {
  id: string;
  item_id: string;
  quantidade: number;
  estado: string;
  // Tamanho da saída, quando o EPI tem tamanho em Gerais (decisão 23).
  tamanho: string;
}

export function EpiTermoEntrega() {
  const { empresaId } = useEmpresa();
  const [empresaSel, setEmpresaSel] = useState(empresaId !== TODAS ? empresaId : "");
  const [empregadoId, setEmpregadoId] = useState("");
  // Quem entrega o EPI: o nome completo sai no termo, ao lado do de quem recebe.
  const [responsavelId, setResponsavelId] = useState("");
  const [dataEntrega, setDataEntrega] = useState(hojeLocal());
  const [itensTermo, setItensTermo] = useState<ItemTermo[]>([]);

  const { data: empresas = [] } = useEmpresas();
  // Empresa inativa não é escolhida: se o cabeçalho está nela, a escolha começa vazia.
  useEffect(() => {
    if (empresas.length > 0 && empresaSel && !empresasParaEscolha(empresas).some((e) => e.id === empresaSel)) setEmpresaSel("");
  }, [empresas, empresaSel]);
  const { data: empregados = [] } = useEmpregados(empresaSel || TODAS);
  const { data: itens = [] } = useItens("epi", empresaSel || TODAS);
  const habilitadosDesatualizados = !!empresaSel && listaDeEpiDesatualizada(empregados.filter((e) => empregadoAtivo(e)));
  // Quem pode entregar: empregado ativo, entre os habilitados do EPI, que não seja quem recebe (tirado depois do filtro, para quem recebe ser o único habilitado não liberar todos).
  const responsaveis = soEmpregadosDeEpi(empregados.filter((e) => empregadoAtivo(e))).filter((e) => e.id !== empregadoId);

  const parametros = useParametrosBase();

  function adicionarItem() {
    setItensTermo([
      ...itensTermo,
      {
        id: Math.random().toString(36).substr(2, 9),
        item_id: "",
        quantidade: 1,
        estado: "Novo",
        tamanho: "",
      },
    ]);
  }

  function removerItem(id: string) {
    setItensTermo(itensTermo.filter((i) => i.id !== id));
  }

  function atualizarItem(id: string, campo: keyof ItemTermo, valor: string | number) {
    setItensTermo((atuais) => atuais.map((i) => (i.id === id ? { ...i, [campo]: valor } : i)));
  }

  async function gerarTermo() {
    if (!empregadoId || itensTermo.length === 0) {
      alert("Selecione um empregado e adicione pelo menos um item.");
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

    const empregado = empregados.find((e) => e.id === empregadoId);
    const empresa = empresas.find((e) => e.id === empresaSel);
    const bloqueio = bloqueioPorDemissao(empregado, "entrega", dataEntrega);
    if (bloqueio) {
      alert(bloqueio);
      return;
    }

    if (!empregado || !empresa) {
      alert("Escolha a empresa e o empregado.");
      return;
    }

    // O termo só documenta (decisão 415): não mexe no estoque. A saída só conta quando lançada em Entrega EPI.
    if (itensTermo.some((i) => !i.item_id)) {
      alert("Escolha o EPI em todas as linhas.");
      return;
    }
    const itensDoTermo = itensTermo;

    const html = montarTermoEntregaEpiHtml({
      empresa,
      empregado,
      responsavel: { nome: responsavel.nome },
      data: dataEntrega,
      linhas: itensDoTermo.map((it) => {
        const itemInfo = itens.find((i) => i.id === it.item_id);
        return {
          nome: itemInfo?.nome,
          ca: itemInfo?.ca,
          tamanho: tamanhoParaGravar(it.tamanho) ? nomeTamanho(parametros, it.tamanho) : undefined,
          quantidade: it.quantidade,
          estado: it.estado,
        };
      }),
    });

    abrirDocumento({
      titulo: "Termo de Entrega de EPI",
      html,
      arquivo: nomeArquivoDocumento("Termo de Entrega de EPI", empregado.nome, dataEntrega),
    });
  }

  return (
    <div className="space-y-6">
      <div className="panel p-6 space-y-4">
        <p className="rounded-lg border bg-muted/40 p-2 text-xs text-muted-foreground">
          O termo só documenta a entrega e não movimenta o estoque. A saída só é contabilizada quando lançada no menu Entrega EPI.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AvisoHabilitados desatualizada={habilitadosDesatualizados} onde="Parâmetros &gt; EPI &gt; Parâmetros Específicos" />
          <div className="space-y-1.5">
            <Label>Empresa</Label>
            <Select value={empresaSel} onValueChange={(v) => { if (!v) return; setEmpresaSel(v); setEmpregadoId(""); setResponsavelId(""); setItensTermo([]); }}>
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
                {receptoresDeEntrega(empregados, soEmpregadosDeEpi, empregadoAtivo).map((e) => (
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
            {empresaSel && empregadoId && responsaveis.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum outro empregado habilitado para entregar EPI. Habilite em Parâmetros &gt; EPI &gt; Parâmetros Específicos.</p>
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
                  <TableHead className="w-40">Tamanho</TableHead>
                  <TableHead className="w-32">Quantidade</TableHead>
                  <TableHead className="w-40">Estado</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itensTermo.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum item adicionado. Clique em "+ Adicionar EPI".
                    </TableCell>
                  </TableRow>
                ) : (
                  itensTermo.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>
                        <Select
                          value={it.item_id}
                          onValueChange={(v) => {
                            atualizarItem(it.id, "item_id", v);
                            atualizarItem(it.id, "tamanho", "");
                          }}
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
                        <SeletorTamanho
                          parametros={parametros}
                          modulo="epi"
                          produto={itens.find((i) => i.id === it.item_id)}
                          uso="saida"
                          valor={it.tamanho}
                          onChange={(v) => atualizarItem(it.id, "tamanho", v)}
                        />
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
          <Button requiresWrite="operar" onClick={gerarTermo}>
            Gerar Termo de Entrega
          </Button>
        </div>
      </div>
    </div>
  );
}
