import { BarraDeFiltros } from "@/components/layout/BarraDeFiltros";
import { capitalizarTexto } from "@/lib/formatacao-cadastral";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { EnderecoDaEntrada } from "@/components/EnderecoDaEntrada";
import { avisarEnderecamentoObrigatorio } from "@/lib/aviso-enderecamento";
import { BuscaEpiCompra } from "@/components/modules/BuscaEpiCompra";
import { DevolucaoEpiDialog } from "@/components/modules/DevolucaoEpiDialog";
import { SeletorFornecedorCompra } from "@/components/modules/SeletorFornecedorCompra";
import { ImportarNfeXml } from "@/components/modules/ImportarNfeXml";
import { TAMANHO_DISPONIVEL } from "@/components/SeletorTamanho";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { supabase } from "@/integrations/supabase/client";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { empresasParaEscolha } from "@/lib/empresas";
import { exportarCsv, formatarData, formatarMoeda } from "@/lib/gemape";
import { combinaBusca } from "@/lib/parametros-base";
import {
  useComprasEpis,
  useEmpregados,
  useEmpresas,
  useItens,
  useSalvar,
  useExcluir,
  type CompraEpi,
} from "@/lib/hooks-gemape";
import { escolherFornecedorDaCompra } from "@/lib/compras-fornecedor";
import { listarFornecedores } from "@/lib/fornecedores-demo";
import { MODO_DEMO } from "@/lib/modo-demo";
import { saldoParaCompra } from "@/lib/estoque-epi-saldos";
import { nomeTamanhoGravado, tamanhoParaGravar, validarLinhasTamanho } from "@/lib/estoque-tamanho";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { hojeLocal } from "@/lib/empregados";

const CHAVES = ["compras_epis", "itens", "movimentacoes"];

