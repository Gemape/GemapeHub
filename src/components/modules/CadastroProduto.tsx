import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
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
import { useFichasEpi } from "@/lib/use-fichas-epi";
import { exportarCsv } from "@/lib/gemape";
import { useExcluir, useItens, useSalvar, type Item } from "@/lib/hooks-gemape";
import { removerFicha } from "@/lib/fichas-epi";
import {
  MARCA_LEGADA,
  marcaDaSelecao,
  SEM_MARCA,
  selecaoInicialMarca,
  selecaoMarca,
} from "@/lib/marcas-gerais";
import { combinaBusca, estaAtivo, paraSelecao, proximoCodigo } from "@/lib/parametros-base";
import {
  nomeSubcategoria,
  resolverSubcategoria,
  SUBCATEGORIA_LEGADA,
  subcategoriaDaSelecao,
  subcategoriasParaSelecao,
  valorSelecaoSubcategoria,
} from "@/lib/subcategoria-referencia";
import { MODO_DEMO } from "@/lib/modo-demo";
import { useParametrosBase } from "@/lib/use-parametros-base";
import {
  controlaTamanho,
  nomeTamanho,
  nomeUnidade,
  resumoMinimosPorTamanho,
  tamanhosAssociadosParaCadastro,
  tamanhosAutorizadosDoProduto,
  unidadesAutorizadasDoProduto,
  type ModuloTamanho,
  type ProdutoTamanho,
} from "@/lib/estoque-tamanho";

type Tabela = "epis" | "uniformes";

// Unidade antiga digitada, que não está em Gerais: continua aparecendo na edição.
const UNIDADE_LEGADA = "unidade-legada";
const SEM_UNIDADE = "sem-unidade";
const campoMinimo = (tamanhoId: string) => `minimo_tamanho:${tamanhoId}`;

// Cada tipo de produto: tabela, categoria de Cadastros > Gerais (id fixo; o nome pode ser
// renomeado) e textos da tela.
const CONFIG: Record<
  Tabela,
  {
    modulo: ModuloTamanho;
    categoriaId: string;
    nome: string;
    exemplo: string;
    ficha: boolean;
    // Preço de custo, marca e modelo: exceção aprovada pelo responsável para uniforme
    // (dashboard e termo de entrega dependem deles).
    custoMarcaModelo: boolean;
  }
> = {
  epis: {
    modulo: "epi",
    categoriaId: "cat-epi",
    nome: "EPI",
    exemplo: "capacete de segurança em ABS de alto impacto",
    ficha: true,
    custoMarcaModelo: false,
  },
  uniformes: {
    modulo: "uniforme",
    categoriaId: "cat-uniformes",
    nome: "uniforme",
    exemplo: "camiseta manga curta em algodão azul royal",
    ficha: false,
    custoMarcaModelo: true,
  },
};

// Todos os códigos já usados na tabela, de todas as empresas, para seguir a sequência.
async function codigosUsados(tabela: Tabela): Promise<string[]> {
  const { data, error } = await supabase.from(tabela).select("codigo_sku");
  if (error) throw error;
  return ((data ?? []) as { codigo_sku: string | null }[]).map((e) => e.codigo_sku ?? "");
}

