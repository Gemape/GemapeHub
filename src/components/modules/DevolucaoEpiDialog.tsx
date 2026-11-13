import { avisarOutrasAbas } from "@/lib/sincronia-abas";
import { BlocoEsqueleto } from "@/components/Esqueletos";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useRouteContext } from "@tanstack/react-router";

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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAccess } from "@/lib/access-context";
import { compraDeOrigem, origemDaDevolucao, posseDoEmpregado } from "@/lib/devolucao-estoque-epi";
import { soEmpregadosDeEpi } from "@/lib/empregados-epi";
import { soEmpregadosDeUniforme } from "@/lib/empregados-uniforme";
import { bloqueioPorDemissao, hojeLocal } from "@/lib/empregados";
import { lerMotivosDevolucaoEpi } from "@/lib/epi-parametros";
import { lerHistoricoEpiPorItem, mensagemSoAdmin, registrarDevolucaoEpi } from "@/lib/entrega-epi";
import { nomeTamanhoGravado } from "@/lib/estoque-tamanho";
import { formatarData } from "@/lib/gemape";
import { MODO_DEMO } from "@/lib/modo-demo";
import { useComprasEpis, useComprasUniformes, useEmpregados, useEmpresas, useItens } from "@/lib/hooks-gemape";
import { TODAS } from "@/lib/empresa-context";
import { useParametrosBase } from "@/lib/use-parametros-base";

type Escolha = { marcado: boolean; quantidade: number; motivo: string };

