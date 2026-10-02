import { useRef, useState } from "react";
import { capitalizarCadastro } from "@/lib/formatacao-cadastral";
import { avisarEnderecamentoObrigatorio } from "@/lib/aviso-enderecamento";
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
import { combinaBusca, estaAtivo, paraSelecao, proximoCodigo } from "@/lib/parametros-base";
import {
  nomeSubcategoria,
  resolverSubcategoria,
  SUBCATEGORIA_LEGADA,
  subcategoriaDaSelecao,
  subcategoriasParaSelecao,
  valorSelecaoSubcategoria,
} from "@/lib/subcategoria-referencia";
import { useParametrosBase } from "@/lib/use-parametros-base";
import {
  anoValido,
  formatarPlaca,
  normalizarPlaca,
  placaRepetida,
  placaValida,
} from "@/lib/veiculos";

// Categoria Veículos de Cadastros > Gerais (id fixo; o nome pode ser renomeado).
const CATEGORIA_VEICULO = "cat-veiculos";

// Código e descrição ainda não existem na tabela real de veículos: nesta fase só são
// gravados no modo demonstração. As colunas entram na Fase 2.
const NENHUM = "nenhum";

const MODO_DEMO = import.meta.env["VITE_DEMO_MODE"] !== "false";

type VeiculoCadastro = Veiculo & { codigo_sku?: string | null; descricao?: string | null };

// Todos os veículos (de todas as empresas): códigos para a sequência e placas repetidas.
async function todosVeiculos(): Promise<{ id: string; placa: string; codigo_sku?: string }[]> {
  const { data, error } = await supabase.from("veiculos").select("*");
  if (error) throw error;
  return (data ?? []) as { id: string; placa: string; codigo_sku?: string }[];
}

