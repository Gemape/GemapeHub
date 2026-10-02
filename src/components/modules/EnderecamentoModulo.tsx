import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { CampoBusca } from "@/components/CampoBusca";
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
import { empresaPadraoParaEscolha, empresasParaEscolha } from "@/lib/empresas";
import { useExcluir, useSalvar, useVeiculos } from "@/lib/hooks-gemape";
import { ROTULO_TABELA, useProdutosGemape } from "@/lib/produtos-gemape";
import {
  montarClonagemEndereco,
  montarLinhasEnderecamento,
  type ProdutoEnderecavel,
} from "@/lib/enderecamento-categoria";
import { useParametrosBase } from "@/lib/use-parametros-base";

type Endereco = {
  id: string;
  empresa_id: string;
  codigo_produto: string;
  rua: string;
  prateleira: string;
  apartamento: string;
};

// Especificação: rua (corredor), número (estante) e apartamento (nível da prateleira, de cima para baixo).
// No banco o número continua na coluna "prateleira".
const CAMPOS = [
  { nome: "rua", rotulo: "Rua (corredor)" },
  { nome: "prateleira", rotulo: "Número (estante)" },
  { nome: "apartamento", rotulo: "Apartamento (nível)" },
] as const;
const chave = (v: string) => v.trim().toUpperCase();
const ROTULOS = { ...ROTULO_TABELA, veiculos: "Veículo" };

function useEnderecos(empresaId: string) {
  return useQuery({
    queryKey: ["enderecamentos", empresaId],
    queryFn: async () => {
      let q = supabase.from("enderecamentos").select("*");
      if (empresaId !== TODAS) q = q.eq("empresa_id", empresaId);
      const { data, error } = await q.order("codigo_produto");
      if (error) throw error;
      return (data ?? []) as Endereco[];
    },
  });
}

