import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { MODULO_LABEL } from "@/lib/gemape";
import { useExcluir, useSalvar } from "@/lib/hooks-gemape";
import { lerNfe, type NotaNfe } from "@/lib/nfe-xml";

type ModuloProduto = "epi" | "uniforme" | "ferramenta";
type CodigoFabrica = {
  id: string;
  empresa_id: string;
  modulo: ModuloProduto;
  codigo_gemape: string;
  codigo_fornecedor: string;
  codigo_item_fornecedor: string;
  ca: string | null;
  descricao_nota: string | null;
  fornecedor_cnpj: string | null;
  fornecedor_nome: string | null;
  nota_numero: string | null;
  nota_chave: string | null;
};
type Produto = { modulo: ModuloProduto; codigo_sku: string; nome: string; ca: string | null; empresa_id: string | null };
// Uma linha da nota na tela de importação: o produto GEMAPE escolhido e o CA.
type LinhaImportacao = { produto: string; ca: string };

const TABELAS: Record<ModuloProduto, "epis" | "uniformes" | "ferramentas"> = {
  epi: "epis", uniforme: "uniformes", ferramenta: "ferramentas",
};
const chave = (v: string) => v.trim().toUpperCase();
const chaveProduto = (p: Pick<Produto, "modulo" | "codigo_sku">) => `${p.modulo}|${p.codigo_sku}`;
const vazioParaNulo = (v: string) => v.trim() || null;
const selectClasse = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

function useCodigos(empresaId: string) {
  return useQuery({
    queryKey: ["codigos_fabrica", empresaId],
    queryFn: async () => {
      let q = supabase.from("codigos_fabrica").select("*");
      if (empresaId !== TODAS) q = q.eq("empresa_id", empresaId);
      const { data, error } = await q.order("codigo_gemape");
      if (error) throw error;
      return (data ?? []) as CodigoFabrica[];
    },
  });
}

// EPIs, uniformes e ferramentas com código, para escolher o produto GEMAPE.
function useProdutos() {
  return useQuery({
    queryKey: ["codigos_fabrica-produtos"],
    staleTime: 60_000,
    queryFn: async () => {
      const listas = await Promise.all((Object.keys(TABELAS) as ModuloProduto[]).map(async (modulo) => {
        const { data, error } = await supabase.from(TABELAS[modulo]).select("codigo_sku,nome,ca,empresa_id").order("nome");
        if (error) throw error;
        return ((data ?? []) as unknown as Omit<Produto, "modulo">[]).map((p) => ({ ...p, modulo }));
      }));
      return listas.flat().filter((p) => p.codigo_sku);
    },
  });
}