// Devolução na Entrada no Estoque (decisão 327): a primeira pergunta é o funcionário; dele sai a lista dos EPIs que ele tem em posse, o que é devolvido entra no estoque como usado
// (soma no estoque) e mantém os dados da compra original: data da compra, nota fiscal, fornecedor, tamanho e CA.
export function DevolucaoEpiDialog({
  aberto,
  onAbrirMudou,
  modulo = "epi",
}: {
  aberto: boolean;
  onAbrirMudou: (aberto: boolean) => void;
  modulo?: "epi" | "uniforme";
}) {
  const rotulo = modulo === "epi" ? "EPI" : "uniforme";
  const { isAdmin } = useAccess();
  const queryClient = useQueryClient();
  const { user } = useRouteContext({ from: "/_authenticated" });
  const responsavelPadrao = String(
    (user?.user_metadata as { nome?: unknown } | undefined)?.nome ?? user?.email ?? "",
  );
  const [empregadoId, setEmpregadoId] = useState("");
  const [data, setData] = useState(hojeLocal());
  const [responsavel, setResponsavel] = useState(responsavelPadrao);
  const [observacao, setObservacao] = useState("");
  const [escolhas, setEscolhas] = useState<Record<string, Escolha>>({});
  const [gravando, setGravando] = useState(false);
  const trava = useRef(false);
  const parametros = useParametrosBase();
  // Os motivos vêm de Parâmetros > EPI > Parâmetros Específicos (decisão 328).
  // Lê de novo a cada abertura da janela (aberto), para pegar o que acabou de ser cadastrado.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const motivos = useMemo(() => lerMotivosDevolucaoEpi(), [aberto]);

  const { data: empregados = [] } = useEmpregados(TODAS);
  const { data: empresas = [] } = useEmpresas();
  const empregado = empregados.find((e) => e.id === empregadoId);
  const empresaId = empregado?.empresa_id ?? "";
  const { data: itens = [] } = useItens(modulo, empresaId || TODAS);
  const { data: comprasEpi = [] } = useComprasEpis(empresaId || TODAS, "", modulo === "epi");
  const { data: comprasUniforme = [] } = useComprasUniformes(empresaId || TODAS, "", modulo === "uniforme");
  const compras = modulo === "epi" ? comprasEpi : comprasUniforme;
  const historico = useQuery({
    queryKey: [`${modulo}-devolucao-em-posse`, empresaId, empregadoId],
    enabled: aberto && Boolean(empresaId && empregadoId),
    queryFn: () => lerHistoricoEpiPorItem(supabase, { empresaId, empregadoId, modulo }),
  });
  const linhasEmPosse = useMemo(
    () =>
      posseDoEmpregado(historico.data ?? [], empregadoId)
        .map((p) => {
          const origem = compraDeOrigem(compras, p.itemId, p.tamanhoId);
          return {
            ...p,
            chave: `${p.itemId}|${p.tamanhoId ?? ""}`,
            item: itens.find((i) => i.id === p.itemId),
            origem,
          };
        })
        .filter((l) => l.item),
    [historico.data, empregadoId, compras, itens],
  );

  function fechar(a: boolean) {
    if (!a) {
      setEmpregadoId("");
      setEscolhas({});
      setObservacao("");
      setData(hojeLocal());
    }
    onAbrirMudou(a);
  }
  const escolha = (chave: string, posse: number): Escolha =>
    escolhas[chave] ?? { marcado: false, quantidade: posse, motivo: "" };
  const marcadas = linhasEmPosse.filter((l) => escolha(l.chave, l.quantidade).marcado);

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    if (trava.current) return;
    if (!isAdmin) {
      alert(mensagemSoAdmin(modulo));
      return;
    }
    if (!empregado) {
      alert("Escolha o funcionário.");
      return;
    }
    if (marcadas.length === 0) {
      alert(`Marque pelo menos um ${rotulo} para devolver.`);
      return;
    }
    if (!data) {
      alert("Informe a data da devolução.");
      return;
    }
    const bloqueio = bloqueioPorDemissao(empregado, "devolucao", data);
    if (bloqueio) {
      alert(bloqueio);
      return;
    }
    const linhas = marcadas.map((l) => {
      const q = Number(escolha(l.chave, l.quantidade).quantidade);
      return { l, q };
    });
    const invalida = linhas.find(({ l, q }) => !Number.isInteger(q) || q < 1 || q > l.quantidade);
    if (invalida) {
      alert(
        `Informe uma quantidade inteira entre 1 e ${invalida.l.quantidade} para ${invalida.l.item?.nome}.`,
      );
      return;
    }
    const semMotivo = marcadas.find((l) => !escolha(l.chave, l.quantidade).motivo);
    if (semMotivo) {
      alert(`Escolha o motivo da devolução de ${semMotivo.item?.nome}.`);
      return;
    }
    const empresa = empresas.find((x) => x.id === empresaId);
    trava.current = true;
    setGravando(true);
    try {
      const r = await registrarDevolucaoEpi(supabase, {
        empresaId,
        empregado,
        data,
        observacao,
        modulo,
        comCodigo: MODO_DEMO,
        administrador: isAdmin,
        responsavel,
        linhas: linhas.map(({ l, q }) => ({
          item_id: l.itemId,
          quantidade: q,
          tamanho_id: l.tamanhoId,
          origem: l.origem ? origemDaDevolucao(l.origem, l.item?.ca) : null,
          motivo_devolucao: escolha(l.chave, l.quantidade).motivo,
        })),
      });
      queryClient.invalidateQueries();
      avisarOutrasAbas();
      toast.success("Devolução registrada como entrada de usado", {
        description:
          [...r.codigos, empresa?.nome_fantasia].filter(Boolean).join(" · ") || undefined,
      });
      fechar(false);
    } catch (erro) {
      alert((erro as Error).message);
    } finally {
      trava.current = false;
      setGravando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={fechar}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Devolução de {rotulo}</DialogTitle>
          <DialogDescription>
            O que for devolvido entra no estoque como produto usado, com os dados da compra
            original: data da compra, nota fiscal, fornecedor, tamanho{modulo === "epi" ? " e CA" : ""}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={registrar} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="dev_funcionario">Funcionário</Label>
            <Select
              value={empregadoId}
              onValueChange={(v) => {
                setEmpregadoId(v);
                setEscolhas({});
              }}
            >
              <SelectTrigger id="dev_funcionario">
                <SelectValue placeholder="Selecione o funcionário" />
              </SelectTrigger>
              <SelectContent>
                {(modulo === "epi" ? soEmpregadosDeEpi : soEmpregadosDeUniforme)(empregados).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                    {empresas.find((x) => x.id === e.empresa_id)
                      ? ` · ${empresas.find((x) => x.id === e.empresa_id)?.nome_fantasia}`
                      : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {empregado && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{modulo === "epi" ? "EPIs" : "Uniformes"} em posse de {empregado.nome}</p>
              {historico.isLoading ? (
                <BlocoEsqueleto cartoes={0} linhas={3} rotulo="Carregando o que está em posse" />
              ) : linhasEmPosse.length === 0 ? (
                <p className="rounded-lg border p-3 text-sm text-muted-foreground">
                  Este funcionário não tem {rotulo} em posse para devolver.
                </p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {linhasEmPosse.map((l) => {
                    const e = escolha(l.chave, l.quantidade);
                    const tamanho = l.tamanhoId ? nomeTamanhoGravado(parametros, l.tamanhoId) : "";
                    return (
                      <li
                        key={l.chave}
                        className="grid gap-2 p-3 sm:grid-cols-[auto_1fr_7rem_11rem] sm:items-center"
                      >
                        <Checkbox
                          aria-label={`Devolver ${l.item?.nome}`}
                          checked={e.marcado}
                          onCheckedChange={(v) =>
                            setEscolhas((a) => ({ ...a, [l.chave]: { ...e, marcado: v === true } }))
                          }
                        />
                        <div className="min-w-0 text-sm">
                          <p className="font-medium">
                            {l.item?.codigo_sku} · {l.item?.nome}
                            {tamanho ? ` · Tamanho ${tamanho}` : ""}{" "}
                            <span className="font-normal text-muted-foreground">
                              (em posse: {l.quantidade})
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {l.origem
                              ? `Compra original: ${formatarData(l.origem.data_compra)} · NF ${l.origem.nota_fiscal || "não informada"} · ${l.origem.fornecedor || "fornecedor não informado"}${modulo === "epi" ? ` · CA ${l.origem.ca || l.item?.ca || "não informado"}` : ""}`
                              : `Sem compra de origem registrada para este ${rotulo}.`}
                          </p>
                        </div>
                        <Input
                          aria-label={`Quantidade de ${l.item?.nome}`}
                          type="number"
                          min={1}
                          max={l.quantidade}
                          step={1}
                          value={e.quantidade}
                          disabled={!e.marcado}
                          onChange={(ev) =>
                            setEscolhas((a) => ({
                              ...a,
                              [l.chave]: { ...e, quantidade: Number(ev.target.value) },
                            }))
                          }
                        />
                        <Select
                          value={e.motivo}
                          disabled={!e.marcado}
                          onValueChange={(v) =>
                            setEscolhas((a) => ({ ...a, [l.chave]: { ...e, motivo: v } }))
                          }
                        >
                          <SelectTrigger aria-label={`Motivo da devolução de ${l.item?.nome}`}>
                            <SelectValue placeholder="Motivo" />
                          </SelectTrigger>
                          <SelectContent>
                            {motivos.map((m) => (
                              <SelectItem key={m} value={m}>
                                {m}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dev_data">Data da devolução</Label>
              <Input
                id="dev_data"
                type="date"
                required
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dev_resp">Responsável pelo recebimento</Label>
              <Input
                id="dev_resp"
                required
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="dev_obs">Observação</Label>
              <Textarea
                id="dev_obs"
                capitalizar="texto"
                rows={2}
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
            </div>
          </div>
          {!isAdmin && (
            <p className="text-xs text-muted-foreground">
              A devolução de {rotulo} é registrada somente pelo Administrador.
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => fechar(false)}>
              Cancelar
            </Button>
            <Button requiresWrite type="submit" disabled={gravando || marcadas.length === 0}>
              Registrar devolução
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
