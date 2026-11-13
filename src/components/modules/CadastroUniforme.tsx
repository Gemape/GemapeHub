import { LinhasEsqueleto } from "@/components/Esqueletos";
import { BarraDeFiltros } from "@/components/layout/BarraDeFiltros";
import { exportarCsv } from "@/lib/gemape";
import { capitalizarTexto } from "@/lib/formatacao-cadastral";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { EstadoVazio } from "@/components/EstadoVazio";
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
import { ehExemplo } from "@/lib/dados-teste/exemplo-id";
import { exemploCatalogo } from "@/lib/dados-teste/exemplos";
import { avisoExclusaoDoProduto } from "@/lib/codigo-fabrica-vinculos";
import { estaAtivo, lerParametros, paraSelecao, proximoCodigo, regraDoCadastro, regrasDaCategoria, removerCodigosFabricaPorIds, siglaDoCodigo, type CodigoFabrica } from "@/lib/parametros-base";
import { SiglaCodigo } from "@/components/modules/SiglaCodigo";
import { subcategoriasParaSelecao } from "@/lib/subcategoria-referencia";
import { DialogAssociarTamanhos } from "@/components/parametros/DialogAssociarTamanhos";
import { DialogTamanhoSubcategoria } from "@/components/parametros/DialogTamanhoSubcategoria";
import { useParametrosBase } from "@/lib/use-parametros-base";
import type { ClienteLivre } from "@/lib/cliente-livre";

const CATEGORIA_UNIFORME = "cat-uniformes";
const PAGINA = 50;
const SEM_UNIDADE = "sem-unidade";

// Cliente sem tipos: o catálogo só existe no modo demonstração (decisão 35).
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

// Cadastrar Uniforme (decisão 48), no mesmo desenho do Cadastrar EPI (decisão 35): catálogo global, um registro por descrição e tamanho. No banco
// real o catálogo ainda não existe (Fase 2): lá continua o cadastro antigo.
export function CadastroUniforme() {
  if (!MODO_DEMO) return <CadastroProduto tabela="uniformes" />;
  return <CatalogoUniforme />;
}

