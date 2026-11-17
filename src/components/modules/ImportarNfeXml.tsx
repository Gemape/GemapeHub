import { avisarOutrasAbas } from "@/lib/sincronia-abas";
import { confirmar } from "@/components/ConfirmarAcao";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { ehXml, registrarReceptor } from "@/lib/arquivos-soltos";
import { lerTodas } from "@/lib/ler-todas";
import { useEmpresa } from "@/lib/empresa-context";
import { listarFornecedores } from "@/lib/fornecedores-demo";
import { formatarData, formatarMoeda } from "@/lib/gemape";
import { formatarCnpj } from "@/lib/formatacao-cadastral";
import { controlaTamanho, type ProdutoTamanho } from "@/lib/estoque-tamanho";
import {
  MODULO_DA_TABELA,
  montarEntradas,
  prepararImportacao,
  ROTULO_MODULO,
  type PreviaImportacao,
  type ProdutoComId,
} from "@/lib/importacao-nfe";
import { lerXmlNfe } from "@/lib/nfe-xml";
import type { TabelaProduto } from "@/lib/parametros-base";
import { useParametrosBase } from "@/lib/use-parametros-base";

// Só o modo demonstração tem a operação de importação; no banco real ela é pendência da Fase 2.
const MODO_DEMO = import.meta.env["VITE_DEMO_MODE"] !== "false";
const TAMANHO_MAXIMO = 5 * 1024 * 1024;
const TABELAS: TabelaProduto[] = ["epis", "uniformes", "ferramentas"];

function useDadosImportacao(ativo: boolean) {
  return useQuery({
    queryKey: ["importacao-nfe"],
    enabled: ativo,
    queryFn: async () => {
      const listas = await Promise.all(
        TABELAS.map(async (tabela) => {
          // Linha inteira: a subcategoria e o saldo dizem se o produto controla tamanho. Lê tudo (o servidor corta em 1000 linhas).
          const produtos = await lerTodas<Omit<ProdutoComId, "tabela"> & ProdutoTamanho>(
            () => supabase.from(tabela).select("*"),
            (q) => q.order("id"),
          );
          return produtos.map((p) => ({
            ...p,
            tabela,
          }));
        }),
      );
      // Todas as chaves: uma nota antiga fora da lista passaria na checagem de duplicidade e entraria em dobro no estoque.
      const notas = await lerTodas<{ chave: string }>(
        () => supabase.from("notas_fiscais_importadas" as never).select("chave"),
        (q) => q.order("chave"),
      );
      return {
        produtos: listas.flat(),
        chaves: notas.map((n) => n.chave),
      };
    },
  });
}