export function CodigoFabricaModulo() {
  const { empresas, empresaId } = useEmpresa();
  const queryClient = useQueryClient();
  const { data: codigos = [], isLoading, error } = useCodigos(empresaId);
  const { data: produtos = [] } = useProdutos();
  const salvar = useSalvar("codigos_fabrica", ["codigos_fabrica"]);
  const excluir = useExcluir("codigos_fabrica", ["codigos_fabrica"]);
  const [busca, setBusca] = useState("");
  const empresaPadrao = () => (empresaId !== TODAS ? empresaId : empresas[0]?.id ?? "");

  // Cadastro manual
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<CodigoFabrica | null>(null);
  const [empresaForm, setEmpresaForm] = useState("");
  const [produtoForm, setProdutoForm] = useState("");
  const [caForm, setCaForm] = useState("");

  // Importação do XML
  const [importando, setImportando] = useState(false);
  const [nota, setNota] = useState<NotaNfe | null>(null);
  const [erroNota, setErroNota] = useState("");
  const [empresaNota, setEmpresaNota] = useState("");
  const [fornecedorNota, setFornecedorNota] = useState("");
  const [linhas, setLinhas] = useState<LinhaImportacao[]>([]);

  const produtosDa = (empresa: string) => produtos.filter((p) => p.empresa_id === empresa);
  const achar = (empresa: string, valor: string) => produtosDa(empresa).find((p) => chaveProduto(p) === valor);
  const nomeProduto = (c: Pick<CodigoFabrica, "empresa_id" | "modulo" | "codigo_gemape">) =>
    produtos.find((p) => p.empresa_id === c.empresa_id && p.modulo === c.modulo && chave(p.codigo_sku) === chave(c.codigo_gemape))?.nome;
  const nomeEmpresa = (id: string) => empresas.find((e) => e.id === id)?.nome_fantasia ?? "—";

  const visiveis = useMemo(() => {
    const termos = busca.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return codigos.filter((c) => {
      const texto = [c.codigo_gemape, c.codigo_fornecedor, c.codigo_item_fornecedor, c.ca, c.descricao_nota,
        c.fornecedor_nome, c.fornecedor_cnpj, c.nota_numero, MODULO_LABEL[c.modulo], nomeProduto(c)]
        .filter(Boolean).join(" ").toLowerCase();
      return termos.every((t) => texto.includes(t));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigos, busca, produtos]);

  // Confere duplicidade com os códigos já salvos da empresa (a lista na tela segue o filtro do cabeçalho).
  async function existentesDa(empresa: string) {
    if (empresaId === TODAS || empresa === empresaId) return codigos.filter((c) => c.empresa_id === empresa);
    const { data, error } = await supabase.from("codigos_fabrica").select("*").eq("empresa_id", empresa);
    if (error) throw error;
    return (data ?? []) as CodigoFabrica[];
  }
  const mesmoItem = (a: Pick<CodigoFabrica, "codigo_fornecedor" | "codigo_item_fornecedor">, b: typeof a) =>
    chave(a.codigo_fornecedor) === chave(b.codigo_fornecedor) && chave(a.codigo_item_fornecedor) === chave(b.codigo_item_fornecedor);

  function abrir(codigo: CodigoFabrica | null) {
    const empresa = codigo?.empresa_id ?? empresaPadrao();
    setEditando(codigo);
    setEmpresaForm(empresa);
    const produto = codigo && produtosDa(empresa).find((p) => p.modulo === codigo.modulo && chave(p.codigo_sku) === chave(codigo.codigo_gemape));
    setProdutoForm(produto ? chaveProduto(produto) : "");
    setCaForm(codigo?.ca ?? "");
    setAberto(true);
  }

  function escolherProduto(valor: string) {
    setProdutoForm(valor);
    setCaForm(achar(empresaForm, valor)?.ca ?? "");
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const f = new FormData(evento.currentTarget);
    const texto = (nome: string) => String(f.get(nome) ?? "").trim();
    const produto = achar(empresaForm, produtoForm);
    if (!empresaForm) return void toast.error("Selecione a empresa.");
    if (!produto) return void toast.error("Selecione o produto GEMAPE.");
    const valores = {
      empresa_id: empresaForm,
      modulo: produto.modulo,
      codigo_gemape: produto.codigo_sku,
      codigo_fornecedor: texto("codigo_fornecedor"),
      codigo_item_fornecedor: texto("codigo_item_fornecedor"),
      ca: produto.modulo === "epi" ? vazioParaNulo(caForm) : null,
    };
    try {
      if ((await existentesDa(empresaForm)).some((c) => c.id !== editando?.id && mesmoItem(c, valores))) {
        return void toast.error("Este código do fornecedor já está cadastrado para este item.");
      }
    } catch (e) {
      return void toast.error("Não foi possível verificar o código", { description: (e as Error).message });
    }
    salvar.mutate(editando ? { id: editando.id, valores } : { valores }, { onSuccess: () => setAberto(false) });
  }

  function abrirImportacao() {
    setNota(null); setErroNota(""); setLinhas([]); setFornecedorNota("");
    setEmpresaNota(empresaPadrao());
    setImportando(true);
  }

  async function lerArquivo(arquivo: File | undefined) {
    setNota(null); setErroNota(""); setLinhas([]);
    if (!arquivo) return;
    if (arquivo.size > 5 * 1024 * 1024) return void setErroNota("O arquivo passa de 5 MB e não parece ser uma NF-e.");
    try {
      const lida = lerNfe(await arquivo.text());
      setNota(lida);
      setLinhas(lida.itens.map((i) => ({ produto: "", ca: i.ca })));
    } catch (e) {
      setErroNota((e as Error).message);
    }
  }

  function trocarEmpresaNota(empresa: string) {
    setEmpresaNota(empresa);
    setLinhas((atuais) => atuais.map((l, i) => ({ produto: "", ca: nota?.itens[i]?.ca ?? l.ca })));
  }

  function escolherProdutoLinha(indice: number, valor: string) {
    setLinhas((atuais) => atuais.map((l, i) => {
      if (i !== indice) return l;
      // O CA da nota tem prioridade; sem ele, usa o do cadastro do EPI.
      const ca = nota?.itens[i]?.ca || achar(empresaNota, valor)?.ca || "";
      return { produto: valor, ca };
    }));
  }

  const importar = useMutation({
    mutationFn: async (registros: Record<string, unknown>[]) => {
      const { error } = await supabase.from("codigos_fabrica").insert(registros as never);
      if (error) throw error;
    },
    onSuccess: (_d, registros) => {
      void queryClient.invalidateQueries({ queryKey: ["codigos_fabrica"] });
      toast.success(`${registros.length} código(s) importado(s)`);
      setImportando(false);
    },
    onError: (e: Error) => toast.error("Não foi possível importar", { description: e.message }),
  });

  async function confirmarImportacao() {
    if (!nota) return;
    if (!empresaNota) return void toast.error("Selecione a empresa.");
    if (!fornecedorNota.trim()) return void toast.error("Informe o código do fornecedor.");
    const registros = nota.itens.flatMap((item, i) => {
      const produto = achar(empresaNota, linhas[i]?.produto ?? "");
      if (!produto) return [];
      return [{
        empresa_id: empresaNota,
        modulo: produto.modulo,
        codigo_gemape: produto.codigo_sku,
        codigo_fornecedor: fornecedorNota.trim(),
        codigo_item_fornecedor: item.codigo,
        ca: produto.modulo === "epi" ? vazioParaNulo(linhas[i]?.ca ?? "") : null,
        descricao_nota: item.descricao.slice(0, 200) || null,
        fornecedor_cnpj: /^\d{11}(\d{3})?$/.test(nota.emitente.cnpj) ? nota.emitente.cnpj : null,
        fornecedor_nome: nota.emitente.nome.slice(0, 120) || null,
        nota_numero: nota.numero.slice(0, 20) || null,
        nota_chave: /^\d{44}$/.test(nota.chave) ? nota.chave : null,
      }];
    });
    if (registros.length === 0) return void toast.error("Escolha o produto GEMAPE de pelo menos um item.");
    try {
      const existentes = await existentesDa(empresaNota);
      const repetidos = registros.filter((r, i) =>
        existentes.some((c) => mesmoItem(c, r)) || registros.findIndex((o) => mesmoItem(o, r)) !== i);
      if (repetidos.length) {
        return void toast.error("Código já cadastrado para este fornecedor", {
          description: repetidos.map((r) => r.codigo_item_fornecedor).join(", "),
        });
      }
    } catch (e) {
      return void toast.error("Não foi possível verificar os códigos", { description: (e as Error).message });
    }
    importar.mutate(registros);
  }

  const produtoSelecionado = achar(empresaForm, produtoForm);
  const escolhidos = linhas.filter((l) => l.produto).length;
  const opcoesProduto = (empresa: string) => (["epi", "uniforme", "ferramenta"] as const).map((m) => {
    const lista = produtosDa(empresa).filter((p) => p.modulo === m);
    return lista.length ? <optgroup key={m} label={MODULO_LABEL[m]}>
      {lista.map((p) => <option key={chaveProduto(p)} value={chaveProduto(p)}>{p.codigo_sku} · {p.nome}</option>)}
    </optgroup> : null;
  });

  return <div className="space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-eyebrow">Cadastros</p>
        <h1 className="text-2xl font-bold">Código de Fábrica</h1>
        <p className="mt-1 text-sm text-muted-foreground">Relação entre o código GEMAPE e os códigos do fornecedor, vinda da nota fiscal ou cadastrada à mão.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button requiresWrite variant="outline" onClick={abrirImportacao}>Importar XML da NF-e</Button>
        <Button requiresWrite onClick={() => abrir(null)}>Novo código</Button>
      </div>
    </header>

    <Input className="max-w-sm" placeholder="Buscar por palavra-chave" aria-label="Buscar por palavra-chave" value={busca} onChange={(e) => setBusca(e.target.value)} />

    <div className="panel overflow-x-auto">
      <Table>
        <TableHeader><TableRow>
          <TableHead>Código GEMAPE</TableHead><TableHead>Produto</TableHead>
          <TableHead>Código do fornecedor</TableHead><TableHead>Código no fornecedor</TableHead>
          <TableHead>CA</TableHead><TableHead>Nota fiscal</TableHead><TableHead>Empresa</TableHead><TableHead />
        </TableRow></TableHeader>
        <TableBody>
          {error ? <TableRow><TableCell colSpan={8} className="text-center text-destructive">Não foi possível carregar: {(error as Error).message}</TableCell></TableRow>
            : isLoading ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Carregando…</TableCell></TableRow>
            : visiveis.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">{busca ? "Nenhum código encontrado." : "Nenhum código cadastrado."}</TableCell></TableRow>
            : visiveis.map((c) => <TableRow key={c.id}>
              <TableCell className="font-mono text-xs">{c.codigo_gemape}</TableCell>
              <TableCell>
                <div>{nomeProduto(c) ?? <span className="text-muted-foreground">—</span>}</div>
                <div className="text-xs text-muted-foreground">{MODULO_LABEL[c.modulo]}</div>
              </TableCell>
              <TableCell className="font-mono text-xs">{c.codigo_fornecedor}</TableCell>
              <TableCell className="font-mono text-xs">{c.codigo_item_fornecedor}</TableCell>
              <TableCell>{c.ca ?? <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell className="text-xs">
                {c.nota_numero ? <>NF {c.nota_numero}<div className="text-muted-foreground">{c.fornecedor_nome}</div></> : <span className="text-muted-foreground">Manual</span>}
              </TableCell>
              <TableCell>{nomeEmpresa(c.empresa_id)}</TableCell>
              <TableCell className="whitespace-nowrap text-right">
                <Button requiresWrite variant="ghost" size="sm" onClick={() => abrir(c)}>Editar</Button>
                <Button requiresWrite variant="ghost" size="sm" disabled={excluir.isPending}
                  onClick={() => { if (confirm(`Excluir o código ${c.codigo_item_fornecedor} de ${c.codigo_gemape}?`)) excluir.mutate(c.id); }}>Excluir</Button>
              </TableCell>
            </TableRow>)}
        </TableBody>
      </Table>
    </div>

    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar código de fábrica" : "Novo código de fábrica"}</DialogTitle>
          <DialogDescription>Escolha o produto GEMAPE e informe os códigos do fornecedor.</DialogDescription>
        </DialogHeader>
        <form key={editando?.id ?? "novo"} onSubmit={(e) => void enviar(e)} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cf_empresa">Empresa</Label>
            <select id="cf_empresa" required value={empresaForm} className={selectClasse}
              onChange={(e) => { setEmpresaForm(e.target.value); setProdutoForm(""); setCaForm(""); }}>
              <option value="" disabled>Selecione</option>
              {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome_fantasia}</option>)}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cf_produto">Produto (código GEMAPE)</Label>
            <select id="cf_produto" required value={produtoForm} onChange={(e) => escolherProduto(e.target.value)} className={selectClasse}>
              <option value="" disabled>Selecione</option>
              {opcoesProduto(empresaForm)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="codigo_fornecedor">Código do fornecedor</Label>
            <Input id="codigo_fornecedor" name="codigo_fornecedor" required maxLength={60} autoComplete="off" defaultValue={editando?.codigo_fornecedor ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="codigo_item_fornecedor">Código do item no fornecedor</Label>
            <Input id="codigo_item_fornecedor" name="codigo_item_fornecedor" required maxLength={60} autoComplete="off" defaultValue={editando?.codigo_item_fornecedor ?? ""} />
          </div>
          {produtoSelecionado?.modulo === "epi" && <div className="space-y-1.5">
            <Label htmlFor="cf_ca">CA</Label>
            <Input id="cf_ca" maxLength={20} autoComplete="off" value={caForm} onChange={(e) => setCaForm(e.target.value)} />
          </div>}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button requiresWrite type="submit" disabled={salvar.isPending}>Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog open={importando} onOpenChange={setImportando}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Importar XML da NF-e</DialogTitle>
          <DialogDescription>O arquivo é lido no navegador e não fica guardado. Escolha o produto GEMAPE de cada item; itens sem produto não são importados.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor="cf_xml">Arquivo XML da nota</Label>
            <Input id="cf_xml" type="file" accept=".xml,text/xml,application/xml" onChange={(e) => void lerArquivo(e.target.files?.[0])} />
            {erroNota && <p role="alert" className="text-sm text-destructive">{erroNota}</p>}
          </div>
          {nota && <>
            <div className="rounded-md border p-3 text-sm sm:col-span-3">
              <div className="font-semibold">{nota.emitente.nome || "Emitente sem nome"}</div>
              <div className="text-muted-foreground">
                CNPJ {nota.emitente.cnpj || "—"} · NF {nota.numero || "—"}{nota.serie ? ` série ${nota.serie}` : ""}{nota.emissao ? ` · ${nota.emissao.split("-").reverse().join("/")}` : ""} · {nota.itens.length} item(ns)
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cf_empresa_nota">Empresa</Label>
              <select id="cf_empresa_nota" value={empresaNota} onChange={(e) => trocarEmpresaNota(e.target.value)} className={selectClasse}>
                <option value="" disabled>Selecione</option>
                {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome_fantasia}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cf_fornecedor_nota">Código do fornecedor</Label>
              <Input id="cf_fornecedor_nota" maxLength={60} autoComplete="off" value={fornecedorNota} onChange={(e) => setFornecedorNota(e.target.value)} />
            </div>
            <div className="overflow-x-auto sm:col-span-3">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Código no fornecedor</TableHead><TableHead>Descrição na nota</TableHead>
                  <TableHead className="min-w-56">Produto GEMAPE</TableHead><TableHead className="w-28">CA</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {nota.itens.map((item, i) => {
                    const linha = linhas[i] ?? { produto: "", ca: "" };
                    const produto = achar(empresaNota, linha.produto);
                    return <TableRow key={`${item.numero}-${item.codigo}`}>
                      <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                      <TableCell className="text-xs">{item.descricao}</TableCell>
                      <TableCell>
                        <select aria-label={`Produto GEMAPE do item ${item.codigo}`} value={linha.produto}
                          onChange={(e) => escolherProdutoLinha(i, e.target.value)} className={selectClasse}>
                          <option value="">Não importar</option>
                          {opcoesProduto(empresaNota)}
                        </select>
                      </TableCell>
                      <TableCell>
                        {produto?.modulo === "epi"
                          ? <Input aria-label={`CA do item ${item.codigo}`} maxLength={20} value={linha.ca}
                              onChange={(e) => setLinhas((atuais) => atuais.map((l, j) => (j === i ? { ...l, ca: e.target.value } : l)))} />
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>;
                  })}
                </TableBody>
              </Table>
            </div>
          </>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setImportando(false)}>Cancelar</Button>
          <Button requiresWrite onClick={() => void confirmarImportacao()} disabled={!nota || importar.isPending}>
            Importar {escolhidos ? `${escolhidos} código(s)` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
