import { LinhasEsqueleto } from "@/components/Esqueletos";
import { EnderecoDaEntrada } from "@/components/EnderecoDaEntrada";
import { sufixoTamanhoFerramenta } from "@/lib/tamanho-ferramenta";
import { avisarEnderecamentoObrigatorio } from "@/lib/aviso-enderecamento";
import { AlternarDensidade } from "@/components/AlternarDensidade";
import { BarraDeFiltros } from "@/components/layout/BarraDeFiltros";
import { useState } from "react";
import { useRouteContext } from "@tanstack/react-router";

import { ImportarNfeXml } from "@/components/modules/ImportarNfeXml";
import { SeletorTamanho, TAMANHO_DISPONIVEL } from "@/components/SeletorTamanho";
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
import { SeletorComBusca } from "@/components/SeletorComBusca";
import { ColarPlanilhaDialog } from "@/components/modules/ColarPlanilhaDialog";
import { CompraFerramentaDialog } from "@/components/modules/CompraFerramentaDialog";
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
import { empresaPadraoParaEscolha, empresasParaEscolha } from "@/lib/empresas";
import {
  CONDUCOES_OCORRENCIA,
  exportarCsv,
  formatarData,
  formatarMoeda,
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
import { bloqueioPorDemissao, hojeLocal } from "@/lib/empregados";
import {
  alvoHistorico,
  linhaCsvHistorico,
  naturezaMovimentacao,
} from "@/lib/historico-movimentacoes";
import {
  associarTamanhoNaEntrada,
  controlaModulo,
  desfazerAssociacaoDaEntrada,
  nomeTamanhoGravado,
  tamanhoParaGravar,
  validarLinhasTamanho,
} from "@/lib/estoque-tamanho";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { MODO_DEMO } from "@/lib/modo-demo";
import { combinaBusca } from "@/lib/parametros-base";
import { SeletorAcaoManutencao } from "@/components/modules/SeletorAcaoManutencao";
import { capitalizarTexto } from "@/lib/formatacao-cadastral";

// Ação de manutenção gravada na movimentação (modo demonstração): "Pai: filho, filho".
function textoManutencao(m: unknown): string {
  const { acao_manutencao: acao, subitens_manutencao: subs } = m as { acao_manutencao?: string; subitens_manutencao?: string[] };
  if (!acao) return "";
  return subs?.length ? `${acao}: ${subs.join(", ")}` : acao;
}

const CHAVES = ["movimentacoes", "itens", "saidas-por-item"];
const NENHUM = "nenhum";

// `foco` (Ferramentas): "entrada" mostra e registra só as entradas no estoque; "entrega" só as entregas e devoluções ao empregado.
const TIPOS_DO_FOCO = { entrega: ["Saida"] } as const;
const TIPOS_DA_VISAO = { compras: ["Entrada"], devolucoes: ["Devolucao"] } as const;
const TEXTO_DO_FOCO = { entrada: { novo: "Nova entrada", titulo: "Entrada no estoque", busca: "Buscar entrada ou devolução", plural: "entradas e devoluções" }, entrega: { novo: "Nova entrega", titulo: "Entrega de ferramentas", busca: "Buscar entrega", plural: "entregas e baixas" } } as const;

export function MovimentacoesModulo({ modulo, foco }: { modulo: Modulo; foco?: "entrada" | "entrega" }) {
  const { empresas, empresaId } = useEmpresa();
  const { user } = useRouteContext({ from: "/_authenticated" });
  const responsavelPadrao = String((user?.user_metadata as { nome?: unknown } | undefined)?.nome ?? user?.email ?? "");
  const [aberto, setAberto] = useState(false);
  const [compraAberta, setCompraAberta] = useState(false);
  const [colarAberto, setColarAberto] = useState(false);
  // Entrada no estoque: Compras e Devoluções em listas separadas, um botão para cada (decisão 380).
  const [visao, setVisao] = useState<"compras" | "devolucoes">("compras");
  const [comOcorrencia, setComOcorrencia] = useState(false);
  const [tipoMovimentacao, setTipoMovimentacao] = useState<string>(foco === "entrada" ? "Entrada" : "Saida");
  const [alvoId, setAlvoId] = useState<string>("");
  // Tamanho de EPI e uniforme com tamanho em Gerais (decisão 23).
  const [tamanho, setTamanho] = useState("");
  const parametros = useParametrosBase();
  // Ação de manutenção do veículo (decisão 46): o pai e os filhos marcados. Só no modo demonstração.
  const [acaoManutId, setAcaoManutId] = useState("");
  const [subitensMarcados, setSubitensMarcados] = useState<string[]>([]);
  const comTamanho = TAMANHO_DISPONIVEL && controlaModulo(modulo);
  const { data: todasMovimentacoes = [], isLoading } = useMovimentacoes(modulo, empresaId);
  const tiposDoFoco: readonly string[] | null = foco === "entrada" ? TIPOS_DA_VISAO[visao] : foco ? TIPOS_DO_FOCO[foco] : null;
  const movimentacoes = tiposDoFoco ? todasMovimentacoes.filter((m) => tiposDoFoco.includes(m.tipo_movimentacao)) : todasMovimentacoes;
  const texto = foco ? TEXTO_DO_FOCO[foco] : null;
  // Na Entrada no estoque a lista mostra só a visão escolhida, e o contador acompanha.
  const plural = foco === "entrada" ? (visao === "devolucoes" ? "devoluções" : "entradas") : texto?.plural ?? "movimentações";
  // Entrada no estoque (Ferramentas): só item, empresa, quantidade, data e observação; sem tipo, empregado, baixa, vistoria nem ocorrência.
  const soEntrada = foco === "entrada";
  // Entrega de ferramentas: na lista, o Motivo da baixa ocupa o lugar da coluna Tipo (como no formulário).
  const soEntrega = foco === "entrega";
  const ocultoNaEntrada = soEntrada ? " hidden" : "";
  const { data: itens = [] } = useItens(modulo === "veiculo" ? "ferramenta" : modulo, empresaId);
  const { data: veiculos = [] } = useVeiculos(empresaId);
  const { data: empregados = [] } = useEmpregados(empresaId, true);
  // O histórico mostra também quem já foi demitido.
  const { data: todosEmpregados = [] } = useEmpregados(empresaId);
  const registrarLote = useRegistrarMovimentacoesLote(CHAVES);

  const ehVeiculo = modulo === "veiculo";
  // Compras (entradas) não têm empregado; as devoluções, sim.
  const mostraEmpregado = !soEntrada || visao === "devolucoes";
  const [busca, setBusca] = useState("");
  const [buscaDevolucao, setBuscaDevolucao] = useState("");
  // Data, Tipo, Item, Empresa/Empregado e Qtde sempre; as demais dependem do módulo e do foco.
  const totalColunas = 5 + Number(!ehVeiculo) + Number(comTamanho) + Number(!soEntrada && !soEntrega) + 2 * Number(!foco) + Number(ehVeiculo && MODO_DEMO) + Number(soEntrega && MODO_DEMO) + Number(soEntrada && visao === "devolucoes") + 4 * Number(soEntrada && visao === "compras");
  const nomeEmpregado = (id: string | null) =>
    todosEmpregados.find((e) => e.id === id)?.nome ?? "—";

  // Busca: veículo (ou código e descrição do item), empregado, tipo, manutenção, motivo, ônus, vistoria, ocorrência e data.
  // Na Entrada no estoque cada visão tem a sua busca (como em EpiComprasModulo).
  const buscaAtiva = soEntrada && visao === "devolucoes" ? buscaDevolucao : busca;
  const visiveis =
    buscaAtiva.trim()
      ? movimentacoes.filter((m) =>
          combinaBusca(
            buscaAtiva,
            alvoHistorico(m, itens, veiculos).codigo,
            alvoHistorico(m, itens, veiculos).descricao,
            comTamanho ? nomeTamanhoGravado(parametros, m.tamanho_id) : null,
            naturezaMovimentacao(m),
            nomeEmpregado(m.empregado_id),
            textoManutencao(m),
            m.motivo_baixa,
            m.onus_baixa,
            m.tipo_vistoria,
            m.sinalizar_ocorrencia ? m.tipo_ocorrencia : null,
            m.observacao,
            formatarData(m.data_movimentacao),
          ),
        )
      : movimentacoes;

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const texto = (k: string) => {
      const v = String(f.get(k) ?? "").trim();
      return v === "" || v === NENHUM ? null : v;
    };
    const quantidadeDigitada = Number(f.get("quantidade") ?? 1);
    // Entrega de ferramentas: quem entrega fica registrado (só no modo demonstração, a coluna entra na Fase 2).
    const responsavelEntrega = foco === "entrega" ? texto("responsavel_entrega") : null;
    if (foco === "entrega" && !responsavelEntrega) {
      alert("Informe o responsável pela entrega.");
      return;
    }
    const tipo = String(f.get("tipo_movimentacao") ?? "Entrada");
    const alvo = ehVeiculo ? null : texto("alvo_id");
    if (!texto("alvo_id")) {
      alert(ehVeiculo ? "Selecione o veículo." : "Selecione o item.");
      return;
    }
    const bloqueio = bloqueioPorDemissao(
      todosEmpregados.find((p) => p.id === texto("empregado_id")),
      tipo === "Saida" ? "entrega" : tipo === "Devolucao" ? "devolucao" : "movimentacao",
      String(f.get("data_movimentacao") ?? ""),
    );
    if (bloqueio) {
      alert(bloqueio);
      return;
    }

    // Entrada e devolução pedem um tamanho autorizado; saída, um tamanho com saldo.
    if (comTamanho && alvo && controlaModulo(modulo) && tipo !== "Transferencia") {
      const acao = tipo === "Saida" ? "saída" : tipo === "Devolucao" ? "devolução" : "entrada";
      const erro = validarLinhasTamanho(
        [{ item_id: alvo, quantidade: quantidadeDigitada, tamanho }],
        itens,
        parametros,
        modulo,
        acao,
        true,
      );
      if (erro) {
        alert(erro);
        return;
      }
    }

    if (modulo === "epi" && tipo === "Saida" && alvo) {
      const itemSelecionado = itens.find((i) => i.id === alvo);
      if (itemSelecionado && quantidadeDigitada > itemSelecionado.estoque_atual) {
        alert(`A quantidade solicitada (${quantidadeDigitada}) excede o estoque atual disponível (${itemSelecionado.estoque_atual}).`);
        return;
      }
    }

    const acaoManut = ehVeiculo && MODO_DEMO ? parametros.acoesManutencaoVeiculo.find((a) => a.id === acaoManutId) : undefined;
    if (acaoManut && acaoManut.subitens.length > 0 && subitensMarcados.length === 0) {
      alert("Marque ao menos um subitem da ação de manutenção.");
      return;
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
      origem_local: capitalizarTexto(texto("origem_local")) || null,
      destino_local: capitalizarTexto(texto("destino_local")) || null,
      observacao: capitalizarTexto(texto("observacao"))?.slice(0, 500) || null,
      ...(MODO_DEMO && responsavelEntrega ? { responsavel_nome: responsavelEntrega } : {}),
      // A manutenção ainda não existe no banco real (Fase 2): só vai no modo demonstração.
      ...(acaoManut
        ? {
            acao_manutencao: acaoManut.nome,
            subitens_manutencao: acaoManut.subitens.filter((i) => subitensMarcados.includes(i.id)).map((i) => i.nome),
          }
        : {}),
      // A devolução grava "Sem tamanho" explícito, para não confundir com tamanho ausente.
      ...(comTamanho ? { tamanho_id: tamanhoParaGravar(tamanho, tipo === "Devolucao") } : {}),
    };
    // Entrada com tamanho ainda não autorizado: associa à subcategoria antes de gravar e desfaz se a gravação falhar.
    const produtoEntrada = itens.find((i) => i.id === alvo);
    const associada =
      comTamanho && tipo === "Entrada" && produtoEntrada && controlaModulo(modulo)
        ? associarTamanhoNaEntrada(modulo, produtoEntrada, tamanho)
        : null;
    registrarLote.mutate([valores], {
      onSuccess: () => {
        setAberto(false);
        // Entrada de ferramenta em categoria com endereçamento obrigatório e sem endereço: avisa onde cadastrar (decisão 384).
        if (modulo === "ferramenta" && tipo === "Entrada" && produtoEntrada) void avisarEnderecamentoObrigatorio(parametros, "cat-ferramentas", produtoEntrada.empresa_id ?? "", produtoEntrada.codigo_sku ?? "");
      },
      onError: () => {
        if (associada) desfazerAssociacaoDaEntrada(associada, tamanho);
      },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <BarraDeFiltros>
          <Input
            aria-label={texto?.busca ?? "Buscar movimentação"}
            placeholder={ehVeiculo ? "Buscar por veículo, empregado ou manutenção" : "Buscar por item, código, empregado ou motivo"}
            value={buscaAtiva}
            onChange={(e) => (soEntrada && visao === "devolucoes" ? setBuscaDevolucao : setBusca)(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            {visiveis.length === movimentacoes.length
              ? `Últimas ${movimentacoes.length} ${plural} registradas.`
              : `${visiveis.length} de ${movimentacoes.length} ${plural}.`}
          </p>
        </BarraDeFiltros>
        <AlternarDensidade />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() =>
              exportarCsv(
                `movimentacoes-${modulo}`,
                movimentacoes.map((m) =>
                  linhaCsvHistorico(m, {
                    itens,
                    veiculos,
                    nomeEmpregado,
                    nomeTamanho: (id) => nomeTamanhoGravado(parametros, id),
                  }),
                ),
              )
            }
          >
            Exportar CSV
          </Button>
          {modulo === "ferramenta" && <ImportarNfeXml />}
          {soEntrada && modulo === "ferramenta" && <Button requiresWrite="operar" variant="outline" onClick={() => setColarAberto(true)}>Colar da planilha</Button>}
          <Button requiresWrite="operar"
            onClick={() => {
              if (soEntrada) {
                // Entrada no estoque: a compra tem o seu próprio formulário (CompraFerramentaDialog), como em EPIs e uniformes.
                setVisao("compras");
                setCompraAberta(true);
                return;
              }
              setComOcorrencia(false);
              setAcaoManutId("");
              setSubitensMarcados([]);
              setTamanho("");
              // O tipo volta para Saída como o formulário, que reabre com o valor padrão.
              setTipoMovimentacao("Saida");
              setAberto(true);
            }}
          >
            {soEntrada ? "Registrar entrada" : (texto?.novo ?? "Nova movimentação")}
          </Button>
        </div>
      </div>

      {soEntrada && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Compras ou devoluções">
          {([["compras", "Compras"], ["devolucoes", "Devoluções"]] as const).map(([id, rotulo]) => (
            <Button key={id} type="button" className={visao === id ? "ring-2 ring-primary ring-offset-2" : "opacity-70"} aria-pressed={visao === id} onClick={() => setVisao(id)}>
              {rotulo}
            </Button>
          ))}
        </div>
      )}

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>{soEntrega ? "Motivo da baixa" : "Tipo"}</TableHead>
              {!ehVeiculo && <TableHead>Código</TableHead>}
              <TableHead>{ehVeiculo ? "Veículo" : "Item"}</TableHead>
              {comTamanho && <TableHead>Tamanho</TableHead>}
              {soEntrada && <TableHead>Empresa</TableHead>}
              {soEntrada && visao === "compras" && <><TableHead>Fornecedor</TableHead><TableHead>NF</TableHead><TableHead className="text-right">Valor unit.</TableHead><TableHead className="text-right">Valor total</TableHead></>}
              {mostraEmpregado && <TableHead>Empregado</TableHead>}
              <TableHead>Qtde</TableHead>
              {soEntrega && MODO_DEMO && <TableHead>Responsável</TableHead>}
              {!soEntrada && !soEntrega && <TableHead>Motivo da baixa</TableHead>}
              {!foco && <TableHead>Ônus</TableHead>}
              {ehVeiculo && MODO_DEMO && <TableHead>Manutenção</TableHead>}
              {!foco && <TableHead>Ocorrência</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <LinhasEsqueleto colunas={totalColunas} />
            ) : visiveis.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={totalColunas}
                  className="text-center text-muted-foreground"
                >
                  {buscaAtiva.trim() ? "Nenhum resultado para a busca." : "Nenhuma movimentação registrada."}
                </TableCell>
              </TableRow>
            ) : (
              visiveis.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{formatarData(m.data_movimentacao)}</TableCell>
                  <TableCell>
                    {soEntrega ? (
                      // Tipo e motivo da baixa são texto comum, sem etiqueta.
                      m.motivo_baixa ?? "—"
                    ) : (
                      soEntrada ? (m.tipo_movimentacao === "Devolucao" ? "Devolução (usada)" : (m as { condicao?: string }).condicao === "usado" ? "Usada" : "Nova") : naturezaMovimentacao(m)
                    )}
                  </TableCell>
                  {!ehVeiculo && (
                    <TableCell className="font-mono text-xs">
                      {alvoHistorico(m, itens, veiculos).codigo}
                    </TableCell>
                  )}
                  <TableCell>{alvoHistorico(m, itens, veiculos).descricao}</TableCell>
                  {comTamanho && (
                    <TableCell>{nomeTamanhoGravado(parametros, m.tamanho_id) || "—"}</TableCell>
                  )}
                  {soEntrada && <TableCell>{empresas.find((e) => e.id === m.empresa_id)?.nome_fantasia ?? "—"}</TableCell>}
                  {soEntrada && visao === "compras" && (() => {
                    const c = m as { fornecedor?: string | null; nota_fiscal?: string | null; valor_unitario?: number | null; valor_total?: number | null };
                    return <><TableCell>{c.fornecedor || "—"}</TableCell><TableCell>{c.nota_fiscal || "—"}</TableCell><TableCell className="text-right">{c.valor_unitario != null ? formatarMoeda(c.valor_unitario) : "—"}</TableCell><TableCell className="text-right">{c.valor_total != null ? formatarMoeda(c.valor_total) : "—"}</TableCell></>;
                  })()}
                  {mostraEmpregado && <TableCell>{nomeEmpregado(m.empregado_id)}</TableCell>}
                  <TableCell>{m.quantidade}</TableCell>
                  {soEntrega && MODO_DEMO && <TableCell>{(m as { responsavel_nome?: string | null }).responsavel_nome || "—"}</TableCell>}
                  {!soEntrada && !soEntrega && <TableCell>{m.motivo_baixa ?? "—"}</TableCell>}
                  {!foco && <TableCell>{m.onus_baixa ?? "—"}</TableCell>}
                  {ehVeiculo && MODO_DEMO && (
                    <TableCell>{textoManutencao(m) || "—"}</TableCell>
                  )}
                  {!foco && <TableCell>
                    {m.sinalizar_ocorrencia ? (
                      <Badge variant="destructive">Sim</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{texto?.titulo ?? "Nova movimentação"}</DialogTitle>
            <DialogDescription>
              {foco === "entrada" ? "Registra a ferramenta que entra no estoque." : foco === "entrega" ? "Entrega ao empregado ou baixa: para baixar, informe o motivo da baixa." : "Toda movimentação registra a empresa e o empregado envolvidos."}
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
                defaultValue={hojeLocal()}
              />
            </div>
            {foco === "entrega" && (
              <div className="space-y-1.5">
                <Label htmlFor="responsavel_entrega">Responsável pela entrega</Label>
                <Input id="responsavel_entrega" name="responsavel_entrega" defaultValue={responsavelPadrao} maxLength={200} required />
              </div>
            )}
            <div className={`space-y-1.5${ocultoNaEntrada}`}>
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
            <div className={`space-y-1.5${foco ? " hidden" : ""}`}>
              <Label htmlFor="tipo_movimentacao">Tipo de movimentação</Label>
              <Select
                name="tipo_movimentacao"
                defaultValue={foco === "entrada" ? "Entrada" : "Saida"}
                onValueChange={(v) => {
                  setTipoMovimentacao(v);
                  setTamanho("");
                }}
              >
                <SelectTrigger id="tipo_movimentacao">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_MOVIMENTACAO.filter((t) => {
                    // A janela de entrada só registra Entrada, qualquer que seja a lista (Compras ou Devoluções) aberta.
                    if (soEntrada) return t === "Entrada";
                    if (tiposDoFoco) return tiposDoFoco.includes(t);
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
              <SeletorComBusca
                id="alvo_id"
                nome="alvo_id"
                valor={alvoId}
                opcoes={ehVeiculo ? veiculos.map((o) => ({ id: o.id, rotulo: [o.placa, o.modelo].filter(Boolean).join(" — ") || "—" })) : itens.map((o) => ({ id: o.id, rotulo: `${o.codigo_sku} — ${o.nome}${modulo === "ferramenta" ? sufixoTamanhoFerramenta(o) : ""}` }))}
                onChange={(v) => {
                  setAlvoId(v);
                  setTamanho("");
                }}
              />
              {modulo === "ferramenta" && tipoMovimentacao === "Entrada" && alvoId && (
                <EnderecoDaEntrada categoriaId="cat-ferramentas" empresaId={itens.find((i) => i.id === alvoId)?.empresa_id ?? ""} codigo={itens.find((i) => i.id === alvoId)?.codigo_sku ?? ""} />
              )}
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
            {comTamanho && controlaModulo(modulo) && tipoMovimentacao !== "Transferencia" && (
              <div className="space-y-1.5">
                <Label htmlFor="tamanho_movimentacao">Tamanho</Label>
                <SeletorTamanho
                  id="tamanho_movimentacao"
                  parametros={parametros}
                  modulo={modulo}
                  produto={itens.find((i) => i.id === alvoId)}
                  uso={
                    tipoMovimentacao === "Saida"
                      ? "saida"
                      : tipoMovimentacao === "Devolucao"
                        ? "devolucao"
                        : "entrada"
                  }
                  valor={tamanho}
                  aceitarTodos
                  onChange={setTamanho}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="empresa_id">Empresa</Label>
              <Select
                name="empresa_id"
                defaultValue={empresaPadraoParaEscolha(empresas, empresaId)}
              >
                <SelectTrigger id="empresa_id">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {empresasParaEscolha(empresas).map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome_fantasia}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={`space-y-1.5${ocultoNaEntrada}`}>
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
            <div className={`space-y-1.5${foco ? " hidden" : ""}`}>
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
            {(modulo === "ferramenta" || ehVeiculo) && !foco && (
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

            {ehVeiculo && MODO_DEMO && (
              <SeletorAcaoManutencao
                acoes={parametros.acoesManutencaoVeiculo}
                acaoId={acaoManutId}
                marcados={subitensMarcados}
                onAcao={setAcaoManutId}
                onMarcados={setSubitensMarcados}
              />
            )}

            {(modulo === "ferramenta" || ehVeiculo) && !foco && (
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

            {tipoMovimentacao === "Transferencia" && <><div><Label htmlFor="origem_local">Origem (setor/obra/custódia)</Label><Input name="origem_local" id="origem_local" capitalizar="texto" required maxLength={200} /></div><div><Label htmlFor="destino_local">Destino (setor/obra/custódia)</Label><Input name="destino_local" id="destino_local" capitalizar="texto" required maxLength={200} /></div></>}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="observacao">Observação</Label>
              <Textarea id="observacao" name="observacao" capitalizar="texto" maxLength={500} rows={3} />
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
      {soEntrada && modulo === "ferramenta" && colarAberto && <ColarPlanilhaDialog aberto={colarAberto} onAbertoMudou={setColarAberto} />}
      {soEntrada && compraAberta && <CompraFerramentaDialog aberto={compraAberta} onAbrirMudou={setCompraAberta} />}
    </div>
  );
}

