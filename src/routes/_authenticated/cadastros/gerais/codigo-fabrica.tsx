import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { CampoBusca, type OpcaoBusca } from "@/components/CampoBusca";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AcoesLinha } from "@/components/parametros/AcoesLinha";
import { Cabecalho } from "@/components/parametros/Cabecalho";
import { useEmpresa } from "@/lib/empresa-context";
import { formatarCnpj } from "@/lib/formatacao-cadastral";
import { FornecedorDialog } from "@/components/parametros/FornecedorDialog";
import { listarFornecedores, proximoCodigoFornecedor, type Fornecedor } from "@/lib/fornecedores-demo";
import {
  combinaBusca,
  lerParametros,
  removerCodigoFabrica,
  removerCodigosFabricaPorIds,
  salvarCodigoFabrica,
  type CodigoFabrica,
} from "@/lib/parametros-base";
import { supabase } from "@/integrations/supabase/client";
import { codigoDaCopia, montarCopiaDoProduto } from "@/lib/clonar-produto-gemape";
import { lerTodas } from "@/lib/ler-todas";
import { ROTULO_TABELA, useProdutosGemape, type ProdutoGemape } from "@/lib/produtos-gemape";
import { executar, useParametrosBase } from "@/lib/use-parametros-base";

export const Route = createFileRoute("/_authenticated/cadastros/gerais/codigo-fabrica")({
  head: () => ({ meta: [{ title: "Código de fábrica | Patrimônio GEMAPE" }] }),
  component: CodigoFabricaPagina,
});

const chaveProduto = (p: {
  tabela: string;
  empresa_id: string | null;
  codigo_sku?: string;
  codigo_produto?: string;
}) => `${p.tabela}|${p.empresa_id ?? ""}|${p.codigo_sku ?? p.codigo_produto ?? ""}`;

const MODO_DEMO = import.meta.env["VITE_DEMO_MODE"] !== "false";

