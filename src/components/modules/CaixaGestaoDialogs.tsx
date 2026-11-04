import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItensModulo } from "./ItensModulo";
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
import { ONUS_BAIXA } from "@/lib/gemape";
import { capitalizarNomePessoa, capitalizarTexto } from "@/lib/formatacao-cadastral";
import { hojeLocal } from "@/lib/empregados";
import { codigoCaixa } from "@/lib/caixas-habilitadas";
import { MODO_DEMO } from "@/lib/modo-demo";
import {
  controleDaFerramenta,
  ferramentasComEmpregadoRemovidas,
  ferramentasEmOutraCaixa,
  MOTIVOS_BAIXA_CAIXA,
  validarTransferenciaDeCaixa,
  validarBaixaDaCaixa,
  validarFerramentasDaCaixa,
} from "@/lib/controle-caixa";
import { ehBaixa } from "@/lib/historico-movimentacoes";
import { ferramentasAcimaDoEstoque, limiteDaCaixa } from "@/lib/estoque-ferramentas-posicao";
import {
  useEmpregados,
  useItens,
  useMovimentacoes,
  useRegistrarMovimentacoesLote,
  useSalvar,
  useSalvarCaixa,
  useCaixasFerramentas,
  useTodosCaixaItens,
  type CaixaFerramenta,
  type CaixaFerramentaItem,
  type Item,
  type Movimentacao,
} from "@/lib/hooks-gemape";

const PREFIXO_CAIXA_NOVA = "nova:";
const SEM_EMPREGADO = "sem-empregado";

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
  const { data: itensDeTodas = [] } = useTodosCaixaItens();
  const { data: caixasDeTodas = [] } = useCaixasFerramentas(TODAS, "");
  const salvar = useSalvarCaixa();
  const { data: movimentosDaFerramenta = [] } = useMovimentacoes("ferramenta", TODAS);
  const [linhas, setLinhas] = useState(() =>
    itensAtuais.map((i) => ({ ferramenta_id: i.ferramenta_id, quantidade: i.quantidade, observacao: i.observacao ?? "" })),
  );
  const [escolhida, setEscolhida] = useState("");
  const [cadastrando, setCadastrando] = useState(false);
  const ferramenta = (id: string) => todas.find((t) => t.id === id) ?? itensAtuais.find((i) => i.ferramenta_id === id)?.ferramenta;
  const nome = (id: string) => ferramenta(id)?.nome ?? "Ferramenta";
  // Uma ferramenta só fica em uma caixa: as que já estão em outra só voltam por baixa ou transferência.
  const outrasCaixas = itensDeTodas.filter((o) => o.caixa_id !== caixa.id);
  const caixaDe = (ferramentaId: string) => {
    const outra = outrasCaixas.find((o) => o.ferramenta_id === ferramentaId);
    return outra ? (caixasDeTodas.find((c) => c.id === outra.caixa_id)?.codigo ?? "outra caixa") : null;
  };
  // A lista vem de Parâmetros > Ferramentas > Cadastrar Ferramenta; as que já estão em outra caixa aparecem travadas.
  const candidatas = todas.filter((t) => t.status === "Ativo" && !linhas.some((l) => l.ferramenta_id === t.id));
  const livres = candidatas.filter((t) => !caixaDe(t.id));

  function adicionar(id: string) {
    setLinhas((atual) => [...atual, { ferramenta_id: id, quantidade: 1, observacao: "" }]);
    setEscolhida("");
  }

  function gravar() {
    const erro =
      validarFerramentasDaCaixa(linhas, comEmpregado, nome) ??
      // A caixa guarda no máximo o que o estoque tem (decisão 379): o saldo mais o que já saiu dela por baixa.
      ferramentasAcimaDoEstoque(
        linhas,
        // Quem já estava na caixa com mais do que o estoque (cadastro anterior a esta regra) continua como está: o limite vale para o que aumenta.
        (id) => Math.max(
          limiteDaCaixa(Number(ferramenta(id)?.estoque_atual) || 0, movimentosDaFerramenta.filter((m) => m.item_id === id && m.caixa_id === caixa.id && ehBaixa(m)).reduce((t, m) => t + (Number(m.quantidade) || 0), 0)),
          itensAtuais.find((i) => i.ferramenta_id === id)?.quantidade ?? 0,
        ),
        nome,
      ) ??
      ferramentasComEmpregadoRemovidas(itensAtuais, linhas, comEmpregado, nome) ??
      ferramentasEmOutraCaixa(
        linhas,
        outrasCaixas,
        caixa.id,
        nome,
        (id) => caixasDeTodas.find((c) => c.id === id)?.codigo ?? "outra caixa",
      );
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
    <>
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Vincular ferramentas à caixa {caixa.codigo}</DialogTitle>
          <DialogDescription>
            Escolha as ferramentas que ficam nesta caixa e a quantidade de cada uma. Cada ferramenta só pode estar em uma caixa; a que já está em outra só entra aqui depois de baixa ou transferência.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="incluir-ferramenta">Incluir ferramenta</Label>
            <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => setCadastrando(true)}>
              Cadastrar ferramenta
            </Button>
          </div>
          <Select value={escolhida} onValueChange={adicionar}>
            <SelectTrigger id="incluir-ferramenta">
              <SelectValue placeholder={livres.length ? "Escolha a ferramenta" : "Nenhuma ferramenta livre: cadastre uma nova"} />
            </SelectTrigger>
            <SelectContent>
              {candidatas.map((t) => {
                const emOutra = caixaDe(t.id);
                return (
                  <SelectItem key={t.id} value={t.id} disabled={!!emOutra}>
                    {t.codigo_sku} — {t.nome}
                    {emOutra ? ` (já na caixa ${emOutra})` : ""}
                  </SelectItem>
                );
              })}
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
    {/* O cadastro abre por cima: o vínculo em andamento fica guardado e a nova ferramenta já aparece na lista ao voltar. */}
    <Dialog open={cadastrando} onOpenChange={setCadastrando}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Cadastrar ferramenta</DialogTitle>
          <DialogDescription>
            Parâmetros · Ferramentas · Cadastrar Ferramenta. Salve a ferramenta e volte: o vínculo da caixa {caixa.codigo} continua como estava.
          </DialogDescription>
        </DialogHeader>
        <ItensModulo modulo="ferramenta" />
        <DialogFooter>
          <Button type="button" onClick={() => setCadastrando(false)}>
            Voltar ao vínculo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

