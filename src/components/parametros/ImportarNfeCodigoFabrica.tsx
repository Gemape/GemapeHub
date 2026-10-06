import { FileUp } from "lucide-react";
import { formatarCnpj } from "@/lib/formatacao-cadastral";
import { useId, useMemo, useRef, useState } from "react";

import { CampoBusca, type OpcaoBusca } from "@/components/CampoBusca";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEmpresa } from "@/lib/empresa-context";
import { listarFornecedores, type Fornecedor } from "@/lib/fornecedores-demo";
import { formatarData } from "@/lib/gemape";
import {
  associarItemNfe,
  prepararAssociacoes,
  type LinhaAssociacao,
  type PreviaAssociacao,
} from "@/lib/associacao-nfe";
import { lerXmlNfe, type NotaFiscalXml } from "@/lib/nfe-xml";
import { ROTULO_TABELA, useProdutosGemape, type ProdutoGemape } from "@/lib/produtos-gemape";
import { executar, useParametrosBase } from "@/lib/use-parametros-base";

const TAMANHO_MAXIMO = 5 * 1024 * 1024;
const chaveProduto = (p: ProdutoGemape) => `${p.tabela}|${p.codigo_sku}`;

function LinhaItem({
  linha,
  previa,
  produtos,
  recarregarProdutos,
}: {
  linha: LinhaAssociacao;
  previa: PreviaAssociacao;
  produtos: ProdutoGemape[];
  recarregarProdutos: () => Promise<ProdutoGemape[] | null>;
}) {
  const [escolhido, setEscolhido] = useState("");
  const [ca, setCa] = useState("");
  const [salvando, setSalvando] = useState(false);
  const idBase = useId();

  const doProduto = produtos.filter((p) => p.empresa_id === previa.empresa?.id);
  const opcoes: OpcaoBusca[] = doProduto.map((p) => ({
    valor: chaveProduto(p),
    rotulo: `${p.codigo_sku} · ${p.nome}`,
    detalhe: ROTULO_TABELA[p.tabela],
  }));
  const produto = doProduto.find((p) => chaveProduto(p) === escolhido);

  async function associar() {
    if (!produto || salvando) return;
    setSalvando(true);
    try {
      // Confere de novo, na hora de gravar, se fornecedor e produto ainda existem.
      const atuais = await recarregarProdutos();
      if (!atuais) {
        toast.error("Não foi possível carregar os produtos. Tente de novo.");
        return;
      }
      const ok = executar(
        () =>
          associarItemNfe({
            previa,
            codigo: linha.codigo,
            produto,
            ca,
            fornecedoresAtuais: listarFornecedores(),
            produtosAtuais: atuais,
          }),
        `Código ${linha.codigo} associado a ${produto.codigo_sku}.`,
      );
      if (ok) {
        setEscolhido("");
        setCa("");
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <TableRow>
      <TableCell className="whitespace-nowrap">{linha.itens.join(", ")}</TableCell>
      <TableCell className="font-mono text-xs">{linha.codigo}</TableCell>
      <TableCell>{linha.descricao}</TableCell>
      <TableCell className="min-w-72">
        {linha.status === "vinculado" && linha.produto ? (
          <span className="flex flex-wrap items-center gap-1">
            <Badge variant="secondary">Vinculado</Badge>
            <span className="font-mono text-xs">{linha.produto.codigo_sku}</span>
            <span>{linha.produto.nome}</span>
            <span className="text-xs text-muted-foreground">
              ({ROTULO_TABELA[linha.produto.tabela]})
            </span>
          </span>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1">
              <Badge variant="outline">
                {linha.status === "reassociar" ? "Reassociar" : "Pendente"}
              </Badge>
              {linha.motivo && (
                <span className="text-xs text-muted-foreground">{linha.motivo}</span>
              )}
            </div>
            <CampoBusca
              id={`${idBase}-produto`}
              opcoes={opcoes}
              valor={escolhido}
              rotulo={`Produto para o código ${linha.codigo}`}
              onChange={setEscolhido}
              placeholder="Digite código ou nome do produto"
              vazio="Nenhum produto da empresa da nota com esse termo."
            />
            {produto?.tabela === "epis" && (
              <Input
                aria-label={`CA na nota fiscal do código ${linha.codigo}`}
                placeholder="CA na nota fiscal"
                maxLength={20}
                value={ca}
                onChange={(e) => setCa(e.target.value)}
              />
            )}
          </div>
        )}
      </TableCell>
      <TableCell className="text-right">
        {linha.status !== "vinculado" && (
          <Button
            requiresWrite
            size="sm"
            onClick={associar}
            disabled={!produto || !!previa.bloqueio || salvando}
            aria-label={`Associar o código ${linha.codigo}`}
          >
            Associar
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

// Lê o XML de uma NF-e só para criar associações do código de fábrica. Não grava entrada nem
// mexe em estoque: a entrada da nota continua nos módulos, que casam os itens por estas associações.
export function ImportarNfeCodigoFabrica() {
  const [aberto, setAberto] = useState(false);
  const [nota, setNota] = useState<NotaFiscalXml | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const arquivo = useRef<HTMLInputElement>(null);
  // Cada leitura recebe um número: só a mais recente pode mostrar a nota.
  const leitura = useRef(0);
  const { empresas } = useEmpresa();
  const parametros = useParametrosBase();
  const { data: produtos = [], refetch } = useProdutosGemape();

  const previa = useMemo(
    () =>
      nota
        ? prepararAssociacoes({
            nota,
            empresas,
            fornecedores,
            codigosFabrica: parametros.codigosFabrica,
            produtos,
          })
        : null,
    [nota, empresas, fornecedores, parametros.codigosFabrica, produtos],
  );

  async function recarregarProdutos() {
    const { data, error } = await refetch();
    return error || !data ? null : data;
  }

  function limpar() {
    leitura.current += 1;
    setNota(null);
    setErro(null);
    if (arquivo.current) arquivo.current.value = "";
  }

  async function lerArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const escolhido = e.target.files?.[0];
    const atual = ++leitura.current;
    setNota(null);
    setErro(null);
    if (!escolhido) return;
    try {
      if (escolhido.size > TAMANHO_MAXIMO) throw new Error("O arquivo passa de 5 MB.");
      const lida = lerXmlNfe(await escolhido.text());
      // Sem a lista de produtos, todo código existente apareceria como "Reassociar".
      const { data: produtosLidos, error: erroProdutos } = await refetch();
      if (erroProdutos || !produtosLidos) {
        throw new Error("Não foi possível carregar os produtos. Tente de novo.");
      }
      if (atual !== leitura.current) return;
      setFornecedores(listarFornecedores());
      setNota(lida);
    } catch (falha) {
      if (atual !== leitura.current) return;
      setErro(falha instanceof Error ? falha.message : "Não foi possível ler o arquivo.");
    }
  }

  const vinculados = previa?.linhas.filter((l) => l.status === "vinculado").length ?? 0;
  const nomeEmpresa = previa?.empresa?.nome_fantasia ?? previa?.nota.destinatario.nome;
  const nomeFornecedor = previa?.fornecedor?.nome_fantasia?.trim() || previa?.fornecedor?.razao_social?.trim() || previa?.nota.emitente.nome;

  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          limpar();
          setAberto(true);
        }}
      >
        <FileUp />
        Importar NF-e (XML)
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Importar NF-e (XML)</DialogTitle>
            <DialogDescription>
              Associe o código de cada item da nota ao produto da GEMAPE. Esta tela só cria
              associações e não dá entrada no estoque: a entrada da nota é feita nos módulos
              (Compras de EPI, Compras de Uniformes e Movimentações de Ferramentas).
            </DialogDescription>
          </DialogHeader>

          <Input
            ref={arquivo}
            type="file"
            accept=".xml,text/xml,application/xml"
            aria-label="Arquivo XML da NF-e"
            onChange={lerArquivo}
          />
          {erro && <p className="text-sm text-destructive">{erro}</p>}

          {previa && (
            <div className="space-y-3">
              <div className="grid gap-1 rounded-md border p-3 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">NF-e:</span> {previa.nota.numero}, série{" "}
                  {previa.nota.serie || "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Emissão:</span>{" "}
                  {formatarData(previa.nota.dataEmissao)}
                </p>
                <p>
                  <span className="text-muted-foreground">Fornecedor:</span> {nomeFornecedor} (
                  {formatarCnpj(previa.nota.emitente.cnpj)}){!previa.fornecedor && " · não cadastrado"}
                </p>
                <p>
                  <span className="text-muted-foreground">Empresa:</span> {nomeEmpresa} (
                  {formatarCnpj(previa.nota.destinatario.cnpj)}){!previa.empresa && " · não cadastrada"}
                </p>
              </div>

              {previa.bloqueio && (
                <p className="text-sm font-medium text-destructive">{previa.bloqueio}</p>
              )}

              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Itens</TableHead>
                      <TableHead>Código do fornecedor</TableHead>
                      <TableHead>Descrição na nota</TableHead>
                      <TableHead>Produto GEMAPE</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previa.linhas.map((linha) => (
                      <LinhaItem
                        key={linha.codigo.trim().toUpperCase()}
                        linha={linha}
                        previa={previa}
                        produtos={produtos}
                        recarregarProdutos={recarregarProdutos}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-sm text-muted-foreground">
                {vinculados} de {previa.linhas.length} códigos vinculados. A associação vale para as
                próximas notas do mesmo fornecedor.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
