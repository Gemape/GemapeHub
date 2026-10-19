import { useState } from "react";

import { NovaManutencaoDialog } from "@/components/modules/NovaManutencaoDialog";
import { rotuloDoVeiculo } from "@/components/modules/rotulo-veiculo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAccess } from "@/lib/access-context";
import { combinaBusca } from "@/lib/parametros-base";
import { useEmpresa } from "@/lib/empresa-context";
import { formatarData } from "@/lib/gemape";
import { montarManutencaoHtml } from "@/lib/manutencao-relatorio-html";
import { useVeiculos } from "@/lib/hooks-gemape";
import { gruposDaManutencao, locaisDaManutencao, removerManutencao, resumoManutencao, rotuloDoLocal, type ManutencaoVeiculo } from "@/lib/registros-veiculo";
import { useManutencoesVeiculo } from "@/lib/use-registros-veiculo";
import { executar, useParametrosBase } from "@/lib/use-parametros-base";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";

const MODO_DEMO = import.meta.env["VITE_DEMO_MODE"] !== "false";

// Módulos > Veículos > Manutenção (decisões 57 e 61): veículo, preventiva ou corretiva (só a
// corretiva descreve o que acontece), grupos de ações (pai, quantos a manutenção abranger), ações de
// cada grupo (filhos) com observação livre cada uma, local (empresa ou terceiro) e custo de peças e de mão de obra. A última
// preventiva de cada grupo alimenta as sugestões do extrato. Só modo demonstração.
const moeda = (n: number | undefined) => (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export function ManutencaoVeiculoModulo() {
  const { empresaId, empresas } = useEmpresa();
  const { isAdmin, canWrite } = useAccess();
  const parametros = useParametrosBase();
  const { data: veiculos = [] } = useVeiculos(empresaId);
  const todas = useManutencoesVeiculo();
  const [aberto, setAberto] = useState(false);
  // Manutenção em edição; null é o cadastro de uma nova.
  const [editando, setEditando] = useState<ManutencaoVeiculo | null>(null);
  const [busca, setBusca] = useState("");

  const acoes = parametros.acoesManutencaoVeiculo;
  const idsDaEmpresa = new Set(veiculos.map((v) => v.id));
  const servicoDe = (m: (typeof todas)[number]) => resumoManutencao(m, (id) => acoes.find((a) => a.id === id)?.nome);
  const lista = todas
    .filter((m) => idsDaEmpresa.has(m.veiculoId))
    .filter((m) => {
      const v = veiculos.find((x) => x.id === m.veiculoId);
      return combinaBusca(busca, v ? rotuloDoVeiculo(parametros, v) : "", m.tipo, servicoDe(m), formatarData(m.data), String(m.km));
    })
    .sort((a, b) => b.data.localeCompare(a.data) || b.km - a.km);

  if (!MODO_DEMO) {
    return <p className="text-sm text-muted-foreground">A manutenção de veículos estará disponível após a Fase 2 (banco real).</p>;
  }

  function abrir(m?: ManutencaoVeiculo) {
    setEditando(m ?? null);
    setAberto(true);
  }

  // Relatório da manutenção, separado por grupo de serviço, no visualizador do sistema (imprimir ou salvar em PDF).
  function gerarRelatorio(m: ManutencaoVeiculo) {
    const v = veiculos.find((x) => x.id === m.veiculoId);
    const veiculo = v ? rotuloDoVeiculo(parametros, v) : "Veículo";
    const empresa = empresas.find((e) => e.id === v?.empresa_id)?.razao_social ?? "GEMAPE";
    abrirDocumento({
      titulo: "Relatório de manutenção",
      html: montarManutencaoHtml(m, {
        empresa, veiculo, nomeGrupo: (id) => acoes.find((a) => a.id === id)?.nome,
        logoUrl: `${window.location.origin}${import.meta.env["BASE_URL"] ?? "/"}logo-relatorio-viagens.png`,
      }),
      arquivo: nomeArquivoDocumento("Manutencao", veiculo, m.data),
    });
  }

  function excluir(id: string) {
    if (!confirm("Excluir esta manutenção?")) return;
    executar(() => removerManutencao(id), "Manutenção excluída");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Buscar manutenção"
          placeholder="Buscar por veículo, serviço ou tipo"
          className="max-w-xs"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <p className="text-sm text-muted-foreground">{lista.length} manutenção(ões).</p>
        <Button requiresWrite className="ml-auto" onClick={() => abrir()}>Cadastrar nova manutenção</Button>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Veículo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Serviço</TableHead>
              <TableHead>Local</TableHead>
              <TableHead className="text-right">Custo total</TableHead>
              <TableHead className="text-right">Km</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.length === 0 && (
              <TableRow><TableCell colSpan={8} className="py-6 text-center text-muted-foreground">{busca.trim() ? "Nenhum resultado para a busca." : "Nenhuma manutenção registrada."}</TableCell></TableRow>
            )}
            {lista.map((m) => {
              const v = veiculos.find((x) => x.id === m.veiculoId);
              const servico = servicoDe(m);
              return (
                <TableRow key={m.id}>
                  <TableCell>{formatarData(m.data)}</TableCell>
                  <TableCell>{v ? rotuloDoVeiculo(parametros, v) : "—"}</TableCell>
                  <TableCell><Badge variant={m.tipo === "Preventiva" ? "secondary" : "outline"}>{m.tipo}</Badge></TableCell>
                  <TableCell>
                    {gruposDaManutencao(m).length === 0 ? servico : (
                      <div className="space-y-1">
                        {gruposDaManutencao(m).map((g) => (
                          <p key={g.acaoId} className="leading-snug">
                            <span className="font-medium">{acoes.find((a) => a.id === g.acaoId)?.nome ?? (g.nome || "Ação removida de Parâmetros")}</span>
                            {g.itens.length > 0 && <span className="text-muted-foreground">: {g.itens.map((i) => i.nome).join(", ")}</span>}
                            {g.itens.filter((i) => i.observacao).map((i) => (
                              <span key={i.subitemId} className="block text-xs text-muted-foreground">{i.nome}: {i.observacao}</span>
                            ))}
                            {(g.naoRealizados ?? []).map((n) => (
                              <span key={n.subitemId} className="block text-xs text-amber-700">Não realizado, {n.nome}: {n.observacao}</span>
                            ))}
                          </p>
                        ))}
                        {m.tipo === "Corretiva" && m.descricao && <p className="text-xs text-muted-foreground">{m.descricao}</p>}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {locaisDaManutencao(m).length === 0 ? "—" : (
                      <div className="space-y-1">
                        {locaisDaManutencao(m).map((l, i) => <p key={i} className="leading-snug">{rotuloDoLocal(l)}</p>)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right" title={m.custoTotal === undefined ? undefined : `Peças ${moeda(m.custoPecas)} + mão de obra ${moeda(m.custoMaoDeObra)}`}>
                    {m.custoTotal === undefined ? "—" : moeda(m.custoTotal)}
                    {locaisDaManutencao(m).length > 1 && (
                      <div className="mt-1 space-y-0.5 text-xs font-normal text-muted-foreground">
                        {locaisDaManutencao(m).map((l, i) => <p key={i}>{moeda(l.custoTotal)}</p>)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{m.km.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <Button variant="ghost" size="sm" aria-label="Relatório da manutenção" onClick={() => gerarRelatorio(m)}>Relatório</Button>
                    <Button requiresWrite variant="ghost" size="sm" aria-label="Editar manutenção" onClick={() => abrir(m)}>Editar</Button>
                    {isAdmin && (
                      <Button requiresWrite variant="ghost" size="sm" aria-label="Excluir manutenção" className="text-destructive hover:text-destructive" onClick={() => excluir(m.id)}>
                        Excluir
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <NovaManutencaoDialog
        aberto={aberto}
        aoMudar={setAberto}
        editando={editando}
        aoSalvar={(gravada, editou) => {
          // Ao cadastrar, o relatório da manutenção abre na hora, separado por grupo de serviço.
          if (!editou) gerarRelatorio(gravada);
        }}
      />
    </div>
  );
}