export function EpiComprasModulo() {
  const { empresaId } = useEmpresa();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<CompraEpi | null>(null);
  const [quantidade, setQuantidade] = useState(0);
  const [valorUnitario, setValorUnitario] = useState(0);
  // Produto e tamanho escolhidos: produto com tamanho em Gerais pede o tamanho (decisão 23).
  const [itemSel, setItemSel] = useState("");
  // Empresa da compra: o item escolhido tem de ser do cadastro dela (cada empresa tem o seu registro do mesmo produto).
  const [empresaCompra, setEmpresaCompra] = useState("");
  const [tamanho, setTamanho] = useState("");
  const [fornecedorId, setFornecedorId] = useState("");
  // CA da compra (decisão 327): vem preenchido com o do cadastro do EPI, mas é conferido e obrigatório.
  const [ca, setCa] = useState("");
  const [devolucaoAberta, setDevolucaoAberta] = useState(false);
  const parametros = useParametrosBase();

  const { data: compras = [], isLoading } = useComprasEpis(empresaId, busca);
  const { data: empresas = [] } = useEmpresas();
  const { data: itens = [] } = useItens("epi", TODAS);

  const salvar = useSalvar("compras_epis", CHAVES);
  const excluir = useExcluir("compras_epis", CHAVES);

  // Saldo do produto (e do tamanho escolhido) no estoque da empresa: todas as compras, de qualquer fornecedor, somam nele.
  const itemEscolhido = itens.find((i) => i.id === itemSel);
  // Sem tamanho escolhido (ou produto sem tamanho), vale o saldo total do item; com tamanho, o saldo dele.
  const saldoDoEscolhido = saldoParaCompra(parametros, itemEscolhido, "epi", tamanho, editando, itemSel);

  function abrirNovo() {
    setEditando(null);
    setQuantidade(0);
    setValorUnitario(0);
    setItemSel("");
    setTamanho("");
    setFornecedorId("");
    setCa("");
    setEmpresaCompra(empresasParaEscolha(empresas).some((e) => e.id === empresaId) ? empresaId : "");
    setAberto(true);
  }

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const itemId = String(f.get("item_id") ?? "");
    if (!itemId) { alert("Escolha o EPI na lista."); return; }
    const quantidadeCompra = Number(f.get("quantidade"));
    // Compra é de produto novo (decisão 327): todos os dados são obrigatórios.
    if (!String(f.get("nota_fiscal") ?? "").trim()) { alert("Informe a nota fiscal."); return; }
    if (!ca.trim()) { alert("Informe o CA do EPI."); return; }
    if (TAMANHO_DISPONIVEL) {
      const erro = validarLinhasTamanho(
        [{ item_id: itemId, quantidade: quantidadeCompra, tamanho }],
        itens,
        parametros,
        "epi",
        "entrada",
      );
      if (erro) {
        alert(erro);
        return;
      }
    }

    // No demonstrativo o fornecedor vem do cadastro e é conferido de novo na hora de gravar.
    let fornecedor = capitalizarTexto(String(f.get("fornecedor") ?? ""));
    let fornecedorGravado: { id: string } | null = null;
    if (MODO_DEMO) {
      const escolha = escolherFornecedorDaCompra(listarFornecedores(), "cat-epi", fornecedorId);
      if ("erro" in escolha) {
        alert(escolha.erro);
        return;
      }
      fornecedor = escolha.nome;
      fornecedorGravado = { id: escolha.id };
    }

    const valores: Record<string, unknown> = {
      empresa_id: String(f.get("empresa_id")),
      item_id: itemId,
      fornecedor,
      nota_fiscal: String(f.get("nota_fiscal") || "").trim(),
      // Colunas só do modo demonstração: o banco real (compras_epis) ainda não tem ca nem condicao.
      ...(MODO_DEMO ? { ca: ca.trim(), condicao: "novo" } : {}),
      data_compra: String(f.get("data_compra")),
      quantidade: quantidadeCompra,
      valor_unitario: Number(f.get("valor_unitario")),
      observacao: capitalizarTexto(String(f.get("observacao") || "")),
    };
    if (fornecedorGravado) valores["fornecedor_id"] = fornecedorGravado.id;
    if (TAMANHO_DISPONIVEL) valores["tamanho_id"] = tamanhoParaGravar(tamanho);

    salvar.mutate(
      { ...(editando ? { id: editando.id } : {}), valores },
      { onSuccess: () => { setAberto(false); void avisarEnderecamentoObrigatorio(parametros, "cat-epi", empresaCompra, itens.find((i) => i.id === itemSel)?.codigo_sku ?? ""); } },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <BarraDeFiltros>
          <Input
            placeholder="Buscar por fornecedor ou NF"
            className="max-w-xs"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </BarraDeFiltros>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() =>
              exportarCsv(
                "compras_epis",
                compras.map((c) => ({
                  Data: formatarData(c.data_compra),
                  "Estoque alimentado": empresas.find((e) => e.id === c.empresa_id)?.nome_fantasia,
                  Código: itens.find((i) => i.id === c.item_id)?.codigo_sku,
                  EPI: itens.find((i) => i.id === c.item_id)?.nome,
                  Tamanho: nomeTamanhoGravado(parametros, c.tamanho_id),
                  Fornecedor: c.fornecedor,
                  NF: c.nota_fiscal,
                  Qtd: c.quantidade,
                  Unitario: formatarMoeda(c.valor_unitario),
                  Total: formatarMoeda(c.valor_total ?? 0),
                })),
              )
            }
          >
            Exportar CSV
          </Button>
          <ImportarNfeXml />
          <Button requiresWrite onClick={abrirNovo}>Registrar Compra</Button>
          <Button requiresWrite onClick={() => setDevolucaoAberta(true)}>Devolução</Button>
        </div>
      </div>

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead title="Estoque que a compra alimentou (a empresa do item)">Estoque</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>EPI</TableHead>
              <TableHead>Tamanho</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>NF</TableHead>
              <TableHead>CA</TableHead>
              <TableHead className="text-right">Qtd</TableHead>
              <TableHead className="text-right">Unitário</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : compras.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center">
                  Nenhuma compra registrada.
                </TableCell>
              </TableRow>
            ) : (
              compras.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{formatarData(c.data_compra)}</TableCell>
                  <TableCell>
                    {empresas.find((e) => e.id === c.empresa_id)?.nome_fantasia}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{itens.find((i) => i.id === c.item_id)?.codigo_sku ?? "—"}</TableCell>
                  <TableCell>{itens.find((i) => i.id === c.item_id)?.nome}</TableCell>
                  <TableCell>{nomeTamanhoGravado(parametros, c.tamanho_id) || "—"}</TableCell>
                  <TableCell>{c.fornecedor}</TableCell>
                  <TableCell>{c.nota_fiscal || "—"}</TableCell>
                  <TableCell>{String((c as { ca?: string | null }).ca ?? "") || "—"}</TableCell>
                  <TableCell className="text-right">{c.quantidade}</TableCell>
                  <TableCell className="text-right">{formatarMoeda(c.valor_unitario)}</TableCell>
                  <TableCell className="text-right font-bold">
                    {formatarMoeda(c.valor_total ?? 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button requiresWrite
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (
                          confirm(
                            "Excluir esta compra? (O estoque não será revertido automaticamente)",
                          )
                        ) {
                          excluir.mutate(c.id);
                        }
                      }}
                    >
                      Excluir
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EntradasDeUsados empresaId={empresaId} itens={itens} empresas={empresas} />
      <DevolucaoEpiDialog aberto={devolucaoAberta} onAbrirMudou={setDevolucaoAberta} />

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrar Compra de EPI</DialogTitle>
            <DialogDescription>
              Compra de produto novo: informe todos os dados (empresa, EPI, fornecedor, nota fiscal, CA, data, quantidade e valor unitário). Eles atualizam o estoque e geram uma
              movimentação de entrada. Para EPI que volta de um funcionário, use Devolução.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="empresa_id">Estoque a alimentar (empresa)</Label>
              <Select
                name="empresa_id"
                required
                value={empresaCompra}
                onValueChange={(v) => {
                  if (!v) return;
                  setEmpresaCompra(v);
                  setItemSel("");
                  setTamanho("");
                }}
              >
                <SelectTrigger id="empresa_id">
                  <SelectValue placeholder="Selecione o estoque" />
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
            {/* EPI: busca por palavra-chave e lista no formato código + descrição + tamanho; escolher a linha define o EPI e o tamanho (decisão 351). */}
            <BuscaEpiCompra
              itens={itens.filter((i) => i.empresa_id === empresaCompra)}
              parametros={parametros}
              itemId={itemSel}
              tamanho={tamanho}
              empresaEscolhida={!!empresaCompra}
              aoEscolher={(o) => {
                setItemSel(o.itemId);
                setTamanho(o.tamanho);
                setCa(o.ca);
              }}
            />
            <input type="hidden" name="item_id" value={itemSel} />
            <div className="space-y-1 sm:col-span-2">
              {itemSel ? (
                <p className="text-sm">
                  <span className="text-muted-foreground">Escolhido: </span>
                  Código {itens.find((i) => i.id === itemSel)?.codigo_sku} · {itens.find((i) => i.id === itemSel)?.nome} · Tamanho {tamanho ? nomeTamanhoGravado(parametros, tamanhoParaGravar(tamanho)) || "—" : "—"}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum EPI escolhido: clique numa linha da lista.</p>
              )}
              {itemSel && <EnderecoDaEntrada categoriaId="cat-epi" empresaId={empresaCompra} codigo={itens.find((i) => i.id === itemSel)?.codigo_sku ?? ""} />}
              {itemSel && (
                <p className="text-xs text-muted-foreground">
                  Esta compra alimenta o estoque {empresas.find((e) => e.id === empresaCompra)?.nome_fantasia}, onde o item existe uma vez só: compras de qualquer fornecedor somam no mesmo saldo (saldo {tamanho ? "do tamanho escolhido " : ""}hoje: {saldoDoEscolhido}{quantidade > 0 ? `; com esta compra: ${saldoDoEscolhido + quantidade}` : ""}).
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                EPI não está na lista?{" "}
                <a href="/cadastros/epi" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-2">Cadastrar EPI</a>
              </p>
            </div>
            <SeletorFornecedorCompra categoriaId="cat-epi" valor={fornecedorId} onChange={setFornecedorId} />
            <div className="space-y-1.5">
              <Label htmlFor="nota_fiscal">Nota Fiscal</Label>
              <Input id="nota_fiscal" name="nota_fiscal" required placeholder="Número da NF" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ca_compra">CA</Label>
              <Input id="ca_compra" required value={ca} onChange={(e) => setCa(e.target.value)} placeholder="Certificado de Aprovação" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="data_compra">Data da Compra</Label>
              <Input
                id="data_compra"
                name="data_compra"
                type="date"
                required
                defaultValue={hojeLocal()}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quantidade">Quantidade</Label>
              <Input
                id="quantidade"
                name="quantidade"
                type="number"
                required
                min="1"
                onChange={(e) => setQuantidade(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="valor_unitario">Valor Unitário (R$)</Label>
              <Input
                id="valor_unitario"
                name="valor_unitario"
                type="number"
                step="0.01"
                required
                min="0.01"
                onChange={(e) => setValorUnitario(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Valor Total</Label>
              <Input
                value={formatarMoeda(quantidade * valorUnitario)}
                readOnly
                className="bg-muted font-bold"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="observacao">Observação</Label>
              <Textarea id="observacao" name="observacao" capitalizar="texto" rows={3} />
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
              <Button requiresWrite type="submit" disabled={salvar.isPending}>
                Registrar Compra
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Entradas de EPI usado (decisão 327): as devoluções registradas em Devolução, cada uma com os dados da compra original que ela mantém.
type MovimentoUsado = {
  id: string; data_movimentacao: string; empresa_id: string; item_id: string | null; quantidade: number; tamanho_id?: string | null; empregado_id?: string | null;
  codigo_movimentacao?: string | null; condicao?: string | null; motivo_devolucao?: string | null; data_compra_origem?: string | null; nota_fiscal_origem?: string | null; fornecedor_origem?: string | null; ca_origem?: string | null;
};
export function EntradasDeUsados({ empresaId, itens, empresas, modulo = "epi", mostrarVazio = false, busca = "" }: { modulo?: "epi" | "uniforme"; mostrarVazio?: boolean; busca?: string; empresaId: string; itens: { id: string; nome: string; codigo_sku: string }[]; empresas: { id: string; nome_fantasia: string }[] }) {
  const parametros = useParametrosBase();
  const { data: empregados = [] } = useEmpregados(TODAS);
  const { data: movimentos = [] } = useQuery({
    queryKey: [`${modulo}-entradas-usados`, empresaId],
    queryFn: async () => {
      let q = supabase.from("movimentacoes").select("*").eq("modulo", modulo).eq("tipo_movimentacao", "Devolucao");
      if (empresaId !== TODAS) q = q.eq("empresa_id", empresaId);
      const { data } = await q;
      return ((data ?? []) as MovimentoUsado[]).filter((m) => m.condicao === "usado").sort((a, b) => b.data_movimentacao.localeCompare(a.data_movimentacao));
    },
  });
  // Busca por palavra-chave (decisão 382): data, código da devolução, funcionário, empresa, item, tamanho, motivo, compra original, NF, fornecedor e CA; sem acento e com as palavras em qualquer ordem.
  const visiveis = useMemo(() => {
    if (!busca.trim()) return movimentos;
    const nomes = new Map(empregados.map((e) => [e.id, e.nome]));
    const fantasias = new Map(empresas.map((e) => [e.id, e.nome_fantasia]));
    const rotulos = new Map(itens.map((i) => [i.id, `${i.codigo_sku} · ${i.nome}`]));
    return movimentos.filter((m) => combinaBusca(busca, formatarData(m.data_movimentacao), m.codigo_movimentacao, nomes.get(m.empregado_id ?? ""), fantasias.get(m.empresa_id), rotulos.get(m.item_id ?? ""), nomeTamanhoGravado(parametros, m.tamanho_id), m.motivo_devolucao, m.data_compra_origem ? formatarData(m.data_compra_origem) : "", m.nota_fiscal_origem, m.fornecedor_origem, modulo === "epi" ? m.ca_origem : ""));
  }, [busca, movimentos, empregados, empresas, itens, parametros, modulo]);
  if (movimentos.length === 0) return mostrarVazio ? <p className="panel p-4 text-sm text-muted-foreground">Nenhuma devolução registrada. Use o botão Devolução para registrar.</p> : null;
  return (
    <section className="space-y-2" aria-labelledby="entradas-usados">
      <h2 id="entradas-usados" className="text-lg font-semibold">Entradas de usados (devoluções)</h2>
      {busca.trim() && <p className="text-sm text-muted-foreground">{visiveis.length} de {movimentos.length} devoluções.</p>}
      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Devolução</TableHead>
              <TableHead>Funcionário</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>{modulo === "epi" ? "EPI" : "Uniforme"}</TableHead>
              <TableHead>Tamanho</TableHead>
              <TableHead className="text-right">Qtd</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Compra original</TableHead>
              <TableHead>NF</TableHead>
              <TableHead>Fornecedor</TableHead>
              {modulo === "epi" && <TableHead>CA</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiveis.length === 0 && <TableRow><TableCell colSpan={modulo === "epi" ? 11 : 10} className="text-center text-muted-foreground">Nenhuma devolução para a busca.</TableCell></TableRow>}
            {visiveis.map((m) => (
              <TableRow key={m.id}>
                <TableCell>{formatarData(m.data_movimentacao)}{m.codigo_movimentacao ? ` · ${m.codigo_movimentacao}` : ""}</TableCell>
                <TableCell>{empregados.find((e) => e.id === m.empregado_id)?.nome ?? "—"}</TableCell>
                <TableCell>{empresas.find((e) => e.id === m.empresa_id)?.nome_fantasia ?? "—"}</TableCell>
                <TableCell>{itens.find((i) => i.id === m.item_id) ? `${itens.find((i) => i.id === m.item_id)?.codigo_sku} · ${itens.find((i) => i.id === m.item_id)?.nome}` : "—"}</TableCell>
                <TableCell>{nomeTamanhoGravado(parametros, m.tamanho_id) || "—"}</TableCell>
                <TableCell className="text-right">{m.quantidade}</TableCell>
                <TableCell>{m.motivo_devolucao || "—"}</TableCell>
                <TableCell>{m.data_compra_origem ? formatarData(m.data_compra_origem) : "—"}</TableCell>
                <TableCell>{m.nota_fiscal_origem || "—"}</TableCell>
                <TableCell>{m.fornecedor_origem || "—"}</TableCell>
                {modulo === "epi" && <TableCell>{m.ca_origem || "—"}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
