import { useState } from "react";
import { Trash2 } from "lucide-react";
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
import { TODAS } from "@/lib/empresa-context";
import { MOTIVOS_BAIXA, ONUS_BAIXA } from "@/lib/gemape";
import { capitalizarNomePessoa, capitalizarTexto } from "@/lib/formatacao-cadastral";
import { hojeLocal } from "@/lib/empregados";
import { MODO_DEMO } from "@/lib/modo-demo";
import {
  ferramentasComEmpregadoRemovidas,
  validarBaixaDaCaixa,
  validarFerramentasDaCaixa,
} from "@/lib/controle-caixa";
import {
  useEmpregados,
  useItens,
  useRegistrarMovimentacoesLote,
  useSalvar,
  useSalvarCaixa,
  type CaixaFerramenta,
  type CaixaFerramentaItem,
  type Item,
} from "@/lib/hooks-gemape";

const SEM_EMPREGADO = "sem-empregado";
// "Fornecimento ao Empregado" é entrega, não baixa.
const MOTIVOS_DA_BAIXA = MOTIVOS_BAIXA.filter((m) => m !== "Fornecimento ao Empregado");

export interface LinhaCaixa {
  ferramenta: Item;
  quantidade: number;
  comEmpregado: number;
  disponivel: number;
}

type Comum = { caixa: CaixaFerramenta; aberto: boolean; aoFechar: () => void };
// Caixa habilitada ainda sem cadastro: o primeiro vínculo de ferramentas é que cria a caixa.
export type CaixaNova = Pick<CaixaFerramenta, "codigo" | "codigo_num" | "empresa_id" | "nome" | "descricao" | "localizacao" | "status"> & { id?: undefined };

