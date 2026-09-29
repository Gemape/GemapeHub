import { useState } from "react";
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
import { opcoesSubcategoria } from "@/lib/categorias-produto";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { useSubcategorias } from "@/lib/use-subcategorias";
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

const NENHUM = "nenhum";

export function VeiculosCadastroModulo() {
  const { empresas, empresaId } = useEmpresa();
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Veiculo | null>(null);
  const tiposVeiculo = useSubcategorias("veiculo");
  const { data: veiculos = [], isLoading } = useVeiculos(empresaId);
  const { data: empregados = [] } = useEmpregados(empresaId, true);
  const salvar = useSalvar("veiculos", ["veiculos"]);
  const excluir = useExcluir("veiculos", ["veiculos"]);

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const texto = (k: string) => {
      const v = String(f.get(k) ?? "").trim();
      return v === "" || v === NENHUM ? null : v;
    };
    const valores = {
      empresa_id: texto("empresa_id"),
      placa: String(f.get("placa") ?? "")
        .trim()
        .toUpperCase(),
      marca: String(f.get("marca") ?? "").trim(),
      modelo: String(f.get("modelo") ?? "").trim(),
      ano: f.get("ano") ? Number(f.get("ano")) : null,
      cor: texto("cor"),
      tipo: texto("tipo"),
      quilometragem_atual: Number(f.get("quilometragem_atual") ?? 0),
      combustivel: texto("combustivel"),
      renavam: texto("renavam"),
      status: String(f.get("status") ?? "Ativo"),
      observacoes: texto("observacoes"),
      empregado_responsavel_id: texto("empregado_responsavel_id"),
    };
    salvar.mutate(
      { ...(editando ? { id: editando.id } : {}), valores },
      { onSuccess: () => setAberto(false) },
    );
  }

  const nomeEmpresa = (id: string | null) =>
    empresas.find((e) => e.id === id)?.nome_fantasia ?? "—";
  const nomeEmpregado = (id: string | null) => empregados.find((e) => e.id === id)?.nome ?? "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="outline"
          onClick={() =>
            exportarCsv(
              "veiculos",
              veiculos.map((v) => ({
                Placa: v.placa,
                Empresa: nomeEmpresa(v.empresa_id),
                Marca: v.marca,
                Modelo: v.modelo,
                Ano: v.ano,
                Renavam: v.renavam,
                Cor: v.cor,
                Km: v.quilometragem_atual,
                Situacao: STATUS_VEICULO_LABEL[v.status] ?? v.status,
                Responsavel: nomeEmpregado(v.empregado_responsavel_id),
              })),
            )
          }
        >
          Exportar CSV
        </Button>
        <Button requiresWrite
          onClick={() => {
            setEditando(null);
            setAberto(true);
          }}
        >
          Novo veículo
        </Button>
      </div>

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Placa</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Marca / modelo</TableHead>
              <TableHead>Ano</TableHead>
              <TableHead>RENAVAM</TableHead>
              <TableHead className="text-right">Km</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : veiculos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  Nenhum veículo cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              veiculos.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.placa}</TableCell>
                  <TableCell>{nomeEmpresa(v.empresa_id)}</TableCell>
                  <TableCell>{[v.marca, v.modelo].filter(Boolean).join(" ") || "—"}</TableCell>
                  <TableCell>{v.ano ?? "—"}</TableCell>
                  <TableCell>{v.renavam ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {(v.quilometragem_atual ?? 0).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell>{nomeEmpregado(v.empregado_responsavel_id)}</TableCell>
                  <TableCell>
                    <Badge variant={v.status === "Ativo" ? "secondary" : "outline"}>
                      {STATUS_VEICULO_LABEL[v.status] ?? v.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[10px] text-muted-foreground">
                    {new Date(v.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button requiresWrite
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditando(v);
                        setAberto(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Button requiresWrite
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Excluir ${v.placa}?`)) excluir.mutate(v.id);
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
            <DialogTitle>{editando ? "Editar veículo" : "Novo veículo"}</DialogTitle>
            <DialogDescription>Dados do veículo e responsável.</DialogDescription>
          </DialogHeader>
          <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="placa">Placa</Label>
              <Input
                id="placa"
                name="placa"
                required
                defaultValue={editando?.placa ?? ""}
                placeholder="ABC-1234"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="empresa_id">Empresa</Label>
              <Select
                name="empresa_id"
                required
                defaultValue={
                  editando?.empresa_id ??
                  (empresaId !== TODAS ? empresaId : (empresas[0]?.id ?? ""))
                }
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
              <Label htmlFor="marca">Marca</Label>
              <Input id="marca" name="marca" required defaultValue={editando?.marca ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="modelo">Modelo</Label>
              <Input id="modelo" name="modelo" required defaultValue={editando?.modelo ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ano">Ano de fabricação</Label>
              <Input
                id="ano"
                name="ano"
                type="number"
                min={1950}
                max={2100}
                defaultValue={editando?.ano ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cor">Cor</Label>
              <Input id="cor" name="cor" defaultValue={editando?.cor ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Tipo de Veículo</Label>
              <Select name="tipo" defaultValue={editando?.tipo ?? ""}>
                <SelectTrigger id="tipo">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {opcoesSubcategoria(tiposVeiculo, editando?.tipo).map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Select name="status" required defaultValue={editando?.status ?? "Ativo"}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_VEICULO.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
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
                  {empregados.map((e) => (
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
              <Button requiresWrite type="submit" disabled={salvar.isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