// Cadastrar EPI e Cadastrar uniforme (especificação rev1): código automático,
// subcategoria, descrição e estoque mínimo. A empresa continua sendo informada porque
// cada produto pertence a uma.
export function CadastroProduto({ tabela }: { tabela: Tabela }) {
  const config = CONFIG[tabela];
  const { empresas, empresaId } = useEmpresa();
  const parametros = useParametrosBase();
  const fichas = useFichasEpi();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Item | null>(null);
  const [previa, setPrevia] = useState("");
  const [empresaSel, setEmpresaSel] = useState("");
  // Subcategoria escolhida no formulário: define as unidades e os tamanhos de Gerais (decisão 23).
  const [subSel, setSubSel] = useState("");
  // Evita dois cadastros com o mesmo código num clique duplo em Salvar.
  // O ref bloqueia na hora; o estado só serve para desabilitar o botão. Depois de salvo,
  // o formulário fica travado até ser aberto de novo (o diálogo ainda está fechando).
  const salvando = useRef(false);
  const [gerando, setGerando] = useState(false);
  const { data: lista = [], isLoading } = useItens(config.modulo, empresaId, busca);
  // Filtro também na tela, porque o modo demonstração não filtra pela busca.
  // A subcategoria mostrada é a de Gerais, pela referência gravada (nome sempre atual).
  const subcategoriaDe = (i: Item) => nomeSubcategoria(parametros, config.categoriaId, i);
  const temTamanho = (i: Item) => MODO_DEMO && controlaTamanho(parametros, config.modulo, i);
  const itens = lista.filter((i) =>
    combinaBusca(
      busca,
      i.codigo_sku,
      i.nome,
      subcategoriaDe(i),
      nomeUnidade(parametros, i),
    ),
  );
  const salvar = useSalvar(tabela, [tabela, "produtos-gemape", "saidas-por-item"]);
  const excluir = useExcluir(tabela, [tabela, "produtos-gemape", "saidas-por-item"]);

  const regra = parametros.regrasCodigo.find((r) => r.categoriaId === config.categoriaId);
  // Ao editar um produto antigo cuja subcategoria não está em Cadastros > Gerais, ela
  // continua aparecendo para não ser apagada sem querer.
  const subcategoriaAtual = editando
    ? resolverSubcategoria(parametros, config.categoriaId, editando)
    : null;
  // Marca de Cadastros > Gerais; a marca antiga digitada continua aparecendo na edição.
  const marcaInicial = selecaoInicialMarca(parametros.marcasUniforme, editando?.marca);
  // Parâmetro desativado em Gerais sai da escolha; o que o cadastro já usa continua na edição.
  const subcategorias = subcategoriasParaSelecao(parametros, config.categoriaId, subcategoriaAtual);
  // Produto como fica com a subcategoria escolhida: dele saem as unidades e os tamanhos.
  const subEscolhida = subcategorias.find((s) => s.id === subSel);
  const produtoNoFormulario: ProdutoTamanho = {
    categoria:
      subEscolhida?.nome ??
      (subSel === SUBCATEGORIA_LEGADA ? (subcategoriaAtual?.nome ?? null) : ""),
    subcategoria_id: subEscolhida?.id ?? null,
    saldos_tamanho: editando?.saldos_tamanho ?? null,
  };
  const unidadesDaSub = MODO_DEMO
    ? unidadesAutorizadasDoProduto(parametros, config.modulo, produtoNoFormulario)
    : [];
  const unidadeAtualId = editando?.unidade_id ?? null;
  const unidades = paraSelecao(parametros, unidadesDaSub, (u) => u.id === unidadeAtualId);
  const unidadeLegada =
    editando && !unidadeAtualId && editando.unidade_medida?.trim() ? editando.unidade_medida : null;
  // A unidade atual que saiu da subcategoria continua aparecendo, para não ser trocada sem querer.
  const unidadeForaDaSub =
    unidadeAtualId && !unidades.some((u) => u.id === unidadeAtualId)
      ? (parametros.unidades.find((u) => u.id === unidadeAtualId) ?? null)
      : null;
  const pedeUnidade = unidades.some((u) => estaAtivo(parametros, u.id));
  const valorInicialUnidade = unidadeAtualId
    ? unidadeAtualId
    : unidadeLegada
      ? UNIDADE_LEGADA
      : SEM_UNIDADE;
  const porTamanho = MODO_DEMO && controlaTamanho(parametros, config.modulo, produtoNoFormulario);
  // Grade do mínimo por tamanho: os tamanhos ativos autorizados, mais os que já têm mínimo.
  const minimosAtuais = editando?.minimos_tamanho ?? {};
  const tamanhosDaGrade = porTamanho
    ? [
        ...new Set([
          ...tamanhosAutorizadosDoProduto(parametros, config.modulo, produtoNoFormulario)
            .filter((t) => estaAtivo(parametros, t.id))
            .map((t) => t.id),
          ...Object.keys(minimosAtuais).filter((id) => Number(minimosAtuais[id]) > 0),
        ]),
      ]
    : [];
  // Todos os tamanhos e numerações associados à subcategoria escolhida (decisão 23).
  const tamanhosAssociados =
    MODO_DEMO && (subEscolhida || subSel === SUBCATEGORIA_LEGADA)
      ? tamanhosAssociadosParaCadastro(parametros, config.modulo, produtoNoFormulario)
      : [];
  // Sem tamanho ativo para a grade (a subcategoria perdeu os tamanhos), vale o mínimo único.
  const usaGrade = porTamanho && tamanhosDaGrade.length > 0;
  const rotuloTamanho = (id: string) =>
    estaAtivo(parametros, id)
      ? nomeTamanho(parametros, id)
      : `${nomeTamanho(parametros, id)} (desativado)`;
  const marcas = paraSelecao(
    parametros,
    parametros.marcasUniforme,
    (m) => selecaoMarca(m.id) === marcaInicial.valor,
  );
  const rotulo = (item: { id: string; nome: string }) =>
    estaAtivo(parametros, item.id) ? item.nome : `${item.nome} (desativado)`;
  const empresaPadrao = empresaId !== TODAS ? empresaId : (empresas[0]?.id ?? "");

  function destravar() {
    salvando.current = false;
    setGerando(false);
  }

  async function abrirNovo() {
    if (!regra) {
      toast.error(
        `Cadastre antes a regra do código de ${config.nome} em Cadastros > Gerais > Código do Produto.`,
      );
      return;
    }
    destravar();
    setEditando(null);
    setEmpresaSel("");
    setSubSel("");
    setPrevia("");
    setAberto(true);
    try {
      setPrevia(proximoCodigo(regra, await codigosUsados(tabela)));
    } catch {
      setPrevia("");
    }
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const nome = String(f.get("nome") ?? "").trim();
    // A empresa não muda na edição: os códigos de fábrica ficam ligados a ela.
    const empresa = editando ? (editando.empresa_id ?? "") : empresaSel || empresaPadrao;
    let subcategoria: { id: string | null; nome: string };
    try {
      subcategoria = subcategoriaDaSelecao(
        String(f.get("categoria") ?? ""),
        parametros,
        config.categoriaId,
        subcategoriaAtual,
      );
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Selecione a subcategoria.");
      return;
    }
    if (!nome) {
      toast.error("Informe a descrição do item.");
      return;
    }
    if (!empresa) {
      toast.error("Selecione a empresa.");
      return;
    }
    if (salvando.current) return;
    const valores: Record<string, unknown> = {
      categoria: subcategoria.nome,
      nome,
      estoque_minimo: Math.max(0, Number(f.get("estoque_minimo") ?? 0) || 0),
    };
    // A referência só existe no modo demonstração; no banco real a coluna entra na Fase 2.
    if (MODO_DEMO) valores["subcategoria_id"] = subcategoria.id;
    // Unidade e mínimo por tamanho de Gerais (decisão 23), só no modo demonstração.
    if (MODO_DEMO) {
      const unidade = String(f.get("unidade_id") ?? "");
      if (unidade === UNIDADE_LEGADA && unidadeLegada) {
        valores["unidade_id"] = null;
        valores["unidade_medida"] = unidadeLegada;
      } else if (!unidade || unidade === SEM_UNIDADE) {
        if (pedeUnidade) {
          toast.error("Selecione a unidade.");
          return;
        }
        valores["unidade_id"] = null;
        valores["unidade_medida"] = null;
      } else {
        const escolhida = [...unidades, ...(unidadeForaDaSub ? [unidadeForaDaSub] : [])].find(
          (u) => u.id === unidade,
        );
        if (!escolhida) {
          toast.error("Unidade inválida. Escolha uma unidade autorizada em Cadastros > Gerais.");
          return;
        }
        valores["unidade_id"] = escolhida.id;
        valores["unidade_medida"] = escolhida.nome;
      }
      if (usaGrade) {
        const minimos: Record<string, number> = {};
        for (const id of tamanhosDaGrade) {
          const minimo = Math.max(0, Math.floor(Number(f.get(campoMinimo(id)) ?? 0) || 0));
          if (minimo > 0) minimos[id] = minimo;
        }
        valores["minimos_tamanho"] = minimos;
        // O mínimo do produto é a soma dos mínimos por tamanho.
        valores["estoque_minimo"] = Object.values(minimos).reduce((a, b) => a + b, 0);
      } else {
        // Mínimo único: mínimos por tamanho antigos não ficam escondidos no cadastro.
        valores["minimos_tamanho"] = {};
      }
    }
    if (config.custoMarcaModelo) {
      const preco = String(f.get("preco_unitario") ?? "").trim();
      const precoNumero = Number(preco);
      if (preco && (!Number.isFinite(precoNumero) || precoNumero < 0)) {
        toast.error("Preço de custo inválido.");
        return;
      }
      // Centavos: arredonda para 2 casas (preços antigos podem ter mais).
      valores["preco_unitario"] = preco ? Math.round(precoNumero * 100) / 100 : null;
      // Marca e modelo ainda não existem na tabela real de uniformes: nesta fase só são
      // gravados no modo demonstração. As colunas entram na Fase 2.
      if (MODO_DEMO) {
        try {
          valores["marca"] =
            marcaDaSelecao(String(f.get("marca") ?? ""), marcas, editando?.marca) || null;
        } catch (erro) {
          toast.error(erro instanceof Error ? erro.message : "Marca inválida.");
          return;
        }
        valores["modelo"] = String(f.get("modelo") ?? "").trim() || null;
      }
    }
    if (!editando) {
      valores["empresa_id"] = empresa;
      if (!regra) {
        toast.error(`Regra do código de ${config.nome} não encontrada.`);
        return;
      }
    }
    salvando.current = true;
    setGerando(true);
    const liberar = destravar;
    if (!editando && regra) {
      try {
        // O código é gerado na hora de salvar, para não repetir um já usado.
        valores["codigo_sku"] = proximoCodigo(regra, await codigosUsados(tabela));
      } catch (erro) {
        liberar();
        toast.error("Não foi possível gerar o código.", {
          description: erro instanceof Error ? erro.message : undefined,
        });
        return;
      }
      valores["estoque_atual"] = 0;
      valores["status"] = "Ativo";
    }
    salvar.mutate(
      { ...(editando ? { id: editando.id } : {}), valores },
      { onSuccess: () => setAberto(false), onError: liberar },
    );
  }

  const resumoMinimos = (i: Item) => resumoMinimosPorTamanho(parametros, i);
  const nomeEmpresa = (id: string | null) =>
    empresas.find((e) => e.id === id)?.nome_fantasia ?? "—";
  const temFicha = (id: string) => fichas.some((f) => f.epiId === id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por código ou descrição"
          className="max-w-xs"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              exportarCsv(
                config.modulo,
                itens.map((i) => ({
                  Código: i.codigo_sku,
                  Subcategoria: subcategoriaDe(i),
                  Descrição: i.nome,
                  Unidade: nomeUnidade(parametros, i),
                  Empresa: nomeEmpresa(i.empresa_id),
                })),
              )
            }
          >
            Exportar CSV
          </Button>
          <Button requiresWrite onClick={abrirNovo}>
            Novo {config.nome}
          </Button>
        </div>
      </div>

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Subcategoria</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead className="text-right">Estoque mínimo</TableHead>
              <TableHead>Empresa</TableHead>
              {config.ficha && <TableHead>Ficha</TableHead>}
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={config.ficha ? 8 : 7}
                  className="text-center text-muted-foreground"
                >
                  Carregando…
                </TableCell>
              </TableRow>
            ) : itens.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={config.ficha ? 8 : 7}
                  className="text-center text-muted-foreground"
                >
                  Nenhum {config.nome} cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              itens.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.codigo_sku}</TableCell>
                  <TableCell>{subcategoriaDe(item) || "—"}</TableCell>
                  <TableCell className="font-medium">{item.nome}</TableCell>
                  <TableCell>{nomeUnidade(parametros, item) || "—"}</TableCell>
                  <TableCell className="text-right">
                    {item.estoque_minimo ?? 0}
                    {temTamanho(item) && resumoMinimos(item) && (
                      <p className="text-xs text-muted-foreground">{resumoMinimos(item)}</p>
                    )}
                  </TableCell>
                  <TableCell>{nomeEmpresa(item.empresa_id)}</TableCell>
                  {config.ficha && (
                    <TableCell>
                      <Link to="/cadastros/epi-ficha" search={{ epi: item.id }}>
                        <Badge variant={temFicha(item.id) ? "secondary" : "outline"}>
                          {temFicha(item.id) ? "Cadastrada" : "Pendente"}
                        </Badge>
                      </Link>
                    </TableCell>
                  )}
                  <TableCell className="whitespace-nowrap text-right">
                    <Button
                      requiresWrite
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        destravar();
                        setEditando(item);
                        setSubSel(
                          valorSelecaoSubcategoria(
                            resolverSubcategoria(parametros, config.categoriaId, item),
                          ),
                        );
                        setAberto(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      requiresWrite
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Excluir ${item.codigo_sku} ${item.nome}?`))
                          excluir.mutate(item.id, {
                            // A ficha do EPI excluído sai junto (só EPI tem ficha).
                            onSuccess: () => {
                              try {
                                if (config.ficha) removerFicha(item.id);
                              } catch {
                                // Fichas ilegíveis ficam como estão.
                              }
                            },
                          });
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

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editando ? `Editar ${editando.codigo_sku}` : `Cadastrar ${config.nome}`}
            </DialogTitle>
            <DialogDescription>
              {editando
                ? "O código do produto não muda."
                : "O código é gerado automaticamente ao salvar, pela regra de Cadastros > Gerais > Código do Produto."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="codigo_sku">Código</Label>
              <Input
                id="codigo_sku"
                readOnly
                className="bg-muted font-mono"
                value={editando?.codigo_sku ?? (previa || "Gerado ao salvar")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="categoria">Subcategoria</Label>
              <Select name="categoria" value={subSel} onValueChange={setSubSel}>
                <SelectTrigger id="categoria">
                  <SelectValue placeholder="Selecione a subcategoria" />
                </SelectTrigger>
                <SelectContent>
                  {subcategorias.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {rotulo(s)}
                    </SelectItem>
                  ))}
                  {subcategoriaAtual?.foraDeGerais && (
                    <SelectItem value={SUBCATEGORIA_LEGADA}>
                      {subcategoriaAtual.nome} (fora de Cadastros &gt; Gerais)
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {subcategorias.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhuma subcategoria de {config.nome} em Cadastros &gt; Gerais &gt; Categorias.
                </p>
              )}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="nome">Descrição do item</Label>
              <Textarea
                id="nome"
                aria-required
                name="nome"
                rows={2}
                defaultValue={editando?.nome ?? ""}
                placeholder={`Ex.: ${config.exemplo}`}
              />
            </div>
            {(unidades.length > 0 || unidadeLegada || unidadeForaDaSub) && (
              <div className="space-y-1.5">
                <Label htmlFor="unidade_id">Unidade</Label>
                <Select
                  key={`${subSel}-${editando?.id ?? "novo"}`}
                  name="unidade_id"
                  defaultValue={valorInicialUnidade}
                >
                  <SelectTrigger id="unidade_id">
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {!pedeUnidade && <SelectItem value={SEM_UNIDADE}>Sem unidade</SelectItem>}
                    {unidades.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {rotulo(u)}
                      </SelectItem>
                    ))}
                    {unidadeForaDaSub && (
                      <SelectItem value={unidadeForaDaSub.id}>
                        {unidadeForaDaSub.nome} (não autorizada nesta subcategoria)
                      </SelectItem>
                    )}
                    {unidadeLegada && (
                      <SelectItem value={UNIDADE_LEGADA}>
                        {unidadeLegada} (fora de Cadastros &gt; Gerais)
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            {MODO_DEMO && (subEscolhida || subSel === SUBCATEGORIA_LEGADA) && (
              <div className="space-y-1.5 sm:col-span-2">
                <p id="tamanhos_associados" className="text-sm font-medium">
                  Tamanhos e numerações
                </p>
                {tamanhosAssociados.length > 0 ? (
                  <ul aria-labelledby="tamanhos_associados" className="flex flex-wrap gap-1.5">
                    {tamanhosAssociados.map((t) => (
                      <li key={t.id}>
                        <Badge variant="secondary">{t.rotulo}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Nenhum tamanho associado a esta subcategoria. Associe em Cadastros &gt; Gerais
                    &gt; Associar Tamanho e Medida.
                  </p>
                )}
                {tamanhosAssociados.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Os tamanhos vêm de Cadastros &gt; Gerais &gt; Associar Tamanho e Medida.
                    Defina aqui o estoque mínimo por tamanho. A movimentação e o saldo ficam no módulo{" "}
                    {config.modulo === "epi" ? "EPI" : "Uniformes"}.
                  </p>
                )}
              </div>
            )}
            {usaGrade ? (
              <fieldset className="space-y-2 sm:col-span-2">
                <legend className="text-sm font-medium">Estoque mínimo por tamanho</legend>
                <p className="text-xs text-muted-foreground">
                  Tamanhos autorizados para a subcategoria em Cadastros &gt; Gerais &gt; Associar
                  Tamanho e Medida. Configure aqui o mínimo de cada tamanho.
                </p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {tamanhosDaGrade.map((id) => (
                    <div key={id} className="space-y-1">
                      <Label htmlFor={campoMinimo(id)} className="text-xs">
                        {rotuloTamanho(id)}
                      </Label>
                      <Input
                        id={campoMinimo(id)}
                        name={campoMinimo(id)}
                        type="number"
                        min={0}
                        step={1}
                        defaultValue={minimosAtuais[id] ?? 0}
                      />
                    </div>
                  ))}
                </div>
              </fieldset>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="estoque_minimo">Estoque mínimo</Label>
                <Input
                  id="estoque_minimo"
                  name="estoque_minimo"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={editando?.estoque_minimo ?? 0}
                />
              </div>
            )}
            {config.custoMarcaModelo && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="preco_unitario">Preço de custo (R$)</Label>
                  <Input
                    id="preco_unitario"
                    name="preco_unitario"
                    type="number"
                    min={0}
                    step="any"
                    defaultValue={editando?.preco_unitario ?? ""}
                  />
                </div>
                {MODO_DEMO && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="marca">Marca</Label>
                      <Select name="marca" defaultValue={marcaInicial.valor}>
                        <SelectTrigger id="marca">
                          <SelectValue placeholder="Selecione a marca" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SEM_MARCA}>Sem marca</SelectItem>
                          {marcas.map((m) => (
                            <SelectItem key={m.id} value={selecaoMarca(m.id)}>
                              {rotulo(m)}
                            </SelectItem>
                          ))}
                          {marcaInicial.legada && (
                            <SelectItem value={MARCA_LEGADA}>
                              {marcaInicial.legada} (fora de Cadastros &gt; Gerais)
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {marcas.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Cadastre marcas em Cadastros &gt; Gerais &gt; Categorias.
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="modelo">Modelo</Label>
                      <Input id="modelo" name="modelo" defaultValue={editando?.modelo ?? ""} />
                    </div>
                  </>
                )}
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="empresa_id">Empresa</Label>
              <Select
                value={editando ? (editando.empresa_id ?? "") : empresaSel || empresaPadrao}
                onValueChange={setEmpresaSel}
                disabled={!!editando}
              >
                <SelectTrigger id="empresa_id">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome_fantasia}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
              <Button requiresWrite type="submit" disabled={salvar.isPending || gerando}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
