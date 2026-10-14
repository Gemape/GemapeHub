import { capitalizarTexto } from "@/lib/formatacao-cadastral";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
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
  montarNovoEpi,
  type EpiCatalogo,
} from "@/lib/epi-catalogo";
import {
  nomeTamanho,
  tamanhosAssociadosParaCadastro,
  unidadesAutorizadasDoProduto,
} from "@/lib/estoque-tamanho";
import { MODO_DEMO } from "@/lib/modo-demo";
import { avisoExclusaoDoProduto } from "@/lib/codigo-fabrica-vinculos";
import { estaAtivo, lerParametros, paraSelecao, proximoCodigo, regraDoCadastro, regrasDaCategoria, removerCodigosFabricaPorIds, siglaDoCodigo, type CodigoFabrica } from "@/lib/parametros-base";
import { SiglaCodigo } from "@/components/modules/SiglaCodigo";
import { subcategoriasParaSelecao } from "@/lib/subcategoria-referencia";
import { DialogAssociarTamanhos } from "@/components/parametros/DialogAssociarTamanhos";
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
  // Sigla escolhida para o código novo (só importa quando a categoria tem mais de uma regra em Gerais).
  const [siglaSel, setSiglaSel] = useState("");
  const [clonando, setClonando] = useState<EpiCatalogo | null>(null);
  const [editando, setEditando] = useState<EpiCatalogo | null>(null);
  const [subSel, setSubSel] = useState("");
  const [tamanhoSel, setTamanhoSel] = useState("");
  const [tamanhoNovoAberto, setTamanhoNovoAberto] = useState(false);
  const [associarAberto, setAssociarAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  // O ref bloqueia o clique repetido na hora; o estado só desabilita o botão.
  const trava = useRef(false);

  const { data: catalogo = [], isLoading } = useQuery({
    queryKey: ["epis-catalogo"],
    queryFn: () => lerTudo<EpiCatalogo>("epis_catalogo"),
  });
  const rotuloTamanho = (id: string | null) => (id ? nomeTamanho(parametros, id) : "");
  const grupos = filtrarGrupos(agruparEpis(catalogo), busca, rotuloTamanho);

  const regra = regraDoCadastro(parametros.regrasCodigo, CATEGORIA_EPI, siglaSel);
  const subcategorias = subcategoriasParaSelecao(parametros, CATEGORIA_EPI, null);
  const subEscolhida = subcategorias.find((s) => s.id === subSel);
  const produtoForm = { categoria: subEscolhida?.nome ?? "", subcategoria_id: subEscolhida?.id ?? null };
  const unidades = subEscolhida
    ? paraSelecao(parametros, unidadesAutorizadasDoProduto(parametros, "epi", produtoForm))
    : [];
  const associados = subEscolhida ? tamanhosAssociadosParaCadastro(parametros, "epi", produtoForm) : [];
  const pedeUnidade = unidades.some((u) => estaAtivo(parametros, u.id));
  // Se a associação feita na janela tirou o tamanho já escolhido, o campo volta vazio (nunca grava tamanho não autorizado).
  useEffect(() => {
    if (novoAberto && tamanhoSel && !associados.some((t) => t.id === tamanhoSel)) {
      setTamanhoSel("");
      toast.info("O tamanho escolhido deixou de ser autorizado para esta subcategoria. Escolha outro.");
    }
  }, [novoAberto, tamanhoSel, associados]);

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
    setSubSel(item.subcategoria_id ?? subcategorias.find((s) => s.nome === item.categoria)?.id ?? "");
    setTamanhoSel("");
    setClonando(item);
    setSiglaSel(siglaDoCodigo(parametros.regrasCodigo, CATEGORIA_EPI, item.codigo_sku));
    setNovoAberto(true);
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
    setClonando(null);
    setSiglaSel("");
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
          nome: capitalizarTexto(String(f.get("nome") ?? "")),
          subcategoria: { id: subEscolhida.id, nome: subEscolhida.nome },
          unidade: unidade ? { id: unidade.id, nome: unidade.nome } : null,
          tamanhoId: tamanhoSel || null,
          minimo: String(f.get("minimo") ?? ""),
          catalogo: atual,
          codigo,
          pedeTamanho: associados.length > 0,
          tamanhosPermitidos: associados.map((t) => t.id),
          clonando: !!clonando,
        }),
      () => {
        setNovoAberto(false);
      },
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
              <TableHead>Descrição</TableHead>
              <TableHead>Tamanho</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead className="text-right">Estoque mínimo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">Carregando…</TableCell>
              </TableRow>
            )}
            {!isLoading && grupos.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
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

      <DialogAssociarTamanhos aberto={associarAberto} onAbrirMudou={setAssociarAberto} de="epi" />

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
            <DialogTitle>{clonando ? "Clonar EPI" : "Novo EPI"}</DialogTitle>
            <DialogDescription>
              {clonando ? "Copia todos os dados do cadastro de origem, que podem ser editados. O código é gerado ao salvar; não herda estoque nem movimentações." : "Cadastra uma descrição ainda não existente. O código é gerado ao salvar; outros tamanhos entram pelo Clonar."}
            </DialogDescription>
          </DialogHeader>
          <form key={clonando?.id ?? "novo"} onSubmit={enviarNovo} className="grid gap-3 sm:grid-cols-2">
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
                <p className="text-xs text-muted-foreground">Nenhuma subcategoria de EPI em Parâmetros &gt; Parâmetros Específicos.</p>
              )}
            </div>
            <SiglaCodigo regras={regrasDaCategoria(parametros.regrasCodigo, CATEGORIA_EPI)} valor={siglaSel} onMudar={setSiglaSel} />
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="nome">Descrição do item</Label>
              <Textarea id="nome" name="nome" capitalizar="texto" rows={2} defaultValue={clonando?.nome ?? ""} placeholder="Ex.: capacete de segurança em ABS de alto impacto" />
            </div>
            {unidades.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="unidade_id">Unidade</Label>
                <Select name="unidade_id" key={subSel} {...(clonando?.unidade_id && unidades.some((u) => u.id === clonando.unidade_id) ? { defaultValue: clonando.unidade_id } : pedeUnidade ? {} : { defaultValue: SEM_UNIDADE })}>
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
                  {" · "}
                  <button
                    type="button"
                    className="font-medium text-primary underline underline-offset-2"
                    onClick={() => setAssociarAberto(true)}
                  >
                    Associar tamanhos
                  </button>
                </p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="minimo">Estoque mínimo</Label>
              <Input id="minimo" name="minimo" type="number" inputMode="numeric" min={0} step={1} defaultValue={clonando?.estoque_minimo ?? ""} />
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
      {grupo.itens.map((item, indice) => (
        <TableRow key={item.id} className={indice === 0 ? "border-t-2 border-border" : undefined}>
          <TableCell className="font-mono text-xs">{item.codigo_sku}</TableCell>
          <TableCell>{grupo.nome}</TableCell>
          <TableCell>{rotuloTamanho(item.tamanho_id) || "Sem tamanho"}</TableCell>
          <TableCell>{item.unidade_medida || "Sem unidade"}</TableCell>
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
