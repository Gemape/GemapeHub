import { useRef, useState } from "react";
import { soEmpregadosDeVeiculos } from "@/lib/empregados-veiculos";
import { useAbrirDireto } from "@/lib/use-abrir-direto";
import { capitalizarTexto } from "@/lib/formatacao-cadastral";
import { descricaoVeiculo, validarAquisicao } from "@/lib/descricao-veiculo";
import { dataBrasilia } from "@/lib/portadores-caixa";
import { avisarEnderecamentoObrigatorio } from "@/lib/aviso-enderecamento";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import { lerTodas } from "@/lib/ler-todas";
import { exemploVeiculo } from "@/lib/dados-teste/exemplos";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { empresaPadraoParaEscolha, empresasParaEscolha } from "@/lib/empresas";
import {
  COMBUSTIVEIS_VEICULO,
  STATUS_VEICULO,
  STATUS_VEICULO_LABEL,
  exportarCsv,
} from "@/lib/gemape";
import {
  useEmpregados,
  useExcluir,
  useSalvar,
  useVeiculos,
  type Veiculo,
} from "@/lib/hooks-gemape";
import {
  MARCA_LEGADA,
  marcaDaSelecao,
  SEM_MARCA,
  selecaoInicialMarca,
  selecaoMarca,
} from "@/lib/marcas-gerais";
import { combinaBusca, estaAtivo, paraSelecao, proximoCodigo, regraDoCadastro, regrasDaCategoria, siglaDoCodigo } from "@/lib/parametros-base";
import { SiglaCodigo } from "@/components/modules/SiglaCodigo";
import {
  nomeSubcategoria,
  resolverSubcategoria,
  SUBCATEGORIA_LEGADA,
  subcategoriaDaSelecao,
  subcategoriasParaSelecao,
  valorSelecaoSubcategoria,
} from "@/lib/subcategoria-referencia";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { useAbastecimentos, useManutencoesVeiculo } from "@/lib/use-registros-veiculo";
import {
  anoValido,
  formatarPlaca,
  normalizarPlaca,
  placaRepetida,
  placaValida,
  subcategoriaTemPlaca,
} from "@/lib/veiculos";

// Categoria Veículos de Cadastros > Gerais (id fixo; o nome pode ser renomeado).
const CATEGORIA_VEICULO = "cat-veiculos";

// Código e descrição ainda não existem na tabela real de veículos: nesta fase só são
// gravados no modo demonstração. As colunas entram na Fase 2.
const NENHUM = "nenhum";

const MODO_DEMO = import.meta.env["VITE_DEMO_MODE"] !== "false";

type VeiculoCadastro = Veiculo & {
  codigo_sku?: string | null;
  descricao?: string | null;
  data_aquisicao?: string | null;
  custo?: number | null;
  numero_nota_fiscal?: string | null;
};

// Todos os veículos (de todas as empresas): códigos para a sequência e placas repetidas.
async function todosVeiculos(): Promise<{ id: string; placa: string; codigo_sku?: string }[]> {
  return lerTodas<{ id: string; placa: string; codigo_sku?: string }>(() => supabase.from("veiculos").select("*"), (q) => q.order("id"));
}

