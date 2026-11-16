import { useMemo, useState } from "react";

import { Etapas } from "@/components/Etapas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { combinaBuscaTolerante } from "@/lib/busca-tolerante";
import { useEmpresa } from "@/lib/empresa-context";
import { empresasParaEscolha } from "@/lib/empresas";
import { hojeLocal } from "@/lib/empregados";
import { estadoEstoqueModulo } from "@/lib/estoque-tamanho";
import { exportarCsv, formatarData, type Modulo } from "@/lib/gemape";
import { useItens } from "@/lib/hooks-gemape";
import { divergencias, quantidadeContada, semContagem, textoFaltam, type Contagens, type LinhaInventario } from "@/lib/inventario";
import { useParametrosBase } from "@/lib/use-parametros-base";

const ETAPAS = ["Seleção do setor", "Contagem física", "Revisão de divergências", "Conclusão"] as const;

// Inventário geral (contagem física) em quatro etapas. Voltar a uma etapa anterior não apaga nada: tudo fica no estado desta tela.
// É conferência: o resultado sai num relatório; o estoque não muda (o acerto é lançado pela Entrada no estoque ou pela baixa, com o motivo).
export function InventarioContagem({ modulo }: { modulo: Extract<Modulo, "epi" | "uniforme" | "ferramenta"> }) {
  const { empresaId, empresas } = useEmpresa();
  const parametros = useParametrosBase();
  const escolhiveis = empresasParaEscolha(empresas);
  const [etapa, setEtapa] = useState(0);
  const [empresa, setEmpresa] = useState(() => escolhiveis.find((e) => e.id === empresaId)?.id ?? "");
  const [filtro, setFiltro] = useState("");
  const [contagens, setContagens] = useState<Contagens>({});
  const { data: itens = [], isLoading } = useItens(modulo, empresa, "", !!empresa);

  const linhas: LinhaInventario[] = useMemo(
    () => itens
      .filter((i) => i.status !== "Inativo" && combinaBuscaTolerante(filtro, i.nome, i.codigo_sku ?? ""))
      .map((i) => ({ id: i.id, codigo: i.codigo_sku ?? "", nome: i.nome, saldo: estadoEstoqueModulo(parametros, modulo, i).saldo }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [itens, filtro, parametros, modulo],
  );
  const faltam = semContagem(linhas, contagens);
  const diverge = divergencias(linhas, contagens);
  const nomeEmpresa = escolhiveis.find((e) => e.id === empresa)?.nome_fantasia ?? "";

  // O que impede o Próximo de cada etapa, dito logo acima do botão.
  const bloqueio = etapa === 0
    ? (!empresa ? "Escolha a empresa para avançar." : isLoading ? "Carregando os itens…" : linhas.length === 0 ? "Nenhum item ativo neste setor. Mude a empresa ou o filtro." : "")
    : etapa === 1 && faltam.length > 0 ? textoFaltam(faltam.length) : "";

  function exportar() {
    exportarCsv(`inventario-${modulo}-${hojeLocal()}`, linhas.map((l) => {
      const contado = quantidadeContada(contagens[l.id]) ?? 0;
      return { Código: l.codigo, Item: l.nome, "Saldo no sistema": l.saldo, Contado: contado, Diferença: contado - l.saldo, Empresa: nomeEmpresa, Data: formatarData(hojeLocal()) };
    }));
  }

  return (
    <div className="space-y-5">
      <Etapas titulos={ETAPAS} atual={etapa} aoIr={setEtapa} />

      {etapa === 0 && (
        <section aria-label={ETAPAS[0]} className="grid max-w-xl gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="inv-empresa">Empresa</Label>
            <Select value={empresa} onValueChange={(v) => { setEmpresa(v); setContagens({}); }}>
              <SelectTrigger id="inv-empresa"><SelectValue placeholder="Escolha a empresa" /></SelectTrigger>
              <SelectContent>{escolhiveis.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome_fantasia}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-filtro">Itens a contar (opcional)</Label>
            <Input id="inv-filtro" placeholder="Filtrar por nome ou código (vazio = todos)" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
            {empresa && !isLoading && <p className="text-xs text-muted-foreground">{linhas.length} item(ns) para contar.</p>}
          </div>
        </section>
      )}

      {etapa === 1 && (
        <section aria-label={ETAPAS[1]} className="space-y-2">
          <p className="text-sm text-muted-foreground">Digite a quantidade encontrada na prateleira de cada item. Prateleira vazia é 0.</p>
          <div className="panel overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Item</TableHead><TableHead className="w-40">Quantidade contada</TableHead></TableRow></TableHeader>
              <TableBody>
                {linhas.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono text-xs">{l.codigo}</TableCell>
                    <TableCell><label htmlFor={`inv-${l.id}`}>{l.nome}</label></TableCell>
                    <TableCell>
                      <Input id={`inv-${l.id}`} inputMode="decimal" className="w-28" value={contagens[l.id] ?? ""}
                        aria-invalid={(contagens[l.id] ?? "") !== "" && quantidadeContada(contagens[l.id]) === null ? true : undefined}
                        onChange={(e) => setContagens((c) => ({ ...c, [l.id]: e.target.value }))} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {etapa === 2 && (
        <section aria-label={ETAPAS[2]} className="space-y-2">
          {diverge.length === 0 ? (
            <p className="text-sm">Nenhuma divergência: a contagem bate com o sistema em todos os {linhas.length} item(ns).</p>
          ) : (
            <>
              <p className="text-sm">{diverge.length} item(ns) com diferença. Para corrigir uma contagem, volte à etapa 2 (nada se perde).</p>
              <div className="panel overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Sistema</TableHead><TableHead className="text-right">Contado</TableHead><TableHead className="text-right">Diferença</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {diverge.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>{d.nome}</TableCell>
                        <TableCell className="text-right tabular-nums">{d.saldo}</TableCell>
                        <TableCell className="text-right tabular-nums">{d.contado}</TableCell>
                        <TableCell className={`text-right font-medium tabular-nums ${d.diferenca < 0 ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"}`}>
                          {d.diferenca > 0 ? `+${d.diferenca} (sobra)` : `${d.diferenca} (falta)`}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </section>
      )}

      {etapa === 3 && (
        <section aria-label={ETAPAS[3]} className="max-w-xl space-y-3 text-sm">
          <p><strong>{linhas.length}</strong> item(ns) contados em <strong>{nomeEmpresa}</strong>; <strong>{diverge.length}</strong> com diferença.</p>
          <p className="text-muted-foreground">O inventário é conferência: o estoque não muda. Para acertar o saldo, lance a sobra pela Entrada no estoque e a falta pela baixa, com o motivo.</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={exportar}>Baixar relatório do inventário (CSV)</Button>
            <Button type="button" variant="outline" onClick={() => { setContagens({}); setEtapa(0); }}>Começar novo inventário</Button>
          </div>
        </section>
      )}

      {etapa < 3 && (
        <div className="space-y-2 border-t pt-3">
          {bloqueio && <p role="status" className="text-sm font-medium text-amber-700 dark:text-amber-300">{bloqueio}</p>}
          <div className="flex gap-2">
            {etapa > 0 && <Button type="button" variant="outline" onClick={() => setEtapa(etapa - 1)}>Voltar</Button>}
            <Button type="button" disabled={!!bloqueio} onClick={() => setEtapa(etapa + 1)}>
              {etapa === 2 ? "Concluir inventário" : "Próximo"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
