import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  CONDUCOES_OCORRENCIA,
  exportarCsv,
  formatarData,
  MOTIVOS_BAIXA,
  ONUS_BAIXA,
  TIPO_MOVIMENTACAO_LABEL,
  TIPOS_MOVIMENTACAO,
  TIPOS_OCORRENCIA,
  TIPOS_VISTORIA,
  type Modulo,
} from "@/lib/gemape";
import {
  useEmpregados,
  useItens,
  useMovimentacoes,
  useRegistrarMovimentacoesLote,
  useVeiculos,
} from "@/lib/hooks-gemape";

const CHAVES = ["movimentacoes", "itens", "saidas-por-item"];
const NENHUM = "nenhum";

export function MovimentacoesModulo({ modulo }: { modulo: Modulo }) {
  const { empresas, empresaId } = useEmpresa();
  const [aberto, setAberto] = useState(false);
  const [comOcorrencia, setComOcorrencia] = useState(false);
  const [tipoMovimentacao, setTipoMovimentacao] = useState<string>("Saida");
  const [alvoId, setAlvoId] = useState<string>("");
  const { data: movimentacoes = [], isLoading } = useMovimentacoes(modulo, empresaId);
  const { data: itens = [] } = useItens(modulo === "veiculo" ? "ferramenta" : modulo, empresaId);
  const { data: veiculos = [] } = useVeiculos(empresaId);
  const { data: empregados = [] } = useEmpregados(empresaId, true);
  const registrarLote = useRegistrarMovimentacoesLote(CHAVES);

  const ehVeiculo = modulo === "veiculo";
  const nomeEmpregado = (id: string | null) => empregados.find((e) => e.id === id)?.nome ?? "—";
  const descricaoItem = (m: { item_id: string | null; veiculo_id: string | null }) =>
    m.item_id
      ? (itens.find((i) => i.id === m.item_id)?.nome ?? "—")
      : (veiculos.find((v) => v.id === m.veiculo_id)?.placa ?? "—");

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const texto = (k: string) => {
      const v = String(f.get(k) ?? "").trim();
      return v === "" || v === NENHUM ? null : v;
    };
    const quantidadeDigitada = Number(f.get("quantidade") ?? 1);
    const tipo = String(f.get("tipo_movimentacao") ?? "Entrada");
    const alvo = ehVeiculo ? null : texto("alvo_id");

    if (modulo === "epi" && tipo === "Saida" && alvo) {
      const itemSelecionado = itens.find((i) => i.id === alvo);
      if (itemSelecionado && quantidadeDigitada > itemSelecionado.estoque_atual) {
        alert(`A quantidade solicitada (${quantidadeDigitada}) excede o estoque atual disponível (${itemSelecionado.estoque_atual}).`);
        return;
      }
    }

    const valores = {
      modulo,
      item_id: alvo,
      veiculo_id: ehVeiculo ? texto("alvo_id") : null,
      empresa_id: texto("empresa_id"),
      empregado_id: texto("empregado_id"),
      tipo_movimentacao: tipo,
      motivo_baixa: texto("motivo_baixa"),
      quantidade: quantidadeDigitada,
      onus_baixa: texto("onus_baixa"),
      tipo_vistoria: texto("tipo_vistoria"),
      sinalizar_ocorrencia: comOcorrencia,
      tipo_ocorrencia: comOcorrencia ? texto("tipo_ocorrencia") : null,
      conducao_ocorrencia: comOcorrencia ? texto("conducao_ocorrencia") : null,
      data_movimentacao: String(f.get("data_movimentacao") ?? ""),
      origem_local: texto("origem_local"),
      destino_local: texto("destino_local"),
      observacao: texto("observacao")?.slice(0, 500) ?? null,
    };
    registrarLote.mutate([valores], { onSuccess: () => setAberto(false) });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted-foreground">
          Últimas {movimentacoes.length} movimentações registradas.
        </p>
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              exportarCsv(
                `movimentacoes-${modulo}`,
                movimentacoes.map((m) => ({
                  Data: formatarData(m.data_movimentacao),
                  Tipo: TIPO_MOVIMENTACAO_LABEL[m.tipo_movimentacao] ?? m.tipo_movimentacao,
                  Item: descricaoItem(m),
                  Empregado: nomeEmpregado(m.empregado_id),
                  Quantidade: m.quantidade,
                  MotivoBaixa: m.motivo_baixa,
                  Onus: m.onus_baixa,
                  Vistoria: m.tipo_vistoria,
                  Ocorrencia: m.sinalizar_ocorrencia ? "Sim" : "Não",
                  TipoOcorrencia: m.tipo_ocorrencia,
                  Conducao: m.conducao_ocorrencia,
                  Observacao: m.observacao,
                })),
              )
            }
          >
            Exportar CSV
          </Button>
          <Button requiresWrite="operar"
            onClick={() => {
              setComOcorrencia(false);
              setAberto(true);
            }}
          >
            Nova movimentação
          </Button>
        </div>
      </div>

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>{ehVeiculo ? "Veículo" : "Item"}</TableHead>
              <TableHead>Empregado</TableHead>
              <TableHead className="text-right">Qtde</TableHead>
              <TableHead>Motivo da baixa</TableHead>
              <TableHead>Ônus</TableHead>
              <TableHead>Ocorrência</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : movimentacoes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Nenhuma movimentação registrada.
                </TableCell>
              </TableRow>
            ) : (
              movimentacoes.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{formatarData(m.data_movimentacao)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {TIPO_MOVIMENTACAO_LABEL[m.tipo_movimentacao] ?? m.tipo_movimentacao}
                    </Badge>
                  </TableCell>
                  <TableCell>{descricaoItem(m)}</TableCell>
                  <TableCell>{nomeEmpregado(m.empregado_id)}</TableCell>
                  <TableCell className="text-right">{m.quantidade}</TableCell>
                  <TableCell>{m.motivo_baixa ?? "—"}</TableCell>
                  <TableCell>{m.onus_baixa ?? "—"}</TableCell>
                  <TableCell>
                    {m.sinalizar_ocorrencia ? (
                      <Badge variant="destructive">Sim</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
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
            <DialogTitle>Nova movimentação</DialogTitle>
            <DialogDescription>
              Toda movimentação registra a empresa e o empregado envolvidos.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="data_movimentacao">Data</Label>
              <Input
                id="data_movimentacao"
                name="data_movimentacao"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tipo_movimentacao">Tipo de movimentação</Label>
              <Select
                name="tipo_movimentacao"
                defaultValue="Saida"
                onValueChange={setTipoMovimentacao}
              >
                <SelectTrigger id="tipo_movimentacao">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_MOVIMENTACAO.filter((t) => {
                    // Remover Transferência para EPI e Uniforme
                    if (modulo === "epi" || modulo === "uniforme") {
                      return t !== "Transferencia";
                    }
                    return true;
                  }).map((t) => (
                    <SelectItem key={t} value={t}>
                      {TIPO_MOVIMENTACAO_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="alvo_id">{ehVeiculo ? "Veículo" : "Item"}</Label>
              <Select
                name="alvo_id"
                required
                onValueChange={(v) => setAlvoId(v)}
                defaultValue={alvoId}
              >
                <SelectTrigger id="alvo_id">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {(ehVeiculo ? veiculos : itens).map((o) =>
                    "placa" in o ? (
                      <SelectItem key={o.id} value={o.id}>
                        {o.placa} — {o.modelo ?? ""}
                      </SelectItem>
                    ) : (
                      <SelectItem key={o.id} value={o.id}>
                        {o.codigo_sku} — {o.nome}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
              {!ehVeiculo && alvoId && (
                <p className="text-[10px] text-muted-foreground">
                  Estoque atual:{" "}
                  <span className="font-bold text-primary">
                    {itens.find((i) => i.id === alvoId)?.estoque_atual ?? 0}
                  </span>
                </p>
              )}
              {ehVeiculo && alvoId && (
                <p className="text-[10px] text-muted-foreground">
                  KM atual:{" "}
                  <span className="font-bold text-primary">
                    {veiculos
                      .find((v) => v.id === alvoId)
                      ?.quilometragem_atual.toLocaleString("pt-BR") ?? 0}
                  </span>
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="empresa_id">Empresa</Label>
              <Select
                name="empresa_id"
                defaultValue={empresaId !== TODAS ? empresaId : (empresas[0]?.id ?? "")}
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
              <Label htmlFor="empregado_id">Empregado</Label>
              <Select
                name="empregado_id"
                disabled={modulo === "epi" && tipoMovimentacao === "Entrada"}
              >
                <SelectTrigger id="empregado_id">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NENHUM}>Sem empregado</SelectItem>
                  {empregados.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quantidade">Quantidade</Label>
              <Input
                id="quantidade"
                name="quantidade"
                type="number"
                min={1}
                defaultValue={1}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="motivo_baixa">Motivo da baixa</Label>
              <Select
                name="motivo_baixa"
                disabled={modulo === "epi" && tipoMovimentacao === "Entrada"}
              >
                <SelectTrigger id="motivo_baixa">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NENHUM}>Não se aplica</SelectItem>
                  {MOTIVOS_BAIXA.filter((m) => !(modulo === "uniforme" && m === "Quebra")).map(
                    (m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="onus_baixa">Ônus da baixa</Label>
              <Select
                name="onus_baixa"
                disabled={modulo === "epi" && tipoMovimentacao === "Entrada"}
              >
                <SelectTrigger id="onus_baixa">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NENHUM}>Não se aplica</SelectItem>
                  {ONUS_BAIXA.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Vistoria e Ocorrência apenas para Ferramentas e Veículos */}
            {(modulo === "ferramenta" || ehVeiculo) && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="tipo_vistoria">Tipo de vistoria</Label>
                <Select name="tipo_vistoria">
                  <SelectTrigger id="tipo_vistoria">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NENHUM}>Não se aplica</SelectItem>
                    {TIPOS_VISTORIA.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(modulo === "ferramenta" || ehVeiculo) && (
              <>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <Checkbox
                    id="sinalizar_ocorrencia"
                    checked={comOcorrencia}
                    onCheckedChange={(v) => setComOcorrencia(v === true)}
                  />
                  <Label htmlFor="sinalizar_ocorrencia">Sinalizar ocorrência</Label>
                </div>

                {comOcorrencia ? (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="tipo_ocorrencia">Tipo de ocorrência</Label>
                      <Select name="tipo_ocorrencia">
                        <SelectTrigger id="tipo_ocorrencia">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPOS_OCORRENCIA.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="conducao_ocorrencia">Condução da ocorrência</Label>
                      <Select name="conducao_ocorrencia">
                        <SelectTrigger id="conducao_ocorrencia">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {CONDUCOES_OCORRENCIA.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : null}
              </>
            )}

            {tipoMovimentacao === "Transferencia" && <><div><Label htmlFor="origem_local">Origem (setor/obra/custódia)</Label><Input name="origem_local" id="origem_local" required maxLength={200} /></div><div><Label htmlFor="destino_local">Destino (setor/obra/custódia)</Label><Input name="destino_local" id="destino_local" required maxLength={200} /></div></>}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="observacao">Observação</Label>
              <Textarea id="observacao" name="observacao" maxLength={500} rows={3} />
            </div>

            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
              <Button requiresWrite="operar" type="submit" disabled={registrarLote.isPending}>
                Registrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