// Cadastrar veículo (especificação rev1 + decisões especiais 9 e 10): código automático,
// subcategoria, placa, marca, modelo, ano de fabricação, cor, combustível,
// empresa, RENAVAM, data de aquisição, custo, nota fiscal, quilometragem, situação, responsável e
// observações. A descrição é montada sozinha (decisão 49).
export function VeiculosCadastroModulo({ direto = false, aoConcluir }: { direto?: boolean; aoConcluir?: () => void } = {}) {
  const { empresas, empresaId } = useEmpresa();
  const parametros = useParametrosBase();
  // Km mostrado e conferido como no extrato e na frota: vale o maior entre o cadastro e os registros do veículo.
  const abastecimentosKm = useAbastecimentos();
  const manutencoesKm = useManutencoesVeiculo();
  const kmDosRegistros = (id: string) =>
    Math.max(0, ...abastecimentosKm.filter((a) => a.veiculoId === id).map((a) => a.km), ...manutencoesKm.filter((m) => m.veiculoId === id).map((m) => m.km));
  const kmAtualDe = (v: { id: string; quilometragem_atual?: number | null }) => Math.max(v.quilometragem_atual ?? 0, kmDosRegistros(v.id));
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<VeiculoCadastro | null>(null);
  // Clonar: veículo de origem que só preenche o formulário de novo cadastro.
  const [origem, setOrigem] = useState<VeiculoCadastro | null>(null);
  const base = editando ?? origem;
  const [previa, setPrevia] = useState("");
  // Sigla escolhida para o código novo (só importa quando a categoria tem mais de uma regra em Gerais).
  const [siglaSel, setSiglaSel] = useState("");
  const [empresaSel, setEmpresaSel] = useState("");
  // Subcategoria escolhida no formulário (null = a que o cadastro já tem); decide se o campo Placa aparece.
  const [subSel, setSubSel] = useState<string | null>(null);
  // O ref bloqueia na hora; o estado só serve para desabilitar o botão. Depois de salvo,
  // o formulário fica travado até ser aberto de novo (o diálogo ainda está fechando).
  const salvando = useRef(false);
  const [gerando, setGerando] = useState(false);
  const { data: lista = [], isLoading } = useVeiculos(empresaId);
  const empresaPadrao = empresaPadraoParaEscolha(empresas, empresaId);
  const empresaForm = empresaSel || base?.empresa_id || empresaPadrao;
  // Responsável: empregados ativos da empresa do veículo; os nomes da lista vêm de todos.
  const { data: empregadosEmpresaTodos = [] } = useEmpregados(empresaForm || TODAS, true);
  // Só quem foi escolhido em Parâmetros > Veículos > Parâmetros Específicos (lista vazia = todos).
  const empregadosEmpresa = soEmpregadosDeVeiculos(empregadosEmpresaTodos);
  const { data: empregados = [] } = useEmpregados(TODAS);
  const responsavelAtual = base?.empregado_responsavel_id
    ? empregados.find((e) => e.id === base.empregado_responsavel_id)
    : undefined;
  // Evita que a prévia do código de um "Novo" atrasado apareça numa edição aberta depois.
  const pedidoPrevia = useRef(0);
  const salvar = useSalvar("veiculos", ["veiculos"]);
  const excluir = useExcluir("veiculos", ["veiculos"]);

  // A subcategoria mostrada é a de Gerais, pela referência gravada (nome sempre atual).
  const subcategoriaDe = (v: VeiculoCadastro) => nomeSubcategoria(parametros, CATEGORIA_VEICULO, v);
  // A descrição é montada dos dados atuais (decisão 49), então acompanha mudanças de Gerais.
  const descricaoDe = (v: VeiculoCadastro) =>
    descricaoVeiculo({ placa: v.placa, subcategoria: subcategoriaDe(v), marca: v.marca, modelo: v.modelo, ano: v.ano, cor: v.cor, combustivel: v.combustivel });
  const veiculos = (lista as VeiculoCadastro[]).filter((v) =>
    combinaBusca(
      busca.replace(/-/g, ""),
      v.codigo_sku,
      subcategoriaDe(v),
      descricaoDe(v),
      normalizarPlaca(v.placa ?? ""),
      v.marca,
      v.modelo,
    ),
  );
  const regra = regraDoCadastro(parametros.regrasCodigo, CATEGORIA_VEICULO, siglaSel);
  // Tipo antigo que não está em Cadastros > Gerais continua aparecendo na edição.
  const subcategoriaAtual = base
    ? resolverSubcategoria(parametros, CATEGORIA_VEICULO, base)
    : null;
  // Marca de Cadastros > Gerais; a marca antiga digitada continua aparecendo na edição.
  const marcaInicial = selecaoInicialMarca(parametros.marcasVeiculo, base?.marca);
  // Parâmetro desativado em Gerais sai da escolha; o que o cadastro já usa continua na edição.
  const subcategorias = subcategoriasParaSelecao(parametros, CATEGORIA_VEICULO, subcategoriaAtual);
  const subEscolhida = subSel ?? valorSelecaoSubcategoria(subcategoriaAtual);
  const nomeSubEscolhida =
    subEscolhida === SUBCATEGORIA_LEGADA
      ? subcategoriaAtual?.nome
      : subcategorias.find((s) => s.id === subEscolhida)?.nome;
  const temPlaca = subcategoriaTemPlaca(nomeSubEscolhida);
  const marcas = paraSelecao(
    parametros,
    parametros.marcasVeiculo,
    (m) => selecaoMarca(m.id) === marcaInicial.valor,
  );
  const rotulo = (item: { id: string; nome: string }) =>
    estaAtivo(parametros, item.id) ? item.nome : `${item.nome} (desativado)`;

  function destravar() {
    salvando.current = false;
    setGerando(false);
  }

  // Novo veículo (na demonstração, já com um exemplo preenchido).
  function novoVeiculo() {
    return import.meta.env.VITE_DEMO_MODE !== "false"
      ? todosVeiculos().then((todos) => { try { return exemploVeiculo(todos, empresaPadrao, parametros.marcasVeiculo[0]?.nome ?? "Fiat") as unknown as VeiculoCadastro; } catch { return undefined; } }, () => undefined).then((exemplo) => abrirNovo(exemplo))
      : abrirNovo();
  }
  useAbrirDireto(direto, empresas.length > 0, aberto, novoVeiculo, aoConcluir);
  // Sem argumento abre o cadastro em branco; com um veículo, abre como novo já preenchido (Clonar):
  // placa, RENAVAM e quilometragem são copiados (decisão 138) e podem ser editados; o código é gerado ao salvar.
  async function abrirNovo(clonar: VeiculoCadastro | null = null) {
    if (MODO_DEMO && !regra) {
      toast.error(
        "Cadastre antes a regra do código de veículo em Cadastros > Gerais > Código do Produto.",
      );
      if (direto) aoConcluir?.(); // sem formulário para mostrar, devolve o usuário à associação em vez de deixar a janela vazia
      return;
    }
    destravar();
    setEditando(null);
    setOrigem(clonar);
    setEmpresaSel(clonar?.empresa_id ?? "");
    setSubSel(null);
    setPrevia("");
    // Clonar começa com a mesma sigla do original; senão, a padrão da categoria.
    const siglaInicial = clonar ? siglaDoCodigo(parametros.regrasCodigo, CATEGORIA_VEICULO, clonar.codigo_sku) : "";
    setSiglaSel(siglaInicial);
    setAberto(true);
    await calcularPrevia(regraDoCadastro(parametros.regrasCodigo, CATEGORIA_VEICULO, siglaInicial));
  }

  async function calcularPrevia(r: typeof regra) {
    const pedido = ++pedidoPrevia.current;
    if (!MODO_DEMO || !r) return;
    try {
      const codigo = proximoCodigo(
        r,
        (await todosVeiculos()).map((v) => v.codigo_sku),
      );
      if (pedido === pedidoPrevia.current) setPrevia(codigo);
    } catch {
      setPrevia("");
    }
  }

  // Trocar a sigla no cadastro novo troca também o código mostrado.
  function escolherSigla(sigla: string) {
    setSiglaSel(sigla);
    setPrevia("");
    void calcularPrevia(regraDoCadastro(parametros.regrasCodigo, CATEGORIA_VEICULO, sigla));
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const texto = (k: string) => String(f.get(k) ?? "").trim();
    let subcategoria: { id: string | null; nome: string } | null = null;
    let erroSubcategoria: string | null = null;
    try {
      subcategoria = subcategoriaDaSelecao(
        texto("tipo"),
        parametros,
        CATEGORIA_VEICULO,
        subcategoriaAtual,
      );
    } catch (falha) {
      erroSubcategoria = falha instanceof Error ? falha.message : "Selecione a subcategoria.";
    }
    const tipo = subcategoria?.nome ?? "";
    // Empilhadeira não tem placa (decisão 66): o campo não existe e a placa fica em branco.
    const semPlaca = !subcategoriaTemPlaca(tipo);
    const placaDigitada = semPlaca ? "" : normalizarPlaca(texto("placa"));
    let marca = "";
    let erroMarca: string | null = null;
    try {
      marca = marcaDaSelecao(texto("marca"), marcas, base?.marca, {
        obrigatoria: true,
      });
    } catch (falha) {
      erroMarca = falha instanceof Error ? falha.message : "Marca inválida.";
    }
    const modelo = capitalizarTexto(texto("modelo"));
    const anoTexto = texto("ano");
    const ano = anoTexto ? Number(anoTexto) : null;
    const cor = capitalizarTexto(texto("cor"));
    const kmTexto = texto("quilometragem_atual");
    const km = kmTexto ? Number(kmTexto) : 0;
    const status = texto("status") || "Ativo";
    const responsavel = texto("empregado_responsavel_id");
    const combustivel = texto("combustivel");
    const empresa = empresaSel || editando?.empresa_id || empresaPadrao;
    // Placa já salva que não segue o padrão pode continuar como está na edição.
    const placaMantida = !!editando && placaDigitada === normalizarPlaca(editando.placa ?? "");
    // Grava no mesmo formato das placas antigas (ABC-1234 ou ABC1D23); a mantida fica igual.
    const placa = semPlaca ? "" : placaMantida && editando ? editando.placa : formatarPlaca(placaDigitada);
    const aquisicao = validarAquisicao(
      { data: texto("data_aquisicao"), custo: texto("custo"), notaFiscal: texto("numero_nota_fiscal") },
      dataBrasilia(),
    );
    const erro = erroSubcategoria
      ? erroSubcategoria
      : !semPlaca && !placaDigitada
          ? "Informe a placa."
          : !semPlaca && !placaMantida && !placaValida(placaDigitada)
            ? "Placa inválida. Use o padrão ABC-1234 ou ABC1D23."
            : erroMarca
              ? erroMarca
              : !modelo
                ? "Informe o modelo."
                : ano !== null && !anoValido(ano)
                  ? `Ano de fabricação inválido. Use de 1950 a ${new Date().getFullYear() + 1}.`
                  : !Number.isInteger(km) || km < 0
                    ? "Quilometragem inválida."
                    : editando && km < kmDosRegistros(editando.id)
                      ? `A quilometragem não pode ser menor que a dos registros do veículo (${kmDosRegistros(editando.id).toLocaleString("pt-BR")} km).`
                    : !empresa
                      ? "Selecione a empresa."
                      : MODO_DEMO && aquisicao.erro
                        ? aquisicao.erro
                        : null;
    if (erro) {
      toast.error(erro);
      return;
    }
    if (salvando.current) return;
    salvando.current = true;
    setGerando(true);

    const valores: Record<string, unknown> = {
      tipo,
      placa,
      marca,
      modelo,
      ano,
      cor: cor || null,
      combustivel: combustivel || null,
      empresa_id: empresa,
      renavam: texto("renavam") || null,
      quilometragem_atual: km,
      status,
      empregado_responsavel_id: responsavel && responsavel !== NENHUM ? responsavel : null,
      observacoes: capitalizarTexto(texto("observacoes")) || null,
    };
    if (MODO_DEMO) {
      // A descrição é montada sozinha: placa, subcategoria, marca, modelo, ano, cor e combustível.
      valores["descricao"] = descricaoVeiculo({ placa, subcategoria: tipo, marca, modelo, ano, cor, combustivel });
      valores["data_aquisicao"] = aquisicao.data;
      valores["custo"] = aquisicao.custo;
      valores["numero_nota_fiscal"] = aquisicao.notaFiscal;
      // A referência só existe no modo demonstração; no banco real a coluna entra na Fase 2.
      valores["subcategoria_id"] = subcategoria?.id ?? null;
    }
    try {
      const todos = await todosVeiculos();
      if (!semPlaca && placaRepetida(placa, todos, editando?.id)) {
        toast.error(`A placa ${formatarPlaca(placa)} já está cadastrada.`);
        destravar();
        return;
      }
      // O código é gerado na hora de salvar, para não repetir um já usado. Veículo
      // cadastrado antes da regra ganha o código na primeira edição.
      if (MODO_DEMO && regra && !editando?.codigo_sku) {
        valores["codigo_sku"] = proximoCodigo(
          regra,
          todos.map((v) => v.codigo_sku),
        );
      }
    } catch (falha) {
      toast.error("Não foi possível conferir os veículos já cadastrados.", {
        description: falha instanceof Error ? falha.message : undefined,
      });
      destravar();
      return;
    }
    salvar.mutate(
      { ...(editando ? { id: editando.id } : {}), valores },
      { onSuccess: () => {
        setAberto(false);
        void avisarEnderecamentoObrigatorio(parametros, CATEGORIA_VEICULO, empresa,
          String(valores["codigo_sku"] ?? editando?.codigo_sku ?? ""));
      }, onError: destravar },
    );
  }

  const nomeEmpregado = (id: string | null) => empregados.find((e) => e.id === id)?.nome ?? "—";
  const nomeEmpresa = (id: string | null) =>
    empresas.find((e) => e.id === id)?.nome_fantasia ?? "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por código, placa ou descrição"
          className="max-w-xs"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              exportarCsv(
                "veiculos",
                veiculos.map((v) => ({
                  Código: v.codigo_sku ?? "",
                  Subcategoria: subcategoriaDe(v),
                  Descrição: descricaoDe(v),
                  Placa: formatarPlaca(v.placa) || "—",
                  Marca: v.marca,
                  Modelo: v.modelo,
                  "Ano de fabricação": v.ano ?? "",
                  Cor: v.cor ?? "",
                  Combustível: v.combustivel ?? "",
                  Empresa: nomeEmpresa(v.empresa_id),
                  RENAVAM: v.renavam ?? "",
                  ...(MODO_DEMO
                    ? {
                        "Data de aquisição": v.data_aquisicao ?? "",
                        Custo: v.custo ?? "",
                        "Nota fiscal": v.numero_nota_fiscal ?? "",
                      }
                    : {}),
                  Km: kmAtualDe(v),
                  Situação: STATUS_VEICULO_LABEL[v.status] ?? v.status,
                  Responsável: nomeEmpregado(v.empregado_responsavel_id),
                  Observações: v.observacoes ?? "",
                })),
              )
            }
          >
            Exportar CSV
          </Button>
          <Button requiresWrite onClick={() => void novoVeiculo()}>
            Novo veículo
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
              <TableHead>Placa</TableHead>
              <TableHead>Marca / modelo</TableHead>
              <TableHead>Ano</TableHead>
              <TableHead>Cor</TableHead>
              <TableHead>Combustível</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead className="text-right">Km</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : veiculos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center text-muted-foreground">
                  Nenhum veículo cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              veiculos.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="whitespace-nowrap font-mono text-xs">
                    {v.codigo_sku || "—"}
                  </TableCell>
                  <TableCell>{subcategoriaDe(v) || "—"}</TableCell>
                  <TableCell className="font-medium">{descricaoDe(v) || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs">
                    {formatarPlaca(v.placa) || "—"}
                  </TableCell>
                  <TableCell>{[v.marca, v.modelo].filter(Boolean).join(" ") || "—"}</TableCell>
                  <TableCell>{v.ano ?? "—"}</TableCell>
                  <TableCell>{v.cor || "—"}</TableCell>
                  <TableCell>{v.combustivel || "—"}</TableCell>
                  <TableCell>{nomeEmpresa(v.empresa_id)}</TableCell>
                  <TableCell className="text-right">
                    {kmAtualDe(v).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell>{nomeEmpregado(v.empregado_responsavel_id)}</TableCell>
                  <TableCell>
                    <Badge variant={v.status === "Ativo" ? "secondary" : "outline"}>
                      {STATUS_VEICULO_LABEL[v.status] ?? v.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <AcoesLinha
                      rotulo={`veículo ${v.codigo_sku || formatarPlaca(v.placa)}`}
                      onClonar={() => void abrirNovo(v)}
                      onEditar={() => {
                        destravar();
                        pedidoPrevia.current++;
                        setOrigem(null);
                        setEmpresaSel(v.empresa_id ?? "");
                        setSubSel(null);
                        setPrevia("");
                        setSiglaSel("");
                        setEditando(v);
                        setAberto(true);
                      }}
                      onExcluir={() => {
                        if (confirm(`Excluir ${v.codigo_sku || formatarPlaca(v.placa)}?`)) excluir.mutate(v.id);
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent telaCheia className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editando
                ? `Editar ${editando.codigo_sku || formatarPlaca(editando.placa)}`
                : "Cadastrar veículo"}
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
                value={
                  editando?.codigo_sku
                    ? editando.codigo_sku
                    : MODO_DEMO
                      ? previa || "Gerado ao salvar"
                      : "Disponível na Fase 2"
                }
              />
            </div>
            {MODO_DEMO && !editando?.codigo_sku && (
              <SiglaCodigo regras={regrasDaCategoria(parametros.regrasCodigo, CATEGORIA_VEICULO)} valor={siglaSel} onMudar={escolherSigla} />
            )}
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Subcategoria</Label>
              <Select name="tipo" value={subEscolhida} onValueChange={setSubSel}>
                <SelectTrigger id="tipo" aria-required>
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
                  Nenhuma subcategoria de veículo em Cadastros &gt; Gerais &gt; Categorias.
                </p>
              )}
            </div>
            {temPlaca && (
              <div className="space-y-1.5">
                <Label htmlFor="placa">Placa</Label>
                <Input
                  id="placa"
                  name="placa"
                  aria-required
                  defaultValue={base ? formatarPlaca(base.placa) : ""}
                  placeholder="ABC-1234 ou ABC1D23"
                  className="uppercase"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="marca">Marca</Label>
              <Select
                name="marca"
                defaultValue={marcaInicial.valor === SEM_MARCA ? "" : marcaInicial.valor}
              >
                <SelectTrigger id="marca" aria-required>
                  <SelectValue placeholder="Selecione a marca" />
                </SelectTrigger>
                <SelectContent>
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
              <Input
                id="modelo" capitalizar="texto"
                name="modelo"
                aria-required
                defaultValue={base?.modelo ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ano">Ano de fabricação</Label>
              <Input
                id="ano"
                name="ano"
                type="number"
                min={1950}
                max={new Date().getFullYear() + 1}
                step={1}
                defaultValue={base?.ano ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cor">Cor</Label>
              <Input id="cor" capitalizar="texto" name="cor" defaultValue={base?.cor ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="combustivel">Combustível</Label>
              <Select name="combustivel" defaultValue={base?.combustivel ?? ""}>
                <SelectTrigger id="combustivel">
                  <SelectValue placeholder="Selecione o combustível" />
                </SelectTrigger>
                <SelectContent>
                  {COMBUSTIVEIS_VEICULO.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                  {base?.combustivel &&
                    !(COMBUSTIVEIS_VEICULO as readonly string[]).includes(base.combustivel) && (
                      <SelectItem value={base.combustivel}>{base.combustivel}</SelectItem>
                    )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="empresa_id">Empresa</Label>
              <Select
                value={empresaSel || base?.empresa_id || empresaPadrao}
                onValueChange={setEmpresaSel}
              >
                <SelectTrigger id="empresa_id">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {empresasParaEscolha(empresas, [base?.empresa_id]).map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome_fantasia}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="renavam">RENAVAM</Label>
              <Input id="renavam" name="renavam" defaultValue={base?.renavam ?? ""} />
            </div>
            {MODO_DEMO && (
              <>
                {/* Clonar copia também a aquisição (decisão 138); tudo pode ser editado. */}
                <div className="space-y-1.5">
                  <Label htmlFor="data_aquisicao">Data de aquisição</Label>
                  <Input
                    id="data_aquisicao"
                    name="data_aquisicao"
                    type="date"
                    max={dataBrasilia()}
                    defaultValue={base?.data_aquisicao ?? ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="custo">Custo (R$)</Label>
                  <Input
                    id="custo"
                    name="custo"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    defaultValue={base?.custo ?? ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="numero_nota_fiscal">Número da nota fiscal</Label>
                  <Input
                    id="numero_nota_fiscal"
                    name="numero_nota_fiscal"
                    maxLength={30}
                    defaultValue={base?.numero_nota_fiscal ?? ""}
                  />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="quilometragem_atual">Quilometragem atual</Label>
              <Input
                id="quilometragem_atual"
                name="quilometragem_atual"
                type="number"
                min={0}
                defaultValue={base?.quilometragem_atual ?? 0}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Situação</Label>
              <Select name="status" defaultValue={base?.status ?? "Ativo"}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_VEICULO.map((st) => (
                    <SelectItem key={st} value={st}>
                      {STATUS_VEICULO_LABEL[st] ?? st}
                    </SelectItem>
                  ))}
                  {base?.status &&
                    !(STATUS_VEICULO as readonly string[]).includes(base.status) && (
                      <SelectItem value={base.status}>{base.status}</SelectItem>
                    )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="empregado_responsavel_id">Empregado responsável</Label>
              <Select
                name="empregado_responsavel_id"
                defaultValue={base?.empregado_responsavel_id ?? NENHUM}
              >
                <SelectTrigger id="empregado_responsavel_id">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NENHUM}>Sem responsável</SelectItem>
                  {/* O responsável atual continua na lista mesmo se inativo ou de outra empresa. */}
                  {base?.empregado_responsavel_id &&
                    !empregadosEmpresa.some((e) => e.id === base.empregado_responsavel_id) && (
                      <SelectItem value={base.empregado_responsavel_id}>
                        {responsavelAtual?.nome ?? "Responsável atual"}
                      </SelectItem>
                    )}
                  {empregadosEmpresa.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes" capitalizar="texto"
                name="observacoes"
                defaultValue={base?.observacoes ?? ""}
                placeholder="Histórico ou detalhes do veículo..."
              />
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