function CodigoFabricaPagina() {
  const dados = useParametrosBase();
  const queryClient = useQueryClient();
  // O ref bloqueia o clique repetido na hora, antes de o estado desabilitar o botão.
  const trava = useRef(false);
  const [salvando, setSalvando] = useState(false);
  const { empresas } = useEmpresa();
  const { data: produtos = [], isLoading } = useProdutosGemape();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<CodigoFabrica | null>(null);
  // Clonar: formulário de associação nova, preenchida com os dados da origem.
  const [modelo, setModelo] = useState<CodigoFabrica | null>(null);
  const base = editando ?? modelo;
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [produtoSel, setProdutoSel] = useState("");
  const [fornecedorSel, setFornecedorSel] = useState("");
  // Cadastro de fornecedor em janela por cima do formulário, para não sair da tela.
  const [novoFornecedorAberto, setNovoFornecedorAberto] = useState(false);
  const [codigoNovoFornecedor, setCodigoNovoFornecedor] = useState("");
  const [codigoNota, setCodigoNota] = useState("");
  const [ca, setCa] = useState("");
  const nomeEmpresa = (id: string | null) =>
    empresas.find((e) => e.id === id)?.nome_fantasia ?? "—";

  // Só produtos com empresa: a associação é sempre de um produto de uma empresa.
  const opcoesProduto: OpcaoBusca[] = produtos
    .filter((p) => p.empresa_id)
    .map((p) => ({
      valor: chaveProduto(p),
      rotulo: `${p.codigo_sku} · ${p.nome}`,
      detalhe: `${ROTULO_TABELA[p.tabela]} · ${nomeEmpresa(p.empresa_id)}`,
    }));
  const opcoesFornecedor: OpcaoBusca[] = fornecedores.map((f) => ({
    valor: f.id,
    rotulo: f.nome_fantasia || f.razao_social,
    detalhe: `${f.razao_social} · ${formatarCnpj(f.cnpj)}`,
  }));
  const produto: ProdutoGemape | undefined = produtos.find((p) => chaveProduto(p) === produtoSel);
  const ehEpi = (produto?.tabela ?? base?.tabela) === "epis";

  const linhas = useMemo(
    () =>
      dados.codigosFabrica
        .filter((c) =>
          combinaBusca(
            busca,
            c.codigo_produto,
            c.nome_produto,
            c.fornecedor_nome,
            c.codigo_fornecedor,
            c.ca,
          ),
        )
        .sort((a, b) =>
          a.codigo_produto.localeCompare(b.codigo_produto, "pt-BR", { numeric: true }),
        ),
    [dados.codigosFabrica, busca],
  );

  // Ao clonar, todos os dados da origem são copiados, inclusive o código na nota, e podem ser editados (decisão 138).
  function abrir(codigo: CodigoFabrica | null, clonar = false) {
    setFornecedores(listarFornecedores());
    setEditando(clonar ? null : codigo);
    setModelo(clonar ? codigo : null);
    setProdutoSel(codigo ? chaveProduto(codigo) : "");
    setFornecedorSel(codigo?.fornecedor_id ?? "");
    setCodigoNota(codigo?.codigo_fornecedor ?? "");
    setCa((codigo?.ca ?? "").replace(/\D/g, ""));
    setAberto(true);
  }

  function abrirNovoFornecedor() {
    setCodigoNovoFornecedor(proximoCodigoFornecedor());
    setNovoFornecedorAberto(true);
  }

  // Clonar (decisão 231): cria uma cópia do produto GEMAPE com o código seguinte e liga a ela o fornecedor,
  // o código da nota e o CA. A associação é validada e gravada primeiro; se o produto não for criado, ela é desfeita.
  async function enviarClone(origem: CodigoFabrica) {
    if (trava.current) return;
    trava.current = true;
    setSalvando(true);
    try {
      const linhas = await lerTodas<Record<string, unknown>>(() => supabase.from(origem.tabela).select("*"), (q) => q.order("id"));
      const produtoOrigem = linhas.find(
        (l) => l["codigo_sku"] === origem.codigo_produto && (l["empresa_id"] ?? null) === (origem.empresa_id ?? null),
      );
      if (!produtoOrigem) throw new Error(`O produto ${origem.codigo_produto} não foi encontrado para clonar.`);
      if (produtoOrigem["catalogo_id"]) {
        throw new Error(
          `${origem.codigo_produto} vem do catálogo de ${ROTULO_TABELA[origem.tabela]}. Clone-o em Parâmetros > ${ROTULO_TABELA[origem.tabela]} (que pede outro tamanho) e depois use Nova associação.`,
        );
      }
      const codigo = codigoDaCopia(lerParametros().regrasCodigo, origem.tabela, origem.codigo_produto, linhas.map((l) => String(l["codigo_sku"] ?? "")));
      const fornecedor = fornecedores.find((f) => f.id === fornecedorSel);
      const salva = salvarCodigoFabrica({
        empresa_id: origem.empresa_id ?? "",
        tabela: origem.tabela,
        codigo_produto: codigo,
        nome_produto: origem.nome_produto,
        fornecedor_id: fornecedor?.id ?? (fornecedorSel === origem.fornecedor_id ? origem.fornecedor_id : ""),
        fornecedor_nome: (fornecedor ? fornecedor.nome_fantasia || fornecedor.razao_social : undefined) ?? origem.fornecedor_nome,
        codigo_fornecedor: codigoNota,
        ca,
      });
      const { error } = await (supabase.from(origem.tabela) as unknown as {
        insert: (v: Record<string, unknown>) => Promise<{ error: Error | null }>;
      }).insert(montarCopiaDoProduto(produtoOrigem, codigo));
      if (error) {
        removerCodigosFabricaPorIds([salva.id]);
        throw error;
      }
      await queryClient.invalidateQueries({ queryKey: ["produtos-gemape"] });
      toast.success(`Produto ${codigo} criado e associado ao fornecedor.`);
      setAberto(false);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível clonar o produto.");
    } finally {
      trava.current = false;
      setSalvando(false);
    }
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (modelo && MODO_DEMO) {
      void enviarClone(modelo);
      return;
    }
    // Ao editar, o produto pode não estar mais na lista; mantém o que estava salvo.
    const origem =
      produto ??
      (base && produtoSel === chaveProduto(base)
        ? {
            tabela: base.tabela,
            empresa_id: base.empresa_id,
            codigo_sku: base.codigo_produto,
            nome: base.nome_produto,
          }
        : undefined);
    const fornecedor = fornecedores.find((f) => f.id === fornecedorSel);
    const ok = executar(
      () =>
        salvarCodigoFabrica(
          {
            empresa_id: origem?.empresa_id ?? "",
            tabela: origem?.tabela ?? "epis",
            codigo_produto: origem?.codigo_sku ?? "",
            nome_produto: origem?.nome ?? "",
            fornecedor_id:
              fornecedor?.id ??
              (fornecedorSel === base?.fornecedor_id ? base.fornecedor_id : ""),
            fornecedor_nome: (fornecedor ? fornecedor.nome_fantasia || fornecedor.razao_social : undefined) ?? base?.fornecedor_nome ?? "",
            codigo_fornecedor: codigoNota,
            ca,
          },
          editando?.id,
        ),
      "Código de fábrica salvo.",
    );
    if (ok) setAberto(false);
  }

  return (
    <div className="space-y-5">
      <Cabecalho
        titulo="Código de fábrica"
        descricao="Associa o código do produto na nota fiscal do fornecedor ao código interno da GEMAPE. Na entrada da nota, o sistema saberá a qual produto somar o estoque."
      >
        <Button onClick={() => abrir(null)}>Nova associação</Button>
      </Cabecalho>

      <Input
        className="max-w-sm"
        placeholder="Buscar por produto, fornecedor, código ou CA"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código GEMAPE</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Código na nota</TableHead>
              <TableHead>CA</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  {busca ? "Nenhuma associação encontrada." : "Nenhuma associação cadastrada."}
                </TableCell>
              </TableRow>
            )}
            {linhas.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs">{c.codigo_produto}</TableCell>
                <TableCell>
                  {c.nome_produto}{" "}
                  <span className="text-xs text-muted-foreground">({ROTULO_TABELA[c.tabela]})</span>
                </TableCell>
                <TableCell>{c.fornecedor_nome}</TableCell>
                <TableCell className="font-mono text-xs">{c.codigo_fornecedor}</TableCell>
                <TableCell>{c.ca || "—"}</TableCell>
                <TableCell>{nomeEmpresa(c.empresa_id)}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <AcoesLinha
                    rotulo={`associação ${c.codigo_fornecedor} de ${c.codigo_produto}`}
                    onClonar={() => abrir(c, true)}
                    onEditar={() => abrir(c)}
                      editarLivre
                    onExcluir={() => {
                      if (
                        confirm(
                          `Excluir a associação ${c.codigo_fornecedor} → ${c.codigo_produto}?`,
                        )
                      ) {
                        executar(() => removerCodigoFabrica(c.id), "Associação excluída.");
                      }
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editando ? "Editar código de fábrica" : modelo ? "Clonar código de fábrica" : "Novo código de fábrica"}
            </DialogTitle>
            <DialogDescription>
              {modelo && MODO_DEMO
                ? "Cria uma cópia do produto com um código novo da GEMAPE e liga a ela o fornecedor e o código da nota, que vêm copiados e podem ser editados."
                : "Escolha o produto da GEMAPE e o fornecedor e informe o código que vem na nota fiscal."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={enviar} className="grid min-w-0 gap-4 [&>*]:min-w-0">
            {modelo && MODO_DEMO ? (
              <div className="space-y-1.5">
                <Label>Produto GEMAPE</Label>
                <p className="rounded-md border bg-muted px-3 py-2 text-sm">
                  Novo produto, cópia de <span className="font-mono">{modelo.codigo_produto}</span> · {modelo.nome_produto}.
                  O código é gerado ao salvar.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="produto">Produto GEMAPE</Label>
                <CampoBusca
                  id="produto"
                  opcoes={
                    base && !produto && produtoSel === chaveProduto(base)
                      ? [
                          ...opcoesProduto,
                          {
                            valor: produtoSel,
                            rotulo: `${base.codigo_produto} · ${base.nome_produto}`,
                          },
                        ]
                      : opcoesProduto
                  }
                  valor={produtoSel}
                  onChange={setProdutoSel}
                  placeholder={
                    isLoading ? "Carregando produtos…" : "Digite código ou nome do produto"
                  }
                  vazio="Nenhum produto cadastrado com esse termo."
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="fornecedor">Fornecedor</Label>
              <CampoBusca
                id="fornecedor"
                opcoes={
                  base && !fornecedores.some((f) => f.id === base.fornecedor_id)
                    ? [
                        ...opcoesFornecedor,
                        { valor: base.fornecedor_id, rotulo: base.fornecedor_nome },
                      ]
                    : opcoesFornecedor
                }
                valor={fornecedorSel}
                onChange={setFornecedorSel}
                placeholder="Digite nome, razão social ou CNPJ"
                vazio="Nenhum fornecedor encontrado."
              />
              <p className="text-xs text-muted-foreground">
                {fornecedores.length === 0 ? "Nenhum fornecedor cadastrado. " : "Não achou o fornecedor? "}
                <button type="button" className="underline" onClick={abrirNovoFornecedor}>
                  Cadastrar fornecedor
                </button>
                .
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="codigo_fornecedor">Código na nota fiscal</Label>
                <Input
                  id="codigo_fornecedor"
                  required
                  maxLength={60}
                  value={codigoNota}
                  onChange={(e) => setCodigoNota(e.target.value)}
                />
              </div>
              {ehEpi && (
                <div className="space-y-1.5">
                  <Label htmlFor="ca">CA na nota fiscal</Label>
                  <Input
                    id="ca"
                    required
                    inputMode="numeric"
                    maxLength={20}
                    value={ca}
                    onChange={(e) => setCa(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando}>Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <FornecedorDialog
        aberto={novoFornecedorAberto}
        onAberto={setNovoFornecedorAberto}
        editando={null}
        modelo={null}
        codigoPrevisto={codigoNovoFornecedor}
        onSalvo={(novo) => {
          // Volta ao formulário com o fornecedor recém-cadastrado já escolhido.
          setFornecedores(listarFornecedores());
          setFornecedorSel(novo.id);
        }}
      />
    </div>
  );
}
