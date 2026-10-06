import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { EdicaoCatalogoForm } from "@/components/modules/EdicaoCatalogoForm";
import { CadastroProduto } from "@/components/modules/CadastroProduto";
import { AcoesLinha } from "@/components/parametros/AcoesLinha";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  agruparEpis,
  filtrarGrupos,
  montarClonagemEpi,
  montarNovoEpi,
  tamanhosLivres,
  type EpiCatalogo,
} from "@/lib/epi-catalogo";
import {
  nomeTamanho,
  tamanhosAssociadosParaCadastro,
  unidadesAutorizadasDoProduto,
} from "@/lib/estoque-tamanho";
import { useAccess } from "@/lib/access-context";
import { opcoesDaSeparacao, planejarSeparacao } from "@/lib/epi-separar-tamanhos";
import { MODO_DEMO } from "@/lib/modo-demo";
import { avisoExclusaoDoProduto } from "@/lib/codigo-fabrica-vinculos";
import { estaAtivo, lerParametros, paraSelecao, proximoCodigo, removerCodigosFabricaPorIds, type CodigoFabrica } from "@/lib/parametros-base";
import { subcategoriasParaSelecao } from "@/lib/subcategoria-referencia";
import { DialogTamanhoSubcategoria } from "@/components/parametros/DialogTamanhoSubcategoria";
import { useParametrosBase } from "@/lib/use-parametros-base";

const CATEGORIA_EPI = "cat-epi";
const PAGINA = 50;
const SEM_UNIDADE = "sem-unidade";

// Cliente sem tipos: o catálogo só existe no modo demonstração (decisão 35).
type ClienteLivre = { from: (tabela: string) => any };
const cliente = supabase as unknown as ClienteLivre;

// Lê a tabela inteira, de página em página, sem o corte do seletor de cadastro.
async function lerTudo<T>(tabela: string): Promise<T[]> {
  const todos: T[] = [];
  for (let inicio = 0; ; inicio += PAGINA) {
    const { data, error } = await cliente
      .from(tabela)
      .select("*")
      .order("id")
      .range(inicio, inicio + PAGINA - 1);
    if (error) throw error;
    const pagina = (data ?? []) as T[];
    todos.push(...pagina);
    if (pagina.length < PAGINA) return todos;
  }
}

type EpiAntigo = { id: string; codigo_sku: string | null; nome: string; empresa_id: string | null; catalogo_id?: string | null; separado_em?: string | null };
type Linha = Record<string, unknown>;

// Cadastrar EPI (decisão 35): catálogo global, um registro por descrição e tamanho. No banco
// real o catálogo ainda não existe (Fase 2): lá continua o cadastro antigo.
export function CadastroEpi() {
  if (!MODO_DEMO) return <CadastroProduto tabela="epis" />;
  return <CatalogoEpi />;
}