function CatalogoUniforme() {
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
    queryKey: ["uniformes-catalogo"],
    queryFn: () => lerTudo<EpiCatalogo>("uniformes_catalogo"),
  });
  const { data: estoques = [] } = useQuery({
    queryKey: ["uniformes-estoques-todos"],
    queryFn: () => lerTudo<EpiAntigo>("uniformes"),
  });
  const { data: enderecos = [] } = useQuery({
    queryKey: ["enderecamentos-todos"],
    queryFn: () => lerTudo<Linha>("enderecamentos"),
  });
  const { data: empresas = [] } = useQuery({
    queryKey: ["empresas-todas"],
    queryFn: () => lerTudo<Linha>("empresas"),
  });
  // Os cadastrados antes do catálogo seguem funcionando como estavam (separar por tamanho é o PR seguinte).
  const antigos = estoques.filter((e) => !e.catalogo_id);

  const rotuloTamanho = (id: string | null) => (id ? nomeTamanho(parametros, id) : "");
  const grupos = filtrarGrupos(agruparEpis(catalogo), busca, rotuloTamanho);

  const regra = regraDoCadastro(parametros.regrasCodigo, CATEGORIA_UNIFORME, siglaSel);
  const subcategorias = subcategoriasParaSelecao(parametros, CATEGORIA_UNIFORME, null);
  const subEscolhida = subcategorias.find((s) => s.id === subSel);
  const produtoForm = { categoria: subEscolhida?.nome ?? "", subcategoria_id: subEscolhida?.id ?? null };
  const unidades = subEscolhida
    ? paraSelecao(parametros, unidadesAutorizadasDoProduto(parametros, "uniforme", produtoForm))
    : [];
  const associados = subEscolhida ? tamanhosAssociadosParaCadastro(parametros, "uniforme", produtoForm) : [];
  // Se a associação feita na janela tirou o tamanho já escolhido, o campo volta vazio (nunca grava tamanho não autorizado).
  useEffect(() => {
    if (novoAberto && tamanhoSel && !associados.some((t) => t.id === tamanhoSel)) {
      setTamanhoSel("");
      toast.info("O tamanho escolhido deixou de ser autorizado para esta subcategoria. Escolha outro.");
    }
  }, [novoAberto, tamanhoSel, associados]);
  const pedeUnidade = unidades.some((u) => estaAtivo(parametros, u.id));

  async function codigoNovo(): Promise<string> {
    if (!regra) throw new Error("Cadastre antes a regra do código de Uniforme em Cadastros > Gerais > Código do Produto.");
    // Lê de novo na hora de gravar, para não repetir um código já usado.
    const [cat, est] = await Promise.all([lerTudo<EpiCatalogo>("uniformes_catalogo"), lerTudo<EpiAntigo>("uniformes")]);
    return proximoCodigo(regra, [...cat.map((c) => c.codigo_sku), ...est.map((e) => e.codigo_sku)]);
  }

  async function gravar(montar: (codigo: string, atual: EpiCatalogo[]) => Omit<EpiCatalogo, "id">, depois: () => void) {
    if (trava.current) return;
    trava.current = true;
    setSalvando(true);
    try {
      const codigo = await codigoNovo();
      // Valida de novo contra o catálogo atual, para um segundo clique não duplicar.
      const atual = await lerTudo<EpiCatalogo>("uniformes_catalogo");
      const registro = montar(codigo, atual);
      const { error } = await cliente.from("uniformes_catalogo").insert({ id: crypto.randomUUID(), ...registro });
      if (error) throw error;
      await queryClient.invalidateQueries();
      toast.success(`Uniforme ${registro.codigo_sku} cadastrado`);
      depois();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar o uniforme.");
    } finally {
      trava.current = false;
      setSalvando(false);
    }
  }

  function abrirClone(item: EpiCatalogo) {
    setSubSel(item.subcategoria_id ?? subcategorias.find((s) => s.nome === item.categoria)?.id ?? "");
    setTamanhoSel("");
    setClonando(item);
    setSiglaSel(siglaDoCodigo(parametros.regrasCodigo, CATEGORIA_UNIFORME, item.codigo_sku));
    setNovoAberto(true);
  }

  // Editar e excluir passam pela operação do catálogo, que confere tudo antes de gravar (decisão 45).
  async function operar(nome: "editar_uniforme_catalogo" | "excluir_uniforme_catalogo", id: string, valores: Linha | undefined, sucesso: string, depois?: () => void) {
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
      "editar_uniforme_catalogo",
      editando.id,
      valores,
      `Uniforme ${editando.codigo_sku} atualizado`,
      () => setEditando(null),
    );
  }

  function excluir(item: EpiCatalogo) {
    // Lê as associações na hora, para o aviso não usar dados velhos.
    let vinculos: CodigoFabrica[] = [];
    try {
      vinculos = lerParametros().codigosFabrica.filter(
        (c) => c.tabela === "uniformes" && c.codigo_produto.trim().toUpperCase() === item.codigo_sku.trim().toUpperCase(),
      );
    } catch {
      return void toast.error("Não foi possível conferir os códigos de fábrica deste uniforme.");
    }
    const rotulo = `${item.codigo_sku} ${item.nome}`;
    const aviso = avisoExclusaoDoProduto(rotulo, vinculos);
    if (!confirm(aviso ? `${aviso}\n\nExcluir mesmo assim?` : `Excluir ${rotulo}?`)) return;
    void operar("excluir_uniforme_catalogo", item.id, undefined, `Uniforme ${item.codigo_sku} excluído`, () => {
      try {
        removerCodigosFabricaPorIds(vinculos.map((c) => c.id));
      } catch {
        toast.error("O uniforme foi excluído, mas os códigos de fábrica dele não puderam ser removidos.");
      }
    });
  }

  function abrirNovo() {
    // Demonstração (2.8): abre já preenchido com um item fictício, que só é gravado se a pessoa salvar.
    const exemplo = import.meta.env.VITE_DEMO_MODE !== "false" ? exemploCatalogo("uniforme", parametros, subcategorias, catalogo) : null;
    if (exemplo) {
      abrirClone(exemplo);
      setTamanhoSel(exemplo.tamanho_id ?? "");
      return;
    }
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
          clonando: !!clonando && !ehExemplo(clonando),
          nomeProduto: "uniforme",
        }),
      () => {
        setNovoAberto(false);
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <BarraDeFiltros>
          <Input
            aria-label="Buscar uniforme por código, descrição, subcategoria ou tamanho"
            placeholder="Buscar por código, descrição, subcategoria ou tamanho"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="max-w-md"
          />
        </BarraDeFiltros>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            disabled={grupos.length === 0}
            onClick={() =>
              exportarCsv(
                "uniformes",
                grupos.flatMap((g) =>
                  g.itens.map((item) => ({
                    Uniforme: g.nome,
                    Categoria: g.categoria,
                    Unidade: g.unidade_medida ?? "",
                    Código: item.codigo_sku,
                    Tamanho: rotuloTamanho(item.tamanho_id) || "Sem tamanho",
                    "Estoque mínimo": item.estoque_minimo,
                  })),
                ),
              )
            }
          >
            Exportar CSV
          </Button>
          <Button requiresWrite onClick={abrirNovo}>
            Novo uniforme
          </Button>
        </div>
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
              <LinhasEsqueleto colunas={4} />
            )}
            {!isLoading && grupos.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  {busca.trim()
                    ? <EstadoVazio titulo="Nenhum uniforme encontrado." dica="Confira o nome digitado." />
                    : <EstadoVazio titulo="Nenhum uniforme cadastrado." dica="Cadastre o primeiro uniforme para controlar estoque e entregas." acao="+ Cadastrar Primeiro Uniforme" aoAcionar={abrirNovo} />}
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
          <h2 className="text-sm font-semibold">Uniformes antigos</h2>
          <p className="text-xs text-muted-foreground">
            Cadastrados antes do catálogo por tamanho. Seguem funcionando como estavam.
          </p>
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {antigos.map((a) => (
              <li key={a.id} className="truncate">
                <span className="font-mono text-xs">{a.codigo_sku}</span> · {a.nome}
              </li>
            ))}
          </ul>
        </section>
      )}

      <DialogAssociarTamanhos aberto={associarAberto} onAbrirMudou={setAssociarAberto} de="uniformes" />

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
        <DialogContent telaCheia className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{clonando && !ehExemplo(clonando) ? "Clonar uniforme" : "Novo uniforme"}</DialogTitle>
            <DialogDescription>
              {clonando && !ehExemplo(clonando) ? "Copia todos os dados do cadastro de origem, que podem ser editados. O código é gerado ao salvar; não herda estoque nem movimentações." : "Cadastra uma descrição ainda não existente. O código é gerado ao salvar; outros tamanhos entram pelo Clonar."}
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
                <p className="text-xs text-muted-foreground">Nenhuma subcategoria de Uniformes em Parâmetros &gt; Parâmetros Específicos.</p>
              )}
            </div>
            <SiglaCodigo regras={regrasDaCategoria(parametros.regrasCodigo, CATEGORIA_UNIFORME)} valor={siglaSel} onMudar={setSiglaSel} />
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="nome">Descrição do item</Label>
              <Textarea id="nome" name="nome" capitalizar="texto" rows={2} defaultValue={clonando?.nome ?? ""} placeholder="Ex.: camisa operacional de algodão, manga longa" />
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
        <DialogContent telaCheia className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar uniforme {editando?.codigo_sku}</DialogTitle>
            <DialogDescription>
              Altere os dados do cadastro. O código não muda.
            </DialogDescription>
          </DialogHeader>
          {editando && (
            <EdicaoCatalogoForm
              key={editando.id}
              item={editando}
              modulo="uniforme"
              categoriaId={CATEGORIA_UNIFORME}
              nomeProduto="uniforme"
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