// Lê o XML de uma NF-e, mostra a prévia com o destino de cada item e grava tudo de uma vez.
export function ImportarNfeXml() {
  const [aberto, setAberto] = useState(false);
  const [previa, setPrevia] = useState<PreviaImportacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  const travado = useRef(false);
  const arquivo = useRef<HTMLInputElement>(null);
  // Cada leitura recebe um número: só a mais recente pode mostrar a prévia.
  const leitura = useRef(0);
  const queryClient = useQueryClient();
  const { empresas } = useEmpresa();
  const parametros = useParametrosBase();
  const dados = useDadosImportacao(aberto);

  // Soltar o XML da nota em qualquer parte da tela abre a importação já com a prévia.
  const lerRef = useRef(lerEscolhido);
  lerRef.current = lerEscolhido;
  useEffect(() => {
    if (!MODO_DEMO) return;
    return registrarReceptor({ rotulo: "importar a nota fiscal (XML)", aceita: (a) => ehXml(a) && !!a, receber: (arquivos) => { setAberto(true); void lerRef.current(arquivos[0]); } });
  }, []);

  if (!MODO_DEMO) return null;

  function limpar() {
    leitura.current += 1;
    setPrevia(null);
    setErro(null);
    if (arquivo.current) arquivo.current.value = "";
  }

  function lerArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    void lerEscolhido(e.target.files?.[0]);
  }

  async function lerEscolhido(escolhido: File | undefined) {
    const atual = ++leitura.current;
    setPrevia(null);
    setErro(null);
    if (!escolhido) return;
    try {
      if (escolhido.size > TAMANHO_MAXIMO) throw new Error("O arquivo passa de 5 MB.");
      const nota = lerXmlNfe(await escolhido.text());
      const atuais = await dados.refetch();
      if (!atuais.data)
        throw new Error("Não foi possível ler os produtos cadastrados. Tente de novo.");
      if (atual !== leitura.current) return;
      setPrevia(
        prepararImportacao({
          nota,
          empresas,
          fornecedores: listarFornecedores(),
          codigosFabrica: parametros.codigosFabrica,
          // Produto com estoque por tamanho fica como pendência: a nota não traz o tamanho.
          produtos: atuais.data.produtos.map((p) => {
            const modulo = MODULO_DA_TABELA[p.tabela];
            return {
              ...p,
              controlaTamanho: modulo !== "ferramenta" && controlaTamanho(parametros, modulo, p),
            };
          }),
          chavesImportadas: atuais.data.chaves,
        }),
      );
    } catch (falha) {
      if (atual !== leitura.current) return;
      setErro(falha instanceof Error ? falha.message : "Não foi possível ler o arquivo.");
    }
  }

  async function gravar() {
    if (!previa || travado.current) return;
    travado.current = true;
    setGravando(true);
    try {
      const entradas = montarEntradas(previa);
      const total =
        entradas.compras_epis.length +
        entradas.compras_uniformes.length +
        entradas.movimentacoes.length;
      const pendentes = previa.linhas.length - total;
      if (
        pendentes > 0 &&
        !(await confirmar({ titulo: `Gravar os outros ${total}?`, descricao: `${pendentes} item(ns) pendente(s) não serão gravados.`, rotuloConfirmar: "Gravar" }))
      ) {
        return;
      }
      const { error } = await supabase.rpc(
        "importar_nota_fiscal" as never,
        {
          p_entradas: entradas,
        } as never,
      );
      if (error) throw error;
      toast.success(
        `NF-e ${previa.nota.numero} importada: ${total} item(ns) com entrada no estoque.`,
      );
      await queryClient.invalidateQueries();
      avisarOutrasAbas();
      limpar();
      setAberto(false);
    } catch (falha) {
      toast.error("A nota não foi importada. Nada foi gravado.", {
        description: falha instanceof Error ? falha.message : undefined,
      });
    } finally {
      travado.current = false;
      setGravando(false);
    }
  }

  const casados = previa?.linhas.filter((l) => l.destino).length ?? 0;
  const nomeEmpresa = previa?.empresa?.nome_fantasia ?? previa?.nota.destinatario.nome;
  const nomeFornecedor = previa?.fornecedor?.nome_fantasia?.trim() || previa?.fornecedor?.razao_social?.trim() || previa?.nota.emitente.nome;

  return (
    <>
      <Button
        requiresWrite
        variant="outline"
        onClick={() => {
          limpar();
          setAberto(true);
        }}
      >
        <FileUp />
        Importar NF-e (XML)
      </Button>
      <Dialog
        open={aberto}
        onOpenChange={(abrir) => {
          if (!gravando) setAberto(abrir);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Importar NF-e (XML)</DialogTitle>
            <DialogDescription>
              Cada item é casado pelo código de fábrica (fornecedor e código do fornecedor) e dá
              entrada no módulo do produto. Itens sem casamento ficam pendentes e não são gravados.
            </DialogDescription>
          </DialogHeader>

          <Input
            ref={arquivo}
            type="file"
            accept=".xml,text/xml,application/xml"
            aria-label="Arquivo XML da NF-e"
            onChange={lerArquivo}
            disabled={gravando}
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
                <p className="break-all sm:col-span-2">
                  <span className="text-muted-foreground">Chave:</span> {previa.nota.chave}
                </p>
              </div>

              {previa.bloqueio && (
                <p className="text-sm font-medium text-destructive">{previa.bloqueio}</p>
              )}
              {previa.avisos.map((aviso) => (
                <p key={aviso} className="text-sm text-amber-700 dark:text-amber-400">
                  {aviso}
                </p>
              ))}

              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Código do fornecedor</TableHead>
                      <TableHead>Descrição na nota</TableHead>
                      <TableHead>Qtd.</TableHead>
                      <TableHead className="text-right">Valor unit.</TableHead>
                      <TableHead>Destino</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previa.linhas.map(({ item, destino, pendencia }) => (
                      <TableRow key={item.numero}>
                        <TableCell>{item.numero}</TableCell>
                        <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                        <TableCell>{item.descricao}</TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          {item.quantidade.toLocaleString("pt-BR")} {item.unidade}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatarMoeda(item.valorUnitario)}
                        </TableCell>
                        <TableCell>
                          {destino ? (
                            <span className="flex flex-wrap items-center gap-1">
                              <Badge variant="secondary">{ROTULO_MODULO[destino.modulo]}</Badge>
                              <span className="font-mono text-xs">{destino.codigo}</span>
                              <span>{destino.nome}</span>
                            </span>
                          ) : (
                            <span className="flex flex-wrap items-center gap-1">
                              <Badge variant="outline">Pendente</Badge>
                              <span className="text-muted-foreground">{pendencia}</span>
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-sm text-muted-foreground">
                {casados} de {previa.linhas.length} itens com destino. A data das entradas é a
                emissão da nota ({formatarData(previa.nota.dataEmissao)}).
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)} disabled={gravando}>
              Cancelar
            </Button>
            <Button
              requiresWrite
              onClick={gravar}
              disabled={!previa || !!previa.bloqueio || casados === 0 || gravando}
            >
              Gravar entradas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