function CatalogoEpi() {
  const parametros = useParametrosBase();
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [novoAberto, setNovoAberto] = useState(false);
  const [clonando, setClonando] = useState<EpiCatalogo | null>(null);
  const [editando, setEditando] = useState<EpiCatalogo | null>(null);
  const [subSel, setSubSel] = useState("");
  const [tamanhoSel, setTamanhoSel] = useState("");
  const [tamanhoNovoAberto, setTamanhoNovoAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  // O ref bloqueia o clique repetido na hora; o estado só desabilita o botão.
  const trava = useRef(false);

  const { data: catalogo = [], isLoading } = useQuery({
    queryKey: ["epis-catalogo"],
    queryFn: () => lerTudo<EpiCatalogo>("epis_catalogo"),
  });
  const { data: estoques = [] } = useQuery({
    queryKey: ["epis-estoques-todos"],
    queryFn: () => lerTudo<EpiAntigo>("epis"),
  });
  const { data: enderecos = [] } = useQuery({
    queryKey: ["enderecamentos-todos"],
    queryFn: () => lerTudo<Linha>("enderecamentos"),
  });
  const { data: empresas = [] } = useQuery({
    queryKey: ["empresas-todas"],
    queryFn: () => lerTudo<Linha>("empresas"),
  });
  const { isAdmin } = useAccess();
  const [separarAberto, setSeparando] = useState(false);
  const [separandoAgora, setSeparandoAgora] = useState(false);
  const travaSeparar = useRef(false);
  // Os já separados ficam só como histórico e saem da lista de pendentes.
  const antigos = estoques.filter((e) => !e.catalogo_id && !e.separado_em);
  const separados = estoques.filter((e) => !e.catalogo_id && e.separado_em);
  const plano = planejarSeparacao(
    { empresas, epis_catalogo: catalogo as unknown as Linha[], epis: estoques as unknown as Linha[], enderecamentos: enderecos },
    opcoesDaSeparacao(parametros),
  );

  async function separar() {
    if (travaSeparar.current) return;
    travaSeparar.current = true;
    setSeparandoAgora(true);
    try {
      const { data, error } = await (supabase as unknown as { rpc: (n: string) => Promise<{ data: { separados: number; criados: number } | null; error: Error | null }> }).rpc("separar_epis_por_tamanho");
      if (error) throw error;
      await queryClient.invalidateQueries();
      toast.success(`${data?.separados ?? 0} EPI(s) separado(s) por tamanho; ${data?.criados ?? 0} cadastro(s) novo(s).`);
      setSeparando(false);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível separar os EPIs.");
    } finally {
      travaSeparar.current = false;
      setSeparandoAgora(false);
    }
  }

  const rotuloTamanho = (id: string | null) => (id ? nomeTamanho(parametros, id) : "");
  const grupos = filtrarGrupos(agruparEpis(catalogo), busca, rotuloTamanho);

  const regra = parametros.regrasCodigo.find((r) => r.categoriaId === CATEGORIA_EPI);
  const subcategorias = subcategoriasParaSelecao(parametros, CATEGORIA_EPI, null);
  const subEscolhida = subcategorias.find((s) => s.id === subSel);
  const produtoForm = { categoria: subEscolhida?.nome ?? "", subcategoria_id: subEscolhida?.id ?? null };
  const unidades = subEscolhida
    ? paraSelecao(parametros, unidadesAutorizadasDoProduto(parametros, "epi", produtoForm))
    : [];
  const associados = subEscolhida ? tamanhosAssociadosParaCadastro(parametros, "epi", produtoForm) : [];
  const pedeUnidade = unidades.some((u) => estaAtivo(parametros, u.id));

  // Tamanhos que o Clonar ainda pode cadastrar para a descrição de origem.
  const origemProduto = clonando
    ? { categoria: clonando.categoria, subcategoria_id: clonando.subcategoria_id }
    : null;
  const associadosOrigem = origemProduto ? tamanhosAssociadosParaCadastro(parametros, "epi", origemProduto) : [];
  const livres = clonando ? tamanhosLivres(catalogo, clonando.nome, associadosOrigem) : [];

  async function codigoNovo(): Promise<string> {
    if (!regra) throw new Error("Cadastre antes a regra do código de EPI em Cadastros > Gerais > Código do Produto.");
    // Lê de novo na hora de gravar, para não repetir um código já usado.
    const [cat, est] = await Promise.all([lerTudo<EpiCatalogo>("epis_catalogo"), lerTudo<EpiAntigo>("epis")]);
    return proximoCodigo(regra, [...cat.map((c) => c.codigo_sku), ...est.map((e) => e.codigo_sku)]);
  }

  async function gravar(montar: (codigo: string, atual: EpiCatalogo[]) => Omit<EpiCatalogo, "id">, depois: () => void) {
    if (trava.current) return;
    trava.current = true;
    setSalvando(true);
    try {
      const codigo = await codigoNovo();
      // Valida de novo contra o catálogo atual, para um segundo clique não duplicar.
      const atual = await lerTudo<EpiCatalogo>("epis_catalogo");
      const registro = montar(codigo, atual);
      const { error } = await cliente.from("epis_catalogo").insert({ id: crypto.randomUUID(), ...registro });
      if (error) throw error;
      await queryClient.invalidateQueries();
      toast.success(`EPI ${registro.codigo_sku} cadastrado`);
      depois();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar o EPI.");
    } finally {
      trava.current = false;
      setSalvando(false);
    }
  }

  function abrirClone(item: EpiCatalogo) {
    setTamanhoSel("");
    setClonando(item);
  }

  // Editar e excluir passam pela operação do catálogo, que confere tudo antes de gravar (decisão 45).
  async function operar(nome: "editar_epi_catalogo" | "excluir_epi_catalogo", id: string, valores: Linha | undefined, sucesso: string, depois?: () => void) {
    if (trava.current) return;
    trava.current = true;
    setSalvando(true);
    try {
      const { error } = await (supabase as unknown as { rpc: (n: string, a: Linha) => Promise<{ error: Error | null }> }).rpc(nome, { p_id: id, ...(valores ? { p_valores: valores } : {}) });
      if (error) throw error;
      await queryClient.invalidateQueries();
      toast.success(sucesso);
      depois?.();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível concluir a operação.");
    } finally {
      trava.current = false;
      setSalvando(false);
    }
  }

  function enviarEdicao(valores: Linha) {
    if (!editando) return;
    void operar(
      "editar_epi_catalogo",
      editando.id,
      valores,
      `EPI ${editando.codigo_sku} atualizado`,
      () => setEditando(null),
    );
  }

  function excluir(item: EpiCatalogo) {
    // Lê as associações na hora, para o aviso não usar dados velhos.
    let vinculos: CodigoFabrica[] = [];
    try {
      vinculos = lerParametros().codigosFabrica.filter(
        (c) => c.tabela === "epis" && c.codigo_produto.trim().toUpperCase() === item.codigo_sku.trim().toUpperCase(),
      );
    } catch {
      return void toast.error("Não foi possível conferir os códigos de fábrica deste EPI.");
    }
    const rotulo = `${item.codigo_sku} ${item.nome}`;
    const aviso = avisoExclusaoDoProduto(rotulo, vinculos);
    if (!confirm(aviso ? `${aviso}\n\nExcluir mesmo assim?` : `Excluir ${rotulo}?`)) return;
    void operar("excluir_epi_catalogo", item.id, undefined, `EPI ${item.codigo_sku} excluído`, () => {
      try {
        removerCodigosFabricaPorIds(vinculos.map((c) => c.id));
      } catch {
        toast.error("O EPI foi excluído, mas os códigos de fábrica dele não puderam ser removidos.");
      }
    });
  }

  function abrirNovo() {
    setSubSel("");
    setTamanhoSel("");
    setNovoAberto(true);
  }

  function enviarNovo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (!subEscolhida) return void toast.error("Selecione a subcategoria.");
    const unidadeId = String(f.get("unidade_id") ?? "");
    const unidade = unidades.find((u) => u.id === unidadeId) ?? null;
    if (pedeUnidade && !unidade) return void toast.error("Selecione a unidade.");
    void gravar(
      (codigo, atual) =>
        montarNovoEpi({
          nome: String(f.get("nome") ?? ""),
          subcategoria: { id: subEscolhida.id, nome: subEscolhida.nome },
          unidade: unidade ? { id: unidade.id, nome: unidade.nome } : null,
          tamanhoId: tamanhoSel || null,
          minimo: String(f.get("minimo") ?? ""),
          catalogo: atual,
          codigo,
          pedeTamanho: associados.length > 0,
          tamanhosPermitidos: associados.map((t) => t.id),
        }),
      () => {
        setNovoAberto(false);
      },
    );
  }

  function enviarClone(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!clonando) return;
    const origem = clonando;
    const f = new FormData(e.currentTarget);
    void gravar(
      (codigo, atual) =>
        montarClonagemEpi({ origem, tamanhoId: tamanhoSel, minimo: String(f.get("minimo") ?? ""), catalogo: atual, codigo,
          tamanhosPermitidos: associadosOrigem.map((t) => t.id) }),
      () => setClonando(null),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Buscar EPI por código, descrição, subcategoria ou tamanho"
          placeholder="Buscar por código, descrição, subcategoria ou tamanho"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="max-w-md"
        />
        <Button requiresWrite onClick={abrirNovo} className="ml-auto">
          Novo EPI
        </Button>
      </div>

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Tamanho</TableHead>
              <TableHead className="text-right">Estoque mínimo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">Carregando…</TableCell>
              </TableRow>
            )}
            {!isLoading && grupos.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  {busca.trim() ? "Nenhum EPI encontrado." : "Nenhum EPI cadastrado. Use Novo EPI."}
                </TableCell>
              </TableRow>
            )}
            {grupos.map((g) => (
              <GrupoLinhas key={g.chave} grupo={g} rotuloTamanho={rotuloTamanho} onClonar={abrirClone} onEditar={setEditando} onExcluir={excluir} />
            ))}
          </TableBody>
        </Table>
      </div>

      {antigos.length > 0 && (
        <section className="panel space-y-2 p-4">
          <h2 className="text-sm font-semibold">EPIs antigos</h2>
          <p className="text-xs text-muted-foreground">
            Cadastrados antes do catálogo por tamanho. Seguem funcionando como estavam.
            {plano.grupos.length > 0 && " Os que têm mais de um tamanho podem ser separados em um cadastro por tamanho."}
          </p>
          {plano.grupos.length > 0 && isAdmin && (
            <Button requiresWrite variant="outline" size="sm" onClick={() => setSeparando(true)}>
              Separar por tamanho
            </Button>
          )}
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {antigos.map((a) => (
              <li key={a.id} className="truncate">
                <span className="font-mono text-xs">{a.codigo_sku}</span> · {a.nome}
              </li>
            ))}
          </ul>
        </section>
      )}

      {separados.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {separados.length} registro(s) antigo(s) já separado(s) por tamanho ficam só como histórico: movimentações, fichas e termos continuam ligados a eles.
        </p>
      )}

      <Dialog open={separarAberto} onOpenChange={setSeparando}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Separar EPIs antigos por tamanho</DialogTitle>
            <DialogDescription>
              Cada tamanho vira um EPI com código próprio. O saldo e o mínimo de cada empresa vão para o tamanho certo; o registro antigo fica zerado, como histórico, e nada do que já foi movimentado é alterado. Tudo é feito de uma vez.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-3 text-sm">
            {plano.grupos.map((g) => (
              <li key={g.chave} className="rounded-md border p-3">
                <p className="font-medium">{g.nome}</p>
                <p className="text-xs text-muted-foreground">
                  Antigos: {g.antigos.map((a) => a.codigo_sku).filter((c, i, l) => l.indexOf(c) === i).join(", ")}
                </p>
                <p className="mt-1 text-xs">
                  {g.tamanhos
                    .map((t) => `${nomeTamanho(parametros, t.tamanhoId)} → ${t.codigo}${t.jaExiste ? " (já cadastrado)" : ""}`)
                    .join(" · ")}
                </p>
                {g.enderecosACopiar > 0 && (
                  <p className="text-xs text-muted-foreground">{g.enderecosACopiar} endereço(s) copiado(s) para os novos códigos.</p>
                )}
                {g.associacoesNfe > 0 && (
                  <p className="text-xs text-amber-700">
                    {g.associacoesNfe} associação(ões) de código de fábrica seguem no código antigo; reassocie em Cadastros &gt; Gerais &gt; Código de fábrica.
                  </p>
                )}
              </li>
            ))}
          </ul>
          {plano.semRegra && (
            <p className="text-sm text-destructive">Cadastre antes a regra do código de EPI em Cadastros &gt; Gerais &gt; Código do Produto.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSeparando(false)}>Cancelar</Button>
            <Button requiresWrite disabled={separandoAgora || plano.semRegra} onClick={() => void separar()}>
              {separandoAgora ? "Separando..." : "Separar agora"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {subEscolhida && (
        <DialogTamanhoSubcategoria
          aberto={tamanhoNovoAberto}
          onAbrirMudou={setTamanhoNovoAberto}
          subcategoriaId={subEscolhida.id}
          subcategoriaNome={subEscolhida.nome}
          onCriado={setTamanhoSel}
        />
      )}

      <Dialog open={novoAberto} onOpenChange={setNovoAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Novo EPI</DialogTitle>
            <DialogDescription>
              Cadastra uma descrição ainda não existente. O código é gerado ao salvar; outros tamanhos entram pelo Clonar.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={enviarNovo} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="categoria">Subcategoria</Label>
              <Select value={subSel} onValueChange={(v) => { setSubSel(v); setTamanhoSel(""); }}>
                <SelectTrigger id="categoria"><SelectValue placeholder="Selecione a subcategoria" /></SelectTrigger>
                <SelectContent>
                  {subcategorias.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {subcategorias.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma subcategoria de EPI em Cadastros &gt; Gerais &gt; Tabelas de Apoio.</p>
              )}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="nome">Descrição do item</Label>
              <Textarea id="nome" name="nome" rows={2} placeholder="Ex.: capacete de segurança em ABS de alto impacto" />
            </div>
            {unidades.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="unidade_id">Unidade</Label>
                <Select name="unidade_id" key={subSel} {...(pedeUnidade ? {} : { defaultValue: SEM_UNIDADE })}>
                  <SelectTrigger id="unidade_id"><SelectValue placeholder="Selecione a unidade" /></SelectTrigger>
                  <SelectContent>
                    {!pedeUnidade && <SelectItem value={SEM_UNIDADE}>Sem unidade</SelectItem>}
                    {unidades.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {subEscolhida && (
              <div className="space-y-1.5">
                <Label htmlFor="tamanho">Tamanho</Label>
                {associados.length > 0 && (
                  <Select key={associados.length} value={tamanhoSel} onValueChange={setTamanhoSel}>
                    <SelectTrigger id="tamanho"><SelectValue placeholder="Selecione o tamanho" /></SelectTrigger>
                    <SelectContent>
                      {associados.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.rotulo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-muted-foreground">
                  {associados.length > 0 ? "Não achou o tamanho?" : "Nenhum tamanho autorizado para esta subcategoria."}{" "}
                  <button
                    type="button"
                    className="font-medium text-primary underline underline-offset-2"
                    onClick={() => setTamanhoNovoAberto(true)}
                  >
                    Cadastrar tamanho
                  </button>
                </p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="minimo">Estoque mínimo</Label>
              <Input id="minimo" name="minimo" type="number" inputMode="numeric" min={0} step={1} />
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setNovoAberto(false)}>Cancelar</Button>
              <Button requiresWrite type="submit" disabled={salvando}>Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editando !== null} onOpenChange={(aberto) => !aberto && setEditando(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar EPI {editando?.codigo_sku}</DialogTitle>
            <DialogDescription>
              Altere os dados do cadastro. O código não muda.
            </DialogDescription>
          </DialogHeader>
          {editando && (
            <EdicaoCatalogoForm
              key={editando.id}
              item={editando}
              modulo="epi"
              categoriaId={CATEGORIA_EPI}
              nomeProduto="EPI"
              salvando={salvando}
              onSalvar={enviarEdicao}
              onCancelar={() => setEditando(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!clonando} onOpenChange={(aberto) => !aberto && setClonando(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clonar EPI</DialogTitle>
            <DialogDescription>
              Copia a descrição e a unidade, gera outro código e cadastra o EPI em um tamanho ainda não cadastrado. Não herda estoque nem movimentações.
            </DialogDescription>
          </DialogHeader>
          {clonando && (
            <form onSubmit={enviarClone} className="grid gap-3">
              <div className="rounded-md bg-muted/50 p-2 text-sm">
                <p className="font-medium">{clonando.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {clonando.categoria}
                  {clonando.unidade_medida ? ` · ${clonando.unidade_medida}` : ""}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tamanho_clone">Tamanho</Label>
                <Select value={tamanhoSel} onValueChange={setTamanhoSel} disabled={livres.length === 0}>
                  <SelectTrigger id="tamanho_clone"><SelectValue placeholder="Selecione o tamanho" /></SelectTrigger>
                  <SelectContent>
                    {livres.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.rotulo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {livres.length === 0 && (
                  <p className="text-xs text-muted-foreground">Todos os tamanhos associados a esta subcategoria já estão cadastrados.</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="minimo_clone">Estoque mínimo</Label>
                <Input id="minimo_clone" name="minimo" type="number" inputMode="numeric" min={0} step={1} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setClonando(null)}>Cancelar</Button>
                <Button requiresWrite type="submit" disabled={salvando || livres.length === 0}>Clonar</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GrupoLinhas({
  grupo,
  rotuloTamanho,
  onClonar,
  onEditar,
  onExcluir,
}: {
  grupo: ReturnType<typeof agruparEpis>[number];
  rotuloTamanho: (id: string | null) => string;
  onClonar: (item: EpiCatalogo) => void;
  onEditar: (item: EpiCatalogo) => void;
  onExcluir: (item: EpiCatalogo) => void;
}) {
  return (
    <>
      <TableRow className="bg-muted/40">
        <TableCell colSpan={4} className="font-medium">
          {grupo.nome}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {grupo.categoria}
            {grupo.unidade_medida ? ` · ${grupo.unidade_medida}` : ""}
          </span>
        </TableCell>
      </TableRow>
      {grupo.itens.map((item) => (
        <TableRow key={item.id}>
          <TableCell className="font-mono text-xs">{item.codigo_sku}</TableCell>
          <TableCell>{rotuloTamanho(item.tamanho_id) || "Sem tamanho"}</TableCell>
          <TableCell className="text-right">{item.estoque_minimo}</TableCell>
          <TableCell className="text-right">
            <AcoesLinha
              rotulo={item.codigo_sku}
              onClonar={() => onClonar(item)}
              onEditar={() => onEditar(item)}
              onExcluir={() => onExcluir(item)}
            />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