/** Inclui, tira e muda a quantidade das ferramentas da caixa (grava o conjunto inteiro de uma vez). */
export function DialogFerramentasDaCaixa({
  caixa,
  aberto,
  aoFechar,
  itensAtuais,
  comEmpregado,
}: Omit<Comum, "caixa"> & {
  caixa: CaixaFerramenta | CaixaNova;
  itensAtuais: CaixaFerramentaItem[];
  comEmpregado: (ferramentaId: string) => number;
}) {
  const { data: todas = [] } = useItens("ferramenta", TODAS);
  const salvar = useSalvarCaixa();
  const [linhas, setLinhas] = useState(() =>
    itensAtuais.map((i) => ({ ferramenta_id: i.ferramenta_id, quantidade: i.quantidade, observacao: i.observacao ?? "" })),
  );
  const [escolhida, setEscolhida] = useState("");
  const ferramenta = (id: string) => todas.find((t) => t.id === id) ?? itensAtuais.find((i) => i.ferramenta_id === id)?.ferramenta;
  const nome = (id: string) => ferramenta(id)?.nome ?? "Ferramenta";
  const disponiveis = todas.filter((t) => t.status === "Ativo" && !linhas.some((l) => l.ferramenta_id === t.id));

  function adicionar(id: string) {
    setLinhas((atual) => [...atual, { ferramenta_id: id, quantidade: 1, observacao: "" }]);
    setEscolhida("");
  }

  function gravar() {
    const erro =
      validarFerramentasDaCaixa(linhas, comEmpregado, nome) ??
      ferramentasComEmpregadoRemovidas(itensAtuais, linhas, comEmpregado, nome);
    if (erro) {
      alert(erro);
      return;
    }
    salvar.mutate(
      {
        ...(caixa.id ? { id: caixa.id } : {}),
        valores: {
          codigo: caixa.codigo,
          codigo_num: caixa.codigo_num,
          empresa_id: caixa.empresa_id,
          nome: caixa.nome,
          descricao: caixa.descricao,
          localizacao: caixa.localizacao,
          status: caixa.status,
        },
        itens: linhas,
      },
      { onSuccess: aoFechar },
    );
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Vincular ferramentas à caixa {caixa.codigo}</DialogTitle>
          <DialogDescription>Escolha as ferramentas que ficam nesta caixa e a quantidade de cada uma. Tudo é salvo de uma vez.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="incluir-ferramenta">Incluir ferramenta</Label>
          <Select value={escolhida} onValueChange={adicionar}>
            <SelectTrigger id="incluir-ferramenta">
              <SelectValue placeholder={disponiveis.length ? "Escolha a ferramenta" : "Nenhuma ferramenta ativa para incluir"} />
            </SelectTrigger>
            <SelectContent>
              {disponiveis.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.codigo_sku} — {t.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ferramenta</TableHead>
              <TableHead className="w-28">Quantidade</TableHead>
              <TableHead className="w-28">Com empregado</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Caixa sem ferramentas.
                </TableCell>
              </TableRow>
            ) : (
              linhas.map((l) => (
                <TableRow key={l.ferramenta_id}>
                  <TableCell>
                    <span className="font-mono text-xs">{ferramenta(l.ferramenta_id)?.codigo_sku}</span> {nome(l.ferramenta_id)}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      aria-label={`Quantidade de ${nome(l.ferramenta_id)}`}
                      value={Number.isNaN(l.quantidade) ? "" : l.quantidade}
                      onChange={(e) =>
                        setLinhas((atual) =>
                          atual.map((x) => (x.ferramenta_id === l.ferramenta_id ? { ...x, quantidade: e.target.valueAsNumber } : x)),
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>{comEmpregado(l.ferramenta_id)}</TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Tirar ${nome(l.ferramenta_id)} da caixa`}
                      onClick={() => setLinhas((atual) => atual.filter((x) => x.ferramenta_id !== l.ferramenta_id))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button requiresWrite="operar" type="button" disabled={salvar.isPending} onClick={gravar}>
            Salvar vínculo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Baixa de uma ferramenta da caixa (perda, quebra, desgaste...); grava a caixa na movimentação. */
export function DialogBaixaCaixa({ caixa, aberto, aoFechar, linhas }: Comum & { linhas: LinhaCaixa[] }) {
  const { data: empregados = [] } = useEmpregados(TODAS, true);
  const registrar = useRegistrarMovimentacoesLote(["movimentacoes", "ferramentas"]);
  const [ferramentaId, setFerramentaId] = useState(linhas[0]?.ferramenta.id ?? "");
  const [quantidade, setQuantidade] = useState(1);
  const [motivo, setMotivo] = useState("");
  const [onus, setOnus] = useState<string>(ONUS_BAIXA[0]);
  const [data, setData] = useState(hojeLocal());
  const [empregadoId, setEmpregadoId] = useState(SEM_EMPREGADO);
  const [observacao, setObservacao] = useState("");
  const linha = linhas.find((l) => l.ferramenta.id === ferramentaId);

  function gravar() {
    const empregado = empregadoId === SEM_EMPREGADO ? null : empregadoId;
    const erro = validarBaixaDaCaixa({
      ferramentaId,
      quantidade,
      motivo,
      data,
      disponivel: linha?.disponivel ?? 0,
      comEmpregado: linha?.comEmpregado ?? 0,
      empregadoId: empregado,
    });
    if (erro || !linha) {
      alert(erro ?? "Escolha a ferramenta.");
      return;
    }
    registrar.mutate(
      [
        {
          modulo: "ferramenta",
          item_id: ferramentaId,
          veiculo_id: null,
          empresa_id: linha.ferramenta.empresa_id,
          empregado_id: empregado,
          tipo_movimentacao: "Saida",
          motivo_baixa: motivo,
          quantidade,
          onus_baixa: onus,
          tipo_vistoria: null,
          sinalizar_ocorrencia: false,
          tipo_ocorrencia: null,
          conducao_ocorrencia: null,
          data_movimentacao: data,
          origem_local: null,
          destino_local: null,
          observacao: `Baixa pela caixa ${caixa.codigo}.${observacao.trim() ? ` ${capitalizarTexto(observacao.trim())}` : ""}`.slice(0, 500),
          ...(MODO_DEMO ? { caixa_id: caixa.id } : {}),
        },
      ],
      { onSuccess: aoFechar },
    );
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Dar baixa em ferramenta da caixa {caixa.codigo}</DialogTitle>
          <DialogDescription>
            Sem empregado, a baixa sai do que está guardado na caixa; com empregado, do que está com ele.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="baixa-ferramenta">Ferramenta</Label>
            <Select value={ferramentaId} onValueChange={setFerramentaId}>
              <SelectTrigger id="baixa-ferramenta">
                <SelectValue placeholder="Escolha a ferramenta" />
              </SelectTrigger>
              <SelectContent>
                {linhas.map((l) => (
                  <SelectItem key={l.ferramenta.id} value={l.ferramenta.id}>
                    {l.ferramenta.codigo_sku} — {l.ferramenta.nome} (guardadas {l.disponivel}, com empregado {l.comEmpregado})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="baixa-quantidade">Quantidade</Label>
            <Input
              id="baixa-quantidade"
              type="number"
              min={1}
              step={1}
              value={Number.isNaN(quantidade) ? "" : quantidade}
              onChange={(e) => setQuantidade(e.target.valueAsNumber)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="baixa-data">Data</Label>
            <Input id="baixa-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="baixa-motivo">Motivo da baixa</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger id="baixa-motivo">
                <SelectValue placeholder="Escolha o motivo" />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS_DA_BAIXA.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="baixa-onus">Ônus da baixa</Label>
            <Select value={onus} onValueChange={setOnus}>
              <SelectTrigger id="baixa-onus">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ONUS_BAIXA.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="baixa-empregado">Empregado</Label>
            <Select value={empregadoId} onValueChange={setEmpregadoId}>
              <SelectTrigger id="baixa-empregado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_EMPREGADO}>Sem empregado (baixa da própria caixa)</SelectItem>
                {empregados.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="baixa-observacao">Observação</Label>
            <Textarea id="baixa-observacao" rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button requiresWrite="operar" type="button" disabled={registrar.isPending} onClick={gravar}>
            Registrar baixa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Ocorrência ligada a uma ferramenta da caixa; grava a caixa só no modo demonstração. */
export function DialogOcorrenciaCaixa({ caixa, aberto, aoFechar, linhas }: Comum & { linhas: LinhaCaixa[] }) {
  const { data: empregados = [] } = useEmpregados(TODAS, true);
  const salvar = useSalvar("ocorrencias", ["ocorrencias"]);
  const [ferramentaId, setFerramentaId] = useState(linhas[0]?.ferramenta.id ?? "");
  const [empregadoId, setEmpregadoId] = useState(SEM_EMPREGADO);
  const [data, setData] = useState(hojeLocal());
  const [hora, setHora] = useState(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
  const [responsavel, setResponsavel] = useState("");
  const [descricao, setDescricao] = useState("");

  function gravar() {
    if (!ferramentaId) return alert("Escolha a ferramenta.");
    if (!data || !hora) return alert("Informe data e hora.");
    if (!responsavel.trim()) return alert("Informe o responsável pelo registro.");
    if (!descricao.trim()) return alert("Descreva a ocorrência.");
    salvar.mutate(
      {
        valores: {
          data,
          hora,
          responsavel_registro: capitalizarNomePessoa(responsavel.trim()),
          descricao_ocorrencia: capitalizarTexto(descricao.trim()),
          tipo_ocorrencia: "Ferramenta",
          empregado_id: empregadoId === SEM_EMPREGADO ? null : empregadoId,
          item_id: ferramentaId,
          veiculo_id: null,
          ...(MODO_DEMO ? { caixa_id: caixa.id } : {}),
        },
      },
      { onSuccess: aoFechar },
    );
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Registrar ocorrência da caixa {caixa.codigo}</DialogTitle>
          <DialogDescription>A ocorrência também aparece em Ocorrências de Ferramentas.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="oc-ferramenta">Ferramenta</Label>
            <Select value={ferramentaId} onValueChange={setFerramentaId}>
              <SelectTrigger id="oc-ferramenta">
                <SelectValue placeholder="Escolha a ferramenta" />
              </SelectTrigger>
              <SelectContent>
                {linhas.map((l) => (
                  <SelectItem key={l.ferramenta.id} value={l.ferramenta.id}>
                    {l.ferramenta.codigo_sku} — {l.ferramenta.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="oc-data">Data</Label>
            <Input id="oc-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="oc-hora">Hora</Label>
            <Input id="oc-hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="oc-empregado">Empregado</Label>
            <Select value={empregadoId} onValueChange={setEmpregadoId}>
              <SelectTrigger id="oc-empregado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_EMPREGADO}>Sem empregado específico</SelectItem>
                {empregados.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="oc-responsavel">Responsável pelo registro</Label>
            <Input id="oc-responsavel" capitalizar="nome" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="oc-descricao">Descrição da ocorrência</Label>
            <Textarea id="oc-descricao" rows={4} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button requiresWrite="operar" type="button" disabled={salvar.isPending} onClick={gravar}>
            Registrar ocorrência
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