// Cadastrar veículo (especificação rev1 + decisões especiais 9 e 10): código automático,
// subcategoria, descrição, placa, marca, modelo, ano de fabricação, cor, combustível,
// empresa, RENAVAM, quilometragem, situação, responsável e observações.
export function VeiculosCadastroModulo() {
  const { empresas, empresaId } = useEmpresa();
  const parametros = useParametrosBase();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<VeiculoCadastro | null>(null);
  const [previa, setPrevia] = useState("");
  const [empresaSel, setEmpresaSel] = useState("");
  // O ref bloqueia na hora; o estado só serve para desabilitar o botão. Depois de salvo,
  // o formulário fica travado até ser aberto de novo (o diálogo ainda está fechando).
  const salvando = useRef(false);
  const [gerando, setGerando] = useState(false);
  const { data: lista = [], isLoading } = useVeiculos(empresaId);
  const empresaForm = empresaSel || editando?.empresa_id || "";
  // Responsável: empregados ativos da empresa do veículo; os nomes da lista vêm de todos.
  const { data: empregadosEmpresa = [] } = useEmpregados(empresaForm || TODAS, true);
  const { data: empregados = [] } = useEmpregados(TODAS);
  const responsavelAtual = editando?.empregado_responsavel_id
    ? empregados.find((e) => e.id === editando.empregado_responsavel_id)
    : undefined;
  // Evita que a prévia do código de um "Novo" atrasado apareça numa edição aberta depois.
  const pedidoPrevia = useRef(0);
  const salvar = useSalvar("veiculos", ["veiculos"]);
  const excluir = useExcluir("veiculos", ["veiculos"]);

  // A subcategoria mostrada é a de Gerais, pela referência gravada (nome sempre atual).
  const subcategoriaDe = (v: VeiculoCadastro) => nomeSubcategoria(parametros, CATEGORIA_VEICULO, v);
  const veiculos = (lista as VeiculoCadastro[]).filter((v) =>
    combinaBusca(
      busca.replace(/-/g, ""),
      v.codigo_sku,
      subcategoriaDe(v),
      v.descricao,
      normalizarPlaca(v.placa ?? ""),
      v.marca,
      v.modelo,
    ),
  );
  const regra = parametros.regrasCodigo.find((r) => r.categoriaId === CATEGORIA_VEICULO);
  // Tipo antigo que não está em Cadastros > Gerais continua aparecendo na edição.
  const subcategoriaAtual = editando
    ? resolverSubcategoria(parametros, CATEGORIA_VEICULO, editando)
    : null;
  // Marca de Cadastros > Gerais; a marca antiga digitada continua aparecendo na edição.
  const marcaInicial = selecaoInicialMarca(parametros.marcasVeiculo, editando?.marca);
  // Parâmetro desativado em Gerais sai da escolha; o que o cadastro já usa continua na edição.
  const subcategorias = subcategoriasParaSelecao(parametros, CATEGORIA_VEICULO, subcategoriaAtual);
  const marcas = paraSelecao(
    parametros,
    parametros.marcasVeiculo,
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
    if (MODO_DEMO && !regra) {
      toast.error(
        "Cadastre antes a regra do código de veículo em Cadastros > Gerais > Código do Produto.",
      );
      return;
    }
    destravar();
    setEditando(null);
    setEmpresaSel("");
    setPrevia("");
    const pedido = ++pedidoPrevia.current;
    setAberto(true);
    if (!MODO_DEMO || !regra) return;
    try {
      const codigo = proximoCodigo(
        regra,
        (await todosVeiculos()).map((v) => v.codigo_sku),
      );
      if (pedido === pedidoPrevia.current) setPrevia(codigo);
    } catch {
      setPrevia("");
    }
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
    const descricao = capitalizarCadastro(texto("descricao"));
    const placaDigitada = normalizarPlaca(texto("placa"));
    let marca = "";
    let erroMarca: string | null = null;
    try {
      marca = marcaDaSelecao(texto("marca"), marcas, editando?.marca, {
        obrigatoria: true,
      });
    } catch (falha) {
      erroMarca = falha instanceof Error ? falha.message : "Marca inválida.";
    }
    const modelo = capitalizarCadastro(texto("modelo"));
    const anoTexto = texto("ano");
    const ano = anoTexto ? Number(anoTexto) : null;
    const cor = capitalizarCadastro(texto("cor"));
    const kmTexto = texto("quilometragem_atual");
    const km = kmTexto ? Number(kmTexto) : 0;
    const status = texto("status") || "Ativo";
    const responsavel = texto("empregado_responsavel_id");
    const combustivel = texto("combustivel");
    const empresa = empresaSel || editando?.empresa_id || empresaPadrao;
    // Placa já salva que não segue o padrão pode continuar como está na edição.
    const placaMantida = !!editando && placaDigitada === normalizarPlaca(editando.placa ?? "");
    // Grava no mesmo formato das placas antigas (ABC-1234 ou ABC1D23); a mantida fica igual.
    const placa = placaMantida && editando ? editando.placa : formatarPlaca(placaDigitada);
    const erro = erroSubcategoria
      ? erroSubcategoria
      : MODO_DEMO && !descricao
        ? "Informe a descrição do item."
        : !placaDigitada
          ? "Informe a placa."
          : !placaMantida && !placaValida(placaDigitada)
            ? "Placa inválida. Use o padrão ABC-1234 ou ABC1D23."
            : erroMarca
              ? erroMarca
              : !modelo
                ? "Informe o modelo."
                : ano !== null && !anoValido(ano)
                  ? `Ano de fabricação inválido. Use de 1950 a ${new Date().getFullYear() + 1}.`
                  : !Number.isInteger(km) || km < 0
                    ? "Quilometragem inválida."
                    : !empresa
                      ? "Selecione a empresa."
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
      observacoes: texto("observacoes") || null,
    };
    if (MODO_DEMO) {
      valores["descricao"] = descricao;
      // A referência só existe no modo demonstração; no banco real a coluna entra na Fase 2.
      valores["subcategoria_id"] = subcategoria?.id ?? null;
    }
    try {
      const todos = await todosVeiculos();
      if (placaRepetida(placa, todos, editando?.id)) {
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
                  Descrição: v.descricao ?? "",
                  Placa: formatarPlaca(v.placa),
                  Marca: v.marca,
                  Modelo: v.modelo,
                  "Ano de fabricação": v.ano ?? "",
                  Cor: v.cor ?? "",
                  Combustível: v.combustivel ?? "",
                  Empresa: nomeEmpresa(v.empresa_id),
                  RENAVAM: v.renavam ?? "",
                  Km: v.quilometragem_atual ?? 0,
                  Situação: STATUS_VEICULO_LABEL[v.status] ?? v.status,
                  Responsável: nomeEmpregado(v.empregado_responsavel_id),
                  Observações: v.observacoes ?? "",
                })),
              )
            }
          >
            Exportar CSV
          </Button>
          <Button requiresWrite onClick={abrirNovo}>
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
                  <TableCell className="font-medium">{v.descricao || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs">
                    {formatarPlaca(v.placa)}
                  </TableCell>
                  <TableCell>{[v.marca, v.modelo].filter(Boolean).join(" ") || "—"}</TableCell>
                  <TableCell>{v.ano ?? "—"}</TableCell>
                  <TableCell>{v.cor || "—"}</TableCell>
                  <TableCell>{v.combustivel || "—"}</TableCell>
                  <TableCell>{nomeEmpresa(v.empresa_id)}</TableCell>
                  <TableCell className="text-right">
                    {(v.quilometragem_atual ?? 0).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell>{nomeEmpregado(v.empregado_responsavel_id)}</TableCell>
                  <TableCell>
                    <Badge variant={v.status === "Ativo" ? "secondary" : "outline"}>
                      {STATUS_VEICULO_LABEL[v.status] ?? v.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <Button
                      requiresWrite
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        destravar();
                        pedidoPrevia.current++;
                        setEmpresaSel(v.empresa_id ?? "");
                        setPrevia("");
                        setEditando(v);
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
                        if (confirm(`Excluir ${formatarPlaca(v.placa)}?`)) excluir.mutate(v.id);
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
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
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Subcategoria</Label>
              <Select name="tipo" defaultValue={valorSelecaoSubcategoria(subcategoriaAtual)}>
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
            {MODO_DEMO && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="descricao">Descrição do item</Label>
                <Textarea
                  id="descricao"
                  name="descricao"
                  rows={2}
                  aria-required
                  defaultValue={editando?.descricao ?? ""}
                  placeholder="Ex.: caminhonete S10"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="placa">Placa</Label>
              <Input
                id="placa"
                name="placa"
                aria-required
                defaultValue={editando ? formatarPlaca(editando.placa) : ""}
                placeholder="ABC-1234 ou ABC1D23"
                className="uppercase"
              />
            </div>
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
                id="modelo"
                name="modelo"
                aria-required
                defaultValue={editando?.modelo ?? ""}
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
                defaultValue={editando?.ano ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cor">Cor</Label>
              <Input id="cor" name="cor" defaultValue={editando?.cor ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="combustivel">Combustível</Label>
              <Select name="combustivel" defaultValue={editando?.combustivel ?? ""}>
                <SelectTrigger id="combustivel">
                  <SelectValue placeholder="Selecione o combustível" />
                </SelectTrigger>
                <SelectContent>
                  {COMBUSTIVEIS_VEICULO.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                  {editando?.combustivel &&
                    !(COMBUSTIVEIS_VEICULO as readonly string[]).includes(editando.combustivel) && (
                      <SelectItem value={editando.combustivel}>{editando.combustivel}</SelectItem>
                    )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="empresa_id">Empresa</Label>
              <Select
                value={empresaSel || editando?.empresa_id || empresaPadrao}
                onValueChange={setEmpresaSel}
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
            <div className="space-y-1.5">
              <Label htmlFor="renavam">RENAVAM</Label>
              <Input id="renavam" name="renavam" defaultValue={editando?.renavam ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quilometragem_atual">Quilometragem atual</Label>
              <Input
                id="quilometragem_atual"
                name="quilometragem_atual"
                type="number"
                min={0}
                defaultValue={editando?.quilometragem_atual ?? 0}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Situação</Label>
              <Select name="status" defaultValue={editando?.status ?? "Ativo"}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_VEICULO.map((st) => (
                    <SelectItem key={st} value={st}>
                      {STATUS_VEICULO_LABEL[st] ?? st}
                    </SelectItem>
                  ))}
                  {editando?.status &&
                    !(STATUS_VEICULO as readonly string[]).includes(editando.status) && (
                      <SelectItem value={editando.status}>{editando.status}</SelectItem>
                    )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="empregado_responsavel_id">Empregado responsável</Label>
              <Select
                name="empregado_responsavel_id"
                defaultValue={editando?.empregado_responsavel_id ?? NENHUM}
              >
                <SelectTrigger id="empregado_responsavel_id">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NENHUM}>Sem responsável</SelectItem>
                  {/* O responsável atual continua na lista mesmo se inativo ou de outra empresa. */}
                  {editando?.empregado_responsavel_id &&
                    !empregadosEmpresa.some((e) => e.id === editando.empregado_responsavel_id) && (
                      <SelectItem value={editando.empregado_responsavel_id}>
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
                id="observacoes"
                name="observacoes"
                defaultValue={editando?.observacoes ?? ""}
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