/** Baixa de uma ferramenta da caixa (perda, quebra, desgaste...); grava a caixa na movimentação. */
export function DialogBaixaCaixa({
  caixa,
  aberto,
  aoFechar,
  linhas,
  historico,
}: Comum & { linhas: LinhaCaixa[]; historico: Movimentacao[] }) {
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
      // Com empregado, o limite é o que está com ele, não o total da caixa.
      comEmpregado: empregado
        ? controleDaFerramenta(historico.filter((m) => m.empregado_id === empregado), ferramentaId).comEmpregado
        : (linha?.comEmpregado ?? 0),
      empregadoId: empregado,
    });
    if (erro || !linha) {
      alert(erro ?? "Escolha a ferramenta.");
      return;
    }
    // A baixa sai do saldo do estoque (decisão 379): sem saldo, a entrada precisa ser registrada antes.
    const saldoNoEstoque = Number(linha.ferramenta.estoque_atual) || 0;
    if (quantidade > saldoNoEstoque) {
      alert(`O estoque tem ${saldoNoEstoque} de ${linha.ferramenta.nome}; a baixa não pode passar disso. Registre a entrada (compra ou ajuste em Estoque) antes.`);
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
                {MOTIVOS_BAIXA_CAIXA.map((m) => (
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
            <Select value={empregadoId} onValueChange={(v) => { if (v) setEmpregadoId(v); }}>
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
            <Select value={empregadoId} onValueChange={(v) => { if (v) setEmpregadoId(v); }}>
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

/** Transfere uma ferramenta (com a quantidade cadastrada) para outra caixa; grava a transferência no histórico. */
export function DialogTransferirCaixa({
  caixa,
  aberto,
  aoFechar,
  linhas,
  destinos,
  novas = [],
}: Comum & { linhas: LinhaCaixa[]; destinos: CaixaFerramenta[]; novas?: number[] }) {
  const { data: itensDeTodas = [] } = useTodosCaixaItens();
  const salvar = useSalvarCaixa();
  const registrar = useRegistrarMovimentacoesLote(["movimentacoes", "ferramentas"]);
  const [ferramentaId, setFerramentaId] = useState(linhas[0]?.ferramenta.id ?? "");
  const [destinoId, setDestinoId] = useState("");
  const [executando, setExecutando] = useState(false);
  const linha = linhas.find((l) => l.ferramenta.id === ferramentaId);
  // Caixa habilitada que ainda não foi cadastrada: a transferência cria a caixa já com a ferramenta.
  const novoNumero = destinoId.startsWith(PREFIXO_CAIXA_NOVA) ? Number(destinoId.slice(PREFIXO_CAIXA_NOVA.length)) : null;
  const destino = destinos.find((d) => d.id === destinoId);
  const valoresDe = (c: CaixaFerramenta) => ({
    codigo: c.codigo,
    codigo_num: c.codigo_num,
    empresa_id: c.empresa_id,
    nome: c.nome,
    descricao: c.descricao,
    localizacao: c.localizacao,
    status: c.status,
  });
  const itensDa = (id: string) =>
    itensDeTodas.filter((i) => i.caixa_id === id).map((i) => ({ ferramenta_id: i.ferramenta_id, quantidade: i.quantidade, observacao: i.observacao ?? "" }));

  async function gravar() {
    if (executando) return;
    const erro = validarTransferenciaDeCaixa({
      ferramentaId,
      destinoId,
      origemId: caixa.id,
      comEmpregado: linha?.comEmpregado ?? 0,
      jaNoDestino: itensDeTodas.some((i) => i.caixa_id === destinoId && i.ferramenta_id === ferramentaId),
    });
    if (erro || !linha || (!destino && novoNumero === null)) {
      alert(erro ?? "Confira a ferramenta e a caixa de destino.");
      return;
    }
    const naOrigem = itensDeTodas.find((i) => i.caixa_id === caixa.id && i.ferramenta_id === ferramentaId);
    if (!naOrigem) {
      alert("A ferramenta não está mais nesta caixa.");
      return;
    }
    setExecutando(true);
    try {
      // Cada ferramenta é única e fica em uma caixa só: sai da origem e depois entra no destino; se a entrada falhar, volta para a origem.
      const itemTransferido = { ferramenta_id: ferramentaId, quantidade: naOrigem.quantidade, observacao: naOrigem.observacao ?? "" };
      const codigoNovo = novoNumero !== null ? codigoCaixa(novoNumero) : null;
      const codigoDestino = codigoNovo ?? destino?.codigo ?? "";
      const valoresDestino =
        destino && novoNumero === null
          ? valoresDe(destino)
          : {
              codigo: codigoNovo,
              codigo_num: novoNumero,
              empresa_id: caixa.empresa_id,
              nome: codigoNovo,
              descricao: null,
              localizacao: null,
              status: "Ativa",
            };
      const itensDestinoAntes = destino && novoNumero === null ? itensDa(destino.id) : [];
      const itensOrigemAntes = itensDa(caixa.id);
      await salvar.mutateAsync({
        id: caixa.id,
        valores: valoresDe(caixa),
        itens: itensOrigemAntes.filter((i) => i.ferramenta_id !== ferramentaId),
      });
      let destinoReal: string;
      try {
        destinoReal = await salvar.mutateAsync({
          ...(destino && novoNumero === null ? { id: destino.id } : {}),
          valores: valoresDestino,
          itens: [...itensDestinoAntes, itemTransferido],
        });
      } catch (erro) {
        // A entrada no destino falhou: a ferramenta volta para a origem, para não ficar sem caixa.
        await salvar.mutateAsync({ id: caixa.id, valores: valoresDe(caixa), itens: itensOrigemAntes }).catch(() => {
          alert(`Não foi possível devolver a ferramenta à caixa ${caixa.codigo}. Confira as caixas antes de tentar de novo.`);
        });
        throw erro;
      }
      await registrar.mutateAsync([
        {
          modulo: "ferramenta",
          item_id: ferramentaId,
          veiculo_id: null,
          empresa_id: linha.ferramenta.empresa_id,
          empregado_id: null,
          tipo_movimentacao: "Transferencia",
          motivo_baixa: null,
          quantidade: naOrigem.quantidade,
          onus_baixa: null,
          tipo_vistoria: null,
          sinalizar_ocorrencia: false,
          tipo_ocorrencia: null,
          conducao_ocorrencia: null,
          data_movimentacao: hojeLocal(),
          origem_local: caixa.codigo,
          destino_local: codigoDestino,
          observacao: `Transferida da caixa ${caixa.codigo} para a caixa ${codigoDestino}.`,
          ...(MODO_DEMO ? { caixa_id: destinoReal } : {}),
        },
      ]);
      aoFechar();
    } catch {
      // Os erros já aparecem como aviso nas próprias operações.
    } finally {
      setExecutando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Transferir ferramenta da caixa {caixa.codigo}</DialogTitle>
          <DialogDescription>
            A ferramenta sai desta caixa e entra na outra, com a mesma quantidade. Precisa estar guardada, sem empregado com ela.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="transf-ferramenta">Ferramenta</Label>
            <Select value={ferramentaId} onValueChange={setFerramentaId}>
              <SelectTrigger id="transf-ferramenta">
                <SelectValue placeholder="Escolha a ferramenta" />
              </SelectTrigger>
              <SelectContent>
                {linhas.map((l) => (
                  <SelectItem key={l.ferramenta.id} value={l.ferramenta.id}>
                    {l.ferramenta.codigo_sku} — {l.ferramenta.nome} (quantidade {l.quantidade}, com empregado {l.comEmpregado})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="transf-destino">Caixa de destino</Label>
            <Select value={destinoId} onValueChange={setDestinoId}>
              <SelectTrigger id="transf-destino">
                <SelectValue placeholder="Escolha a caixa" />
              </SelectTrigger>
              <SelectContent>
                {destinos
                  .filter((d) => d.id !== caixa.id)
                  .map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.codigo}
                    </SelectItem>
                  ))}
                {novas.map((n) => (
                  <SelectItem key={`${PREFIXO_CAIXA_NOVA}${n}`} value={`${PREFIXO_CAIXA_NOVA}${n}`}>
                    {codigoCaixa(n)} (ainda sem ferramentas)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button requiresWrite="operar" type="button" disabled={executando} onClick={gravar}>
            Transferir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