export function EnderecamentoModulo() {
  const { empresas, empresaId } = useEmpresa();
  const { data: enderecos = [], isLoading, error } = useEnderecos(empresaId);
  const { data: produtosBase = [] } = useProdutosGemape();
  const { data: veiculos = [] } = useVeiculos(TODAS);
  const parametros = useParametrosBase();
  const produtos: ProdutoEnderecavel[] = useMemo(() => [
    ...produtosBase,
    ...veiculos.map((veiculo) => {
      const atual = veiculo as typeof veiculo & { codigo_sku?: string; descricao?: string };
      return { tabela: "veiculos" as const, codigo_sku: atual.codigo_sku ?? "", nome: atual.descricao || veiculo.modelo, empresa_id: veiculo.empresa_id };
    }),
  ], [produtosBase, veiculos]);
  const salvar = useSalvar("enderecamentos", ["enderecamentos"]);
  const excluir = useExcluir("enderecamentos", ["enderecamentos"]);
  const [busca, setBusca] = useState("");
  const [somenteSem, setSomenteSem] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Endereco | null>(null);
  const [empresaForm, setEmpresaForm] = useState("");
  const [produtoForm, setProdutoForm] = useState("");
  // Clonar: o item de destino é o da linha; a pergunta é o código do item de origem.
  const [clonando, setClonando] = useState<ProdutoEnderecavel | null>(null);
  const [origemClone, setOrigemClone] = useState("");

  const nomeEmpresa = (id: string) => empresas.find((e) => e.id === id)?.nome_fantasia ?? "—";

  const linhas = useMemo(() => montarLinhasEnderecamento(
    produtos, enderecos, parametros, empresaId, busca, somenteSem,
  ), [produtos, enderecos, parametros, empresaId, busca, somenteSem]);

  // Só produtos cadastrados na empresa escolhida. Ao editar, mantém o código salvo mesmo que o produto tenha saído.
  // O endereço guarda só o código: códigos repetidos na mesma empresa viram uma opção só.
  const opcoesProduto: { valor: string; rotulo: string; detalhe: string }[] = [];
  for (const { produto: p } of montarLinhasEnderecamento(produtos, [], parametros, empresaForm, "", false)) {
    const igual = opcoesProduto.find((o) => chave(o.valor) === chave(p.codigo_sku));
    if (igual) {
      igual.rotulo += ` / ${p.nome}`;
      igual.detalhe += ` / ${ROTULOS[p.tabela]}`;
    } else {
      opcoesProduto.push({ valor: p.codigo_sku, rotulo: `${p.codigo_sku} · ${p.nome}`, detalhe: ROTULOS[p.tabela] });
    }
  }
  if (produtoForm && !opcoesProduto.some((o) => o.valor === produtoForm)) {
    opcoesProduto.push({ valor: produtoForm, rotulo: produtoForm, detalhe: "Produto não encontrado no cadastro" });
  }

  function abrir(endereco: Endereco | null, produtoInicial?: ProdutoEnderecavel) {
    setEditando(endereco);
    setEmpresaForm(endereco?.empresa_id ?? produtoInicial?.empresa_id ?? empresaPadraoParaEscolha(empresas, empresaId));
    // Encontra o produto sem diferenciar maiúsculas, como a tabela faz.
    const salvo = endereco?.codigo_produto ?? "";
    const produto = endereco && produtos.find((p) => p.empresa_id === endereco.empresa_id && chave(p.codigo_sku) === chave(salvo));
    setProdutoForm(produtoInicial?.codigo_sku ?? (produto ? produto.codigo_sku : salvo));
    setAberto(true);
  }

  const opcoesOrigem = useMemo(() => {
    if (!clonando) return [];
    const comEndereco = new Set(enderecos.filter((e) => e.empresa_id === clonando.empresa_id).map((e) => chave(e.codigo_produto)));
    return produtos
      .filter((p) => p.empresa_id === clonando.empresa_id && p.tabela === clonando.tabela &&
        chave(p.codigo_sku) !== chave(clonando.codigo_sku) && comEndereco.has(chave(p.codigo_sku)))
      .map((p) => ({ valor: p.codigo_sku, rotulo: `${p.codigo_sku} · ${p.nome}` }));
  }, [clonando, produtos, enderecos]);

  const clonandoAgora = useRef(false);

  function clonar() {
    if (!clonando || salvar.isPending || clonandoAgora.current) return;
    try {
      const valores = montarClonagemEndereco({
        destino: clonando, codigoOrigem: origemClone, produtos, enderecos, dados: parametros,
      });
      clonandoAgora.current = true;
      salvar.mutate({ valores }, {
        onSuccess: () => setClonando(null),
        onSettled: () => { clonandoAgora.current = false; },
      });
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível clonar o endereço.");
    }
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const f = new FormData(evento.currentTarget);
    const texto = (nome: string) => String(f.get(nome) ?? "").trim();
    const valores = {
      empresa_id: empresaForm,
      codigo_produto: produtoForm,
      rua: texto("rua"),
      prateleira: texto("prateleira"),
      apartamento: texto("apartamento"),
    };
    if (!valores.empresa_id) return void toast.error("Selecione a empresa.");
    if (!valores.codigo_produto) return void toast.error("Selecione o produto.");
    // A lista na tela segue o filtro do cabeçalho; se o formulário aponta outra empresa, consulta a dela.
    let existentes = enderecos;
    if (empresaId !== TODAS && valores.empresa_id !== empresaId) {
      const { data, error } = await supabase.from("enderecamentos").select("*").eq("empresa_id", valores.empresa_id);
      if (error) return void toast.error("Não foi possível verificar o endereço", { description: error.message });
      existentes = (data ?? []) as Endereco[];
    }
    const repetido = existentes.some((e) => e.id !== editando?.id && e.empresa_id === valores.empresa_id
      && chave(e.codigo_produto) === chave(valores.codigo_produto) && chave(e.rua) === chave(valores.rua)
      && chave(e.prateleira) === chave(valores.prateleira) && chave(e.apartamento) === chave(valores.apartamento));
    if (repetido) return void toast.error("Este produto já está cadastrado neste endereço.");
    salvar.mutate(editando ? { id: editando.id, valores } : { valores }, { onSuccess: () => setAberto(false) });
  }

  return <div className="space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-eyebrow">Cadastros · Gerais</p>
        <h1 className="text-2xl font-bold">Endereçamento de estoque</h1>
        <p className="mt-1 text-sm text-muted-foreground">Onde cada produto deve ser guardado no almoxarifado depois da entrada da nota fiscal: rua (corredor), número (estante) e apartamento (nível da prateleira, contado de cima para baixo).</p>
      </div>
    </header>

    <div className="flex flex-wrap items-center gap-3">
      <Input className="max-w-sm" placeholder="Buscar por código, produto ou endereço" value={busca} onChange={(e) => setBusca(e.target.value)} />
      <Button variant={somenteSem ? "default" : "outline"} aria-pressed={somenteSem} onClick={() => setSomenteSem(!somenteSem)}>Filtrar itens sem endereçamento</Button>
    </div>

    <div className="panel overflow-x-auto">
      <Table>
        <TableHeader><TableRow>
          <TableHead>Código do produto</TableHead><TableHead>Produto</TableHead>
          <TableHead>Rua</TableHead><TableHead>Número</TableHead><TableHead>Apartamento</TableHead>
          <TableHead>Empresa</TableHead><TableHead />
        </TableRow></TableHeader>
        <TableBody>
          {error ? <TableRow><TableCell colSpan={7} className="text-center text-destructive">Não foi possível carregar: {(error as Error).message}</TableCell></TableRow>
            : isLoading ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Carregando…</TableCell></TableRow>
            : linhas.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhum produto encontrado para os filtros.</TableCell></TableRow>
            : linhas.map(({ produto, endereco: e }) => <TableRow key={e?.id ?? `${produto.tabela}-${produto.empresa_id}-${produto.codigo_sku}`}>
              <TableCell className="font-mono text-xs">{produto.codigo_sku}</TableCell>
              <TableCell>{produto.nome}</TableCell>
              <TableCell>{e?.rua ?? "—"}</TableCell>
              <TableCell>{e?.prateleira ?? "—"}</TableCell>
              <TableCell>{e?.apartamento ?? "—"}</TableCell>
              <TableCell>{nomeEmpresa(produto.empresa_id ?? "")}</TableCell>
              <TableCell className="whitespace-nowrap text-right">
                <Button requiresWrite variant="ghost" size="sm" onClick={() => abrir(e ?? null, produto)}>{e ? "Editar" : "Adicionar endereço"}</Button>
                <Button requiresWrite variant="ghost" size="sm" onClick={() => { setOrigemClone(""); setClonando(produto); }}>Clonar</Button>
                {e && <Button requiresWrite variant="ghost" size="sm" disabled={excluir.isPending}
                  onClick={() => { if (confirm(`Excluir o endereço de ${e.codigo_produto}?`)) excluir.mutate(e.id); }}>Excluir</Button>}
              </TableCell>
            </TableRow>)}
        </TableBody>
      </Table>
    </div>

    <Dialog open={!!clonando} onOpenChange={(aberto) => { if (!aberto) setClonando(null); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Clonar endereço</DialogTitle>
          <DialogDescription>
            Informe o código do item de origem: o primeiro endereço dele (rua, número e apartamento) será copiado, como um endereço a mais, para{" "}
            {clonando ? `${clonando.codigo_sku} · ${clonando.nome}` : "o item"}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="origem_clone">Código do item de origem</Label>
          <CampoBusca
            id="origem_clone"
            rotulo="Código do item de origem"
            opcoes={opcoesOrigem}
            valor={origemClone}
            onChange={setOrigemClone}
            placeholder="Digite o código ou o nome do item"
            vazio="Nenhum item da mesma categoria e empresa, com endereço, com esse termo."
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setClonando(null)}>Cancelar</Button>
          <Button requiresWrite type="button" onClick={clonar} disabled={!origemClone || salvar.isPending}>Clonar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar endereço" : "Adicionar endereço"}</DialogTitle>
          <DialogDescription>Informe o produto e onde ele fica guardado.</DialogDescription>
        </DialogHeader>
        <form key={editando?.id ?? "novo"} onSubmit={(e) => void enviar(e)} className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor="empresa_id">Empresa</Label>
            <select id="empresa_id" required value={empresaForm} onChange={(e) => { setEmpresaForm(e.target.value); setProdutoForm(""); }}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
              <option value="" disabled>Selecione</option>
              {empresasParaEscolha(empresas, [editando?.empresa_id]).map((e) => <option key={e.id} value={e.id}>{e.nome_fantasia}</option>)}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor="codigo_produto">Produto</Label>
            <CampoBusca
              id="codigo_produto"
              opcoes={opcoesProduto}
              valor={produtoForm}
              onChange={setProdutoForm}
              placeholder="Digite código ou nome do produto"
              vazio="Nenhum produto desta empresa com esse termo."
            />
          </div>
          {CAMPOS.map((c) => <div key={c.nome} className="space-y-1.5">
            <Label htmlFor={c.nome}>{c.rotulo}</Label>
            <Input id={c.nome} name={c.nome} required maxLength={30} autoComplete="off" defaultValue={editando?.[c.nome] ?? ""} />
          </div>)}
          <DialogFooter className="sm:col-span-3">
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button requiresWrite type="submit" disabled={salvar.isPending}>Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>;
}
