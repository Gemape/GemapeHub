import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

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
import { Cabecalho } from "@/components/parametros/Cabecalho";
import { useEmpresa } from "@/lib/empresa-context";
import { listarFornecedores, type Fornecedor } from "@/lib/fornecedores-demo";
import {
  combinaBusca,
  removerCodigoFabrica,
  salvarCodigoFabrica,
  type CodigoFabrica,
} from "@/lib/parametros-base";
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

function CodigoFabricaPagina() {
  const dados = useParametrosBase();
  const { empresas } = useEmpresa();
  const { data: produtos = [], isLoading } = useProdutosGemape();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<CodigoFabrica | null>(null);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [produtoSel, setProdutoSel] = useState("");
  const [fornecedorSel, setFornecedorSel] = useState("");
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
    rotulo: f.nome_fantasia,
    detalhe: `${f.razao_social} · ${f.cnpj}`,
  }));
  const produto: ProdutoGemape | undefined = produtos.find((p) => chaveProduto(p) === produtoSel);
  const ehEpi = (produto?.tabela ?? editando?.tabela) === "epis";

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

  function abrir(codigo: CodigoFabrica | null) {
    setFornecedores(listarFornecedores());
    setEditando(codigo);
    setProdutoSel(codigo ? chaveProduto(codigo) : "");
    setFornecedorSel(codigo?.fornecedor_id ?? "");
    setCodigoNota(codigo?.codigo_fornecedor ?? "");
    setCa(codigo?.ca ?? "");
    setAberto(true);
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    // Ao editar, o produto pode não estar mais na lista; mantém o que estava salvo.
    const origem =
      produto ??
      (editando && produtoSel === chaveProduto(editando)
        ? {
            tabela: editando.tabela,
            empresa_id: editando.empresa_id,
            codigo_sku: editando.codigo_produto,
            nome: editando.nome_produto,
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
              (fornecedorSel === editando?.fornecedor_id ? editando.fornecedor_id : ""),
            fornecedor_nome: fornecedor?.nome_fantasia ?? editando?.fornecedor_nome ?? "",
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
                <TableCell className="whitespace-nowrap text-right">
                  <Button variant="ghost" size="sm" onClick={() => abrir(c)}>
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (
                        confirm(
                          `Excluir a associação ${c.codigo_fornecedor} → ${c.codigo_produto}?`,
                        )
                      ) {
                        executar(() => removerCodigoFabrica(c.id), "Associação excluída.");
                      }
                    }}
                  >
                    Excluir
                  </Button>
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
              {editando ? "Editar código de fábrica" : "Novo código de fábrica"}
            </DialogTitle>
            <DialogDescription>
              Escolha o produto da GEMAPE e o fornecedor e informe o código que vem na nota fiscal.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={enviar} className="grid min-w-0 gap-4 [&>*]:min-w-0">
            <div className="space-y-1.5">
              <Label htmlFor="produto">Produto GEMAPE</Label>
              <CampoBusca
                id="produto"
                opcoes={
                  editando && !produto && produtoSel === chaveProduto(editando)
                    ? [
                        ...opcoesProduto,
                        {
                          valor: produtoSel,
                          rotulo: `${editando.codigo_produto} · ${editando.nome_produto}`,
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
            <div className="space-y-1.5">
              <Label htmlFor="fornecedor">Fornecedor</Label>
              <CampoBusca
                id="fornecedor"
                opcoes={
                  editando && !fornecedores.some((f) => f.id === editando.fornecedor_id)
                    ? [
                        ...opcoesFornecedor,
                        { valor: editando.fornecedor_id, rotulo: editando.fornecedor_nome },
                      ]
                    : opcoesFornecedor
                }
                valor={fornecedorSel}
                onChange={setFornecedorSel}
                placeholder="Digite nome, razão social ou CNPJ"
                vazio="Nenhum fornecedor encontrado."
              />
              {fornecedores.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum fornecedor cadastrado. Cadastre em{" "}
                  <Link to="/cadastros/fornecedores" className="underline">
                    Cadastros › Fornecedores
                  </Link>
                  .
                </p>
              )}
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
                    maxLength={20}
                    value={ca}
                    onChange={(e) => setCa(e.target.value)}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
