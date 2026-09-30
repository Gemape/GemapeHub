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
import { COMBUSTIVEIS_VEICULO, STATUS_VEICULO_LABEL, exportarCsv } from "@/lib/gemape";
import { useExcluir, useSalvar, useVeiculos, type Veiculo } from "@/lib/hooks-gemape";
import { combinaBusca, mesmoNome, proximoCodigo, subcategoriasDa } from "@/lib/parametros-base";
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
const MODO_DEMO = import.meta.env["VITE_DEMO_MODE"] !== "false";

type VeiculoCadastro = Veiculo & { codigo_sku?: string | null; descricao?: string | null };

// Todos os veículos (de todas as empresas): códigos para a sequência e placas repetidas.
async function todosVeiculos(): Promise<{ id: string; placa: string; codigo_sku?: string }[]> {
  const { data, error } = await supabase.from("veiculos").select("*");
  if (error) throw error;
  return (data ?? []) as { id: string; placa: string; codigo_sku?: string }[];
}

// Cadastrar veículo (especificação rev1): código automático, subcategoria, descrição,
// placa, marca, modelo, ano de fabricação, cor e combustível. A empresa continua sendo
// informada porque cada veículo pertence a uma.
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
  const salvar = useSalvar("veiculos", ["veiculos"]);
  const excluir = useExcluir("veiculos", ["veiculos"]);

  const veiculos = (lista as VeiculoCadastro[]).filter((v) =>
    combinaBusca(busca, v.codigo_sku, v.tipo, v.descricao, v.placa, v.marca, v.modelo),
  );
  const regra = parametros.regrasCodigo.find((r) => r.categoriaId === CATEGORIA_VEICULO);
  const subcategorias = subcategoriasDa(parametros, CATEGORIA_VEICULO);
  const subcategoriaAtual = editando?.tipo
    ? (subcategorias.find((s) => mesmoNome(s.nome, editando.tipo ?? ""))?.nome ?? editando.tipo)
    : "";
  // Tipo antigo que não está em Cadastros > Gerais continua aparecendo na edição.
  const subcategoriaAntiga =
    subcategoriaAtual && !subcategorias.some((s) => s.nome === subcategoriaAtual)
      ? subcategoriaAtual
      : null;
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
    setAberto(true);
    if (!MODO_DEMO || !regra) return;
    try {
      setPrevia(
        proximoCodigo(
          regra,
          (await todosVeiculos()).map((v) => v.codigo_sku),
        ),
      );
    } catch {
      setPrevia("");
    }
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const texto = (k: string) => String(f.get(k) ?? "").trim();
    const tipo = texto("tipo");
    const descricao = texto("descricao");
    const placa = normalizarPlaca(texto("placa"));
    const marca = texto("marca");
    const modelo = texto("modelo");
    const anoTexto = texto("ano");
    const ano = anoTexto ? Number(anoTexto) : null;
    const cor = texto("cor");
    const combustivel = texto("combustivel");
    // A empresa não muda na edição.
    const empresa = editando ? (editando.empresa_id ?? "") : empresaSel || empresaPadrao;
    // Placa já salva que não segue o padrão pode continuar como está na edição.
    const placaMantida = editando && placa === normalizarPlaca(editando.placa ?? "");
    const erro = !tipo
      ? "Selecione a subcategoria."
      : MODO_DEMO && !descricao
        ? "Informe a descrição do item."
        : !placa
          ? "Informe a placa."
          : !placaMantida && !placaValida(placa)
            ? "Placa inválida. Use o padrão ABC-1234 ou ABC1D23."
            : !marca
              ? "Informe a marca."
              : !modelo
                ? "Informe o modelo."
                : ano !== null && !anoValido(ano)
                  ? `Ano de fabricação inválido. Use de 1950 a ${new Date().getFullYear() + 1}.`
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
    };
    if (MODO_DEMO) valores["descricao"] = descricao;
    try {
      const todos = await todosVeiculos();
      if (placaRepetida(placa, todos, editando?.id)) {
        toast.error(`A placa ${formatarPlaca(placa)} já está cadastrada.`);
        destravar();
        return;
      }
      if (!editando) {
        valores["empresa_id"] = empresa;
        valores["status"] = "Ativo";
        valores["quilometragem_atual"] = 0;
        // O código é gerado na hora de salvar, para não repetir um já usado.
        if (MODO_DEMO && regra) {
          valores["codigo_sku"] = proximoCodigo(
            regra,
            todos.map((v) => v.codigo_sku),
          );
        }
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
      { onSuccess: () => setAberto(false), onError: destravar },
    );
  }

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
                  Subcategoria: v.tipo ?? "",
                  Descrição: v.descricao ?? "",
                  Placa: formatarPlaca(v.placa),
                  Marca: v.marca,
                  Modelo: v.modelo,
                  "Ano de fabricação": v.ano ?? "",
                  Cor: v.cor ?? "",
                  Combustível: v.combustivel ?? "",
                  Empresa: nomeEmpresa(v.empresa_id),
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
              <TableHead>Situação</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : veiculos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground">
                  Nenhum veículo cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              veiculos.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono text-xs">{v.codigo_sku || "—"}</TableCell>
                  <TableCell>{v.tipo || "—"}</TableCell>
                  <TableCell className="font-medium">{v.descricao || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs">
                    {formatarPlaca(v.placa)}
                  </TableCell>
                  <TableCell>{[v.marca, v.modelo].filter(Boolean).join(" ") || "—"}</TableCell>
                  <TableCell>{v.ano ?? "—"}</TableCell>
                  <TableCell>{v.cor || "—"}</TableCell>
                  <TableCell>{v.combustivel || "—"}</TableCell>
                  <TableCell>{nomeEmpresa(v.empresa_id)}</TableCell>
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
                ? "O código do produto e a empresa não mudam."
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
                  editando
                    ? editando.codigo_sku || "—"
                    : MODO_DEMO
                      ? previa || "Gerado ao salvar"
                      : "Disponível na Fase 2"
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Subcategoria</Label>
              <Select name="tipo" defaultValue={subcategoriaAtual}>
                <SelectTrigger id="tipo" aria-required>
                  <SelectValue placeholder="Selecione a subcategoria" />
                </SelectTrigger>
                <SelectContent>
                  {subcategorias.map((s) => (
                    <SelectItem key={s.id} value={s.nome}>
                      {s.nome}
                    </SelectItem>
                  ))}
                  {subcategoriaAntiga && (
                    <SelectItem value={subcategoriaAntiga}>
                      {subcategoriaAntiga} (fora de Cadastros &gt; Gerais)
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
              <Input id="marca" name="marca" aria-required defaultValue={editando?.marca ?? ""} />
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
