import { BarraDeFiltros } from "@/components/layout/BarraDeFiltros";
import { useState } from "react";
import { EstadoVazio } from "@/components/EstadoVazio";
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
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { exportarCsv, formatarData, type Modulo } from "@/lib/gemape";
import { capitalizarNomePessoa, capitalizarTexto } from "@/lib/formatacao-cadastral";
import { hojeLocal } from "@/lib/empregados";
import { soEmpregadosDeEpi } from "@/lib/empregados-epi";
import { soEmpregadosDeUniforme } from "@/lib/empregados-uniforme";
import {
  useEmpregados,
  useExcluir,
  useItens,
  useOcorrencias,
  useSalvar,
  useVeiculos,
  type Ocorrencia,
} from "@/lib/hooks-gemape";

const CHAVES = ["ocorrencias"];
const NENHUM = "nenhum";

export function OcorrenciasModulo({ modulo }: { modulo: Modulo }) {
  const { empresaId } = useEmpresa();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Ocorrencia | null>(null);
  const tipoOcorrencia = { epi: "EPI", uniforme: "Uniforme", ferramenta: "Ferramenta", veiculo: "Veículo" }[modulo];

  const { data: todasAsOcorrencias = [], isLoading } = useOcorrencias(busca, modulo);
  // Busca por período (decisão 393): da data de início à data de fim, as duas inclusas; só uma delas já filtra.
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const periodoErrado = !!inicio && !!fim && inicio > fim;
  const ocorrencias = periodoErrado ? [] : todasAsOcorrencias.filter((o) => (!inicio || o.data >= inicio) && (!fim || o.data <= fim));
  const { data: empregados = [] } = useEmpregados(TODAS, true);
  // Lista completa para os nomes e para manter o empregado já vinculado, mesmo demitido.
  const { data: todosEmpregados = [] } = useEmpregados(TODAS);

  const { data: itens = [] } = useItens(modulo === "veiculo" ? "ferramenta" : modulo, TODAS);
  const { data: veiculos = [] } = useVeiculos(TODAS);

  const salvar = useSalvar("ocorrencias", CHAVES);
  const excluir = useExcluir("ocorrencias", CHAVES);

  const nomeEmpregado = (id: string | null) =>
    todosEmpregados.find((e) => e.id === id)?.nome ?? "—";
  // EPI e Uniformes só oferecem os empregados habilitados (decisões 357 e 364); Ferramentas e Veículos oferecem todos os ativos.
  const elegiveis =
    modulo === "epi" ? soEmpregadosDeEpi(empregados) : modulo === "uniforme" ? soEmpregadosDeUniforme(empregados) : empregados;
  // O empregado já vinculado à ocorrência que se edita continua na lista, mesmo inativo ou fora dos habilitados.
  const empregadoFora = editando?.empregado_id
    ? todosEmpregados.find(
        (e) => e.id === editando.empregado_id && !elegiveis.some((a) => a.id === e.id),
      )
    : undefined;

  const descricaoAlvo = (o: Ocorrencia) => {
    if (o.veiculo_id) return veiculos.find((v) => v.id === o.veiculo_id)?.placa || "—";
    if (o.item_id) return itens.find((i) => i.id === o.item_id)?.nome ?? "—";
    return "—";
  };

  function abrirNovo() {
    setEditando(null);
    setAberto(true);
  }

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);

    const texto = (k: string) => {
      const v = String(f.get(k) ?? "").trim();
      return v === "" || v === NENHUM ? null : v;
    };

    const valores = {
      data: String(f.get("data") ?? hojeLocal()),
      hora: String(f.get("hora") ?? new Date().toLocaleTimeString("pt-BR", { hour12: false })),
      responsavel_registro: capitalizarNomePessoa(String(f.get("responsavel_registro") ?? "").trim()),
      descricao_ocorrencia: capitalizarTexto(String(f.get("descricao_ocorrencia") ?? "").trim()),
      tipo_ocorrencia: tipoOcorrencia,
      empregado_id: texto("empregado_id"),
      item_id: modulo !== "veiculo" ? texto("alvo_id") : null,
      veiculo_id: modulo === "veiculo" ? texto("alvo_id") : null,
    };

    salvar.mutate(
      { ...(editando ? { id: editando.id } : {}), valores },
      { onSuccess: () => setAberto(false) },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <BarraDeFiltros>
          <Input
            placeholder="Buscar por descrição ou responsável"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <div className="space-y-1">
            <Label htmlFor="oc-inicio">Início</Label>
            <Input id="oc-inicio" type="date" value={inicio} max={fim || undefined} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="oc-fim">Fim</Label>
            <Input id="oc-fim" type="date" value={fim} min={inicio || undefined} onChange={(e) => setFim(e.target.value)} />
          </div>
          {(inicio || fim) && (
            <Button type="button" variant="ghost" onClick={() => { setInicio(""); setFim(""); }}>
              Limpar período
            </Button>
          )}
        </BarraDeFiltros>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() =>
              exportarCsv(
                "ocorrencias",
                ocorrencias.map((o) => ({
                  Data: formatarData(o.data),
                  Hora: o.hora,
                  Responsavel: o.responsavel_registro,
                  Descricao: o.descricao_ocorrencia,
                  Modulo: o.tipo_ocorrencia,
                  Alvo: o.veiculo_id
                    ? veiculos.find((v) => v.id === o.veiculo_id)?.placa || "—"
                    : itens.find((i) => i.id === o.item_id)?.nome,
                  Empregado: nomeEmpregado(o.empregado_id),
                })),
              )
            }
          >
            Exportar CSV
          </Button>
          <Button
            onClick={() => {
              abrirNovo();
            }}
          >
            Nova Ocorrência
          </Button>
        </div>
      </div>
      {periodoErrado && <p role="alert" className="text-sm text-destructive">A data de início não pode ser depois da data de fim.</p>}
      {(inicio || fim) && !periodoErrado && (
        <p role="status" className="text-sm text-muted-foreground">{ocorrencias.length} de {todasAsOcorrencias.length} ocorrências no período.</p>
      )}

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Hora</TableHead>
              <TableHead>Empregado</TableHead>
              <TableHead>Módulo</TableHead>
              <TableHead>{modulo === "veiculo" ? "Veículo" : "Item"}</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : ocorrencias.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  {inicio || fim
                    ? <EstadoVazio titulo="Nenhuma ocorrência no período." dica="Mude as datas ou limpe o período para ver as demais." acao="Limpar período" aoAcionar={() => { setInicio(""); setFim(""); }} />
                    : <EstadoVazio titulo="Nenhuma ocorrência registrada." dica="Registre a primeira para começar o acompanhamento." acao="+ Registrar Primeira Ocorrência" aoAcionar={abrirNovo} />}
                </TableCell>
              </TableRow>
            ) : (
              ocorrencias.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>{formatarData(o.data)}</TableCell>
                  <TableCell>{o.hora.slice(0, 5)}</TableCell>
                  <TableCell>{nomeEmpregado(o.empregado_id)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{o.tipo_ocorrencia}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{descricaoAlvo(o)}</TableCell>
                  <TableCell>{o.responsavel_registro}</TableCell>
                  <TableCell className="max-w-xs truncate">{o.descricao_ocorrencia}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button requiresWrite
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditando(o);
                        setAberto(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Button requiresWrite
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("Excluir esta ocorrência?")) excluir.mutate(o.id);
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
              {editando ? "Editar Ocorrência" : "Registrar Nova Ocorrência"}
            </DialogTitle>
            <DialogDescription>Preencha os detalhes da ocorrência patrimonial.</DialogDescription>
          </DialogHeader>
          <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="data">Data</Label>
              <Input
                id="data"
                name="data"
                type="date"
                required
                defaultValue={editando?.data ?? hojeLocal()}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hora">Hora</Label>
              <Input
                id="hora"
                name="hora"
                type="time"
                required
                defaultValue={
                  editando?.hora.slice(0, 5) ??
                  new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="empregado_id">Empregado</Label>
              <Select name="empregado_id" defaultValue={editando?.empregado_id ?? ""}>
                <SelectTrigger id="empregado_id">
                  <SelectValue placeholder="Selecione o empregado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NENHUM}>Sem empregado específico</SelectItem>
                  {empregadoFora && (
                    <SelectItem value={empregadoFora.id}>{empregadoFora.nome} ({empregados.some((a) => a.id === empregadoFora.id) ? "não habilitado" : "inativo"})</SelectItem>
                  )}
                  {elegiveis.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Módulo</Label>
              <Input value={tipoOcorrencia} readOnly />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="alvo_id">{modulo === "veiculo" ? "Veículo" : "Item"}</Label>
              <Select name="alvo_id" defaultValue={editando?.item_id || editando?.veiculo_id || ""}>
                <SelectTrigger id="alvo_id">
                  <SelectValue placeholder="Selecione o alvo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NENHUM}>Nenhum selecionado</SelectItem>
                  {(modulo === "veiculo" ? veiculos : itens).map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {"placa" in o
                        ? [o.placa, o.modelo].filter(Boolean).join(" — ") || "—"
                        : `${o.codigo_sku} — ${o.nome}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="responsavel_registro">Responsável pelo registro</Label>
              <Input
                id="responsavel_registro"
                name="responsavel_registro"
                capitalizar="nome"
                required
                defaultValue={editando?.responsavel_registro ?? ""}
                placeholder="Nome de quem está registrando"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="descricao_ocorrencia">Descrição da ocorrência</Label>
              <Textarea
                id="descricao_ocorrencia"
                name="descricao_ocorrencia"
                capitalizar="texto"
                required
                rows={4}
                defaultValue={editando?.descricao_ocorrencia ?? ""}
              />
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
              <Button requiresWrite="operar" type="submit" disabled={salvar.isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
