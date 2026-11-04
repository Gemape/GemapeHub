import { GradeDeCartoes } from "@/components/GradeDeCartoes";
import { BarraDeFiltros } from "@/components/layout/BarraDeFiltros";
import { Banknote, Droplets, Fuel, Gauge } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAccess } from "@/lib/access-context";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { montarExtratoHtml } from "@/lib/extrato-html";
import { formatarData } from "@/lib/gemape";
import { combinaBusca } from "@/lib/parametros-base";
import { registrarAbastecimentoEq, removerAbastecimentoEq, ultimoHorimetro } from "@/lib/registros-equipamento";
import { executar } from "@/lib/use-parametros-base";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";
import { abasteceCombustivel, agoraBrasilia, hoje, horimetroEmTexto, numero, reais, rotuloDoEquipamento, TODOS, useAbastecimentosEq, useEquipamentosDaEmpresa } from "./comum";


// Módulos > Equipamentos > Abastecimento: como em Veículos, mas com horímetro no lugar do km. Só aparecem equipamentos com motor a combustão
// (diesel, gasolina ou gás); o histórico mostra as horas trabalhadas, o consumo em L/h e o R$/L de cada abastecimento. Só modo demonstração.
export function AbastecimentoEquipamentoModulo() {
  const { canDelete } = useAccess();
  const { empresaId, empresas } = useEmpresa();
  const equipamentos = useEquipamentosDaEmpresa().filter(abasteceCombustivel);
  const todos = useAbastecimentosEq();
  const [aberto, setAberto] = useState(false);
  const [filtro, setFiltro] = useState(TODOS);
  const [busca, setBusca] = useState("");
  const ids = new Set(equipamentos.map((e) => e.id));
  const filtroValido = filtro === TODOS || ids.has(filtro) ? filtro : TODOS;

  // Histórico por equipamento (as horas só fazem sentido dentro do mesmo equipamento), do mais recente ao mais antigo.
  const linhas = useMemo(() => {
    const doEquipamento = (id: string) => todos.filter((a) => a.equipamentoId === id).sort((a, b) => `${a.data}T${a.hora}`.localeCompare(`${b.data}T${b.hora}`) || a.horimetro - b.horimetro);
    return equipamentos
      .filter((e) => filtroValido === TODOS || e.id === filtroValido)
      .flatMap((e) => doEquipamento(e.id).map((a, i, lista) => {
        const horas = i === 0 ? null : a.horimetro - lista[i - 1]!.horimetro;
        return { ...a, rotulo: rotuloDoEquipamento(e), horas, litrosPorHora: horas && horas > 0 ? a.litros / horas : null, precoLitro: a.litros > 0 ? a.valor / a.litros : null };
      }))
      .filter((a) => combinaBusca(busca, a.rotulo, formatarData(a.data), a.hora, String(a.horimetro), String(a.litros)))
      .sort((a, b) => `${b.data}T${b.hora}`.localeCompare(`${a.data}T${a.hora}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipamentos.length, todos, filtroValido, busca]);
  const resumo = { litros: linhas.reduce((s, a) => s + a.litros, 0), gasto: linhas.reduce((s, a) => s + a.valor, 0) };

  // Relatório de abastecimento por equipamento, no padrão dos demais: um quadro por equipamento (as horas e o L/h só valem dentro dele), com os mesmos
  // filtros da tela (equipamento escolhido e busca), os totais de cada um e o resumo no topo. Abre direto no visualizador, em tela cheia, onde se gera o PDF.
  function gerarRelatorio() {
    const grupos = equipamentos
      .filter((e) => linhas.some((a) => a.equipamentoId === e.id))
      .map((e) => {
        const dele = linhas.filter((a) => a.equipamentoId === e.id);
        const litros = dele.reduce((t, a) => t + a.litros, 0);
        const gasto = dele.reduce((t, a) => t + a.valor, 0);
        // Consumo médio do histórico inteiro do equipamento: litros dos abastecimentos depois do primeiro, divididos pelas horas entre o primeiro e o último.
        const todosDele = todos.filter((a) => a.equipamentoId === e.id).sort((a, b) => `${a.data}T${a.hora}`.localeCompare(`${b.data}T${b.hora}`));
        const horas = todosDele.length > 1 ? todosDele[todosDele.length - 1]!.horimetro - todosDele[0]!.horimetro : 0;
        const media = horas > 0 ? todosDele.slice(1).reduce((t, a) => t + a.litros, 0) / horas : null;
        return { e, dele, litros, gasto, media };
      });
    const litrosTotal = grupos.reduce((t, g) => t + g.litros, 0);
    const gastoTotal = grupos.reduce((t, g) => t + g.gasto, 0);
    const fmtMedia = (m: number | null) => (m === null ? "—" : `${numero(m)} L/h`);
    const unico = grupos.length === 1 ? grupos[0]! : null;
    const doFiltro = filtroValido === TODOS ? null : equipamentos.find((e) => e.id === filtroValido);
    const assunto = doFiltro ? rotuloDoEquipamento(doFiltro) : "Todos os equipamentos a combustão";
    const html = montarExtratoHtml({
      titulo: "Relatório de abastecimento",
      assunto,
      subtitulo: busca.trim() ? `Busca: ${busca.trim()}` : "Abastecimentos por equipamento",
      empresa: empresaId === TODAS ? "Todas as empresas" : (empresas.find((x) => x.id === empresaId)?.nome_fantasia ?? ""),
      resumo: [
        ...(unico ? [] : ([["Equipamentos", String(grupos.length)]] as [string, string][])),
        ["Abastecimentos", String(linhas.length)],
        ["Litros", numero(litrosTotal)],
        ["Total gasto", reais(gastoTotal)],
        ...(unico ? ([["Consumo médio", fmtMedia(unico.media)]] as [string, string][]) : []),
      ],
      tabelas: grupos.length === 0
        ? [{ titulo: "Abastecimentos", vazio: busca.trim() ? "Nenhum resultado para a busca." : "Nenhum abastecimento registrado.", colunas: [{ titulo: "Data e hora" }], linhas: [] }]
        : grupos.map((g) => ({
            titulo: rotuloDoEquipamento(g.e),
            vazio: "Nenhum abastecimento registrado.",
            nota: `Total: ${g.dele.length} abastecimento(s) · ${numero(g.litros)} L · ${reais(g.gasto)} · consumo médio ${fmtMedia(g.media)}`,
            colunas: [{ titulo: "Data e hora" }, { titulo: "Horímetro", direita: true }, { titulo: "Horas trabalhadas", direita: true }, { titulo: "Litros", direita: true }, { titulo: "Valor", direita: true }, { titulo: "R$/L", direita: true }, { titulo: "L/h", direita: true }],
            linhas: g.dele.map((a) => [
              `${formatarData(a.data)} ${a.hora}`, `${numero(a.horimetro)} h`, a.horas === null ? "—" : `${numero(a.horas)} h`, numero(a.litros), reais(a.valor), reais(a.precoLitro),
              a.litrosPorHora === null ? "—" : numero(a.litrosPorHora),
            ]),
          })),
    });
    abrirDocumento({ titulo: "Relatório de abastecimento", html, arquivo: nomeArquivoDocumento("Relatorio de abastecimento", assunto), telaCheia: true });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Button variant="outline" onClick={gerarRelatorio} disabled={equipamentos.length === 0}>Gerar PDF</Button>
        <Button requiresWrite onClick={() => setAberto(true)} disabled={equipamentos.length === 0}>Novo abastecimento</Button>
        <BarraDeFiltros>
          <div className="space-y-1.5">
            <Label htmlFor="filtro_equipamento">Histórico por equipamento</Label>
            <Select value={filtroValido} onValueChange={setFiltro}>
              <SelectTrigger id="filtro_equipamento" className="w-80 max-w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos os equipamentos a combustão</SelectItem>
                {equipamentos.map((e) => <SelectItem key={e.id} value={e.id}>{rotuloDoEquipamento(e)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Input aria-label="Buscar abastecimento" placeholder="Buscar por equipamento, data ou horímetro" className="max-w-xs" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </BarraDeFiltros>
      </div>
      {equipamentos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum equipamento com motor a combustão cadastrado. Cadastre em Parâmetros &gt; Equipamentos com propulsão a diesel, gasolina ou gás.</p>}

      {/* Cartões no modelo da Frota (decisão 392): título, o que o número mostra, o valor e um detalhe. */}
      <GradeDeCartoes colunas={4}>
        <StatCard titulo="Abastecimentos" subtitulo="Registros dos equipamentos, no filtro e na busca escolhidos." valor={linhas.length} detalhe={linhas[0] ? `Último em ${formatarData(linhas[0].data)}` : "Nenhum no filtro"} icone={Fuel} compacto />
        <StatCard titulo="Litros" subtitulo="Soma dos litros abastecidos nos registros da tela." valor={numero(resumo.litros)} detalhe={linhas.length > 0 ? `${numero(resumo.litros / linhas.length)} L por abastecimento` : "Sem litros no filtro"} icone={Droplets} compacto />
        <StatCard titulo="Total gasto" subtitulo="Soma dos valores pagos nos abastecimentos da tela." valor={reais(resumo.gasto)} detalhe={`${linhas.length} abastecimento${linhas.length === 1 ? "" : "s"}`} icone={Banknote} compacto />
        <StatCard titulo="Preço médio por litro" subtitulo="Total gasto ÷ litros abastecidos." valor={resumo.litros > 0 ? reais(resumo.gasto / resumo.litros) : "—"} detalhe={resumo.litros > 0 ? "Média dos registros da tela" : "Sem litros no filtro"} icone={Gauge} compacto />
      </GradeDeCartoes>

      {/* A lista usa o que sobra da janela e rola por dentro, para a página não rolar (decisão 337). */}
      <div className="max-h-[max(12rem,calc(100dvh-27rem))] flex flex-col overflow-hidden rounded-xl border [&>div]:min-h-0 [&>div]:flex-1 [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data e hora</TableHead><TableHead>Equipamento</TableHead>
              <TableHead className="text-right">Horímetro</TableHead><TableHead className="text-right">Horas trabalhadas</TableHead>
              <TableHead className="text-right">Litros</TableHead><TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">R$/L</TableHead><TableHead className="text-right">L/h</TableHead><TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 && <TableRow><TableCell colSpan={9} className="py-6 text-center text-muted-foreground">{busca.trim() ? "Nenhum resultado para a busca." : "Nenhum abastecimento registrado."}</TableCell></TableRow>}
            {linhas.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{formatarData(a.data)} {a.hora}</TableCell>
                <TableCell>{a.rotulo}</TableCell>
                <TableCell className="text-right">{numero(a.horimetro)} h</TableCell>
                <TableCell className="text-right">{a.horas === null ? "—" : `${numero(a.horas)} h`}</TableCell>
                <TableCell className="text-right">{numero(a.litros)}</TableCell>
                <TableCell className="text-right">{reais(a.valor)}</TableCell>
                <TableCell className="text-right">{reais(a.precoLitro)}</TableCell>
                <TableCell className="text-right">{a.litrosPorHora === null ? "—" : numero(a.litrosPorHora)}</TableCell>
                <TableCell className="text-right">
                  {canDelete && <Button requiresWrite variant="ghost" size="sm" aria-label="Excluir abastecimento" className="text-destructive hover:text-destructive" onClick={() => { if (confirm("Excluir este abastecimento?")) executar(() => removerAbastecimentoEq(a.id), "Abastecimento excluído"); }}>Excluir</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <NovoAbastecimento aberto={aberto} aoMudar={setAberto} equipamentos={equipamentos} aoSalvar={(id) => setFiltro(id)} />
    </div>
  );
}

export function NovoAbastecimento({ aberto, aoMudar, equipamentos, aoSalvar, equipamentoInicial = "" }: { aberto: boolean; aoMudar: (v: boolean) => void; equipamentos: { id: string; patrimonio: string; nome: string }[]; aoSalvar: (id: string) => void; equipamentoInicial?: string }) {
  const [equipamentoId, setEquipamentoId] = useState(equipamentoInicial);
  const sugestao = equipamentoId ? ultimoHorimetro(equipamentoId) : null;
  // Fechar (cancelar ou salvar) limpa o equipamento escolhido.
  const fechar = (v: boolean) => { if (!v) setEquipamentoId(equipamentoInicial); aoMudar(v); };
  return (
    <Dialog open={aberto} onOpenChange={fechar}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo abastecimento</DialogTitle>
          <DialogDescription>Escolha o equipamento e informe o horímetro (nunca menor que o do registro anterior), os litros e o valor.</DialogDescription>
        </DialogHeader>
        <form
          key={String(aberto)}
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(ev) => {
            ev.preventDefault();
            const f = new FormData(ev.currentTarget);
            const ok = executar(() => registrarAbastecimentoEq({ equipamentoId, data: String(f.get("data")), hora: String(f.get("hora")), horimetro: String(f.get("horimetro")), litros: String(f.get("litros")), valor: String(f.get("valor")) }), "Abastecimento registrado");
            if (ok) { aoSalvar(equipamentoId); fechar(false); }
          }}
        >
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="eq_abast">Equipamento</Label>
            <Select value={equipamentoId} onValueChange={setEquipamentoId}>
              <SelectTrigger id="eq_abast"><SelectValue placeholder="Selecione o equipamento" /></SelectTrigger>
              <SelectContent>{equipamentos.map((e) => <SelectItem key={e.id} value={e.id}>{rotuloDoEquipamento(e)}</SelectItem>)}</SelectContent>
            </Select>
            {sugestao !== null && <p className="text-xs text-muted-foreground">Último horímetro registrado: {numero(sugestao)} h.</p>}
          </div>
          <div className="space-y-1.5"><Label htmlFor="data">Data</Label><Input id="data" name="data" type="date" max={hoje()} defaultValue={hoje()} required /></div>
          <div className="space-y-1.5"><Label htmlFor="hora">Hora</Label><Input id="hora" name="hora" type="time" defaultValue={agoraBrasilia()} required /></div>
          <div className="space-y-1.5"><Label htmlFor="horimetro">Horímetro (h)</Label><Input id="horimetro" name="horimetro" inputMode="decimal" key={equipamentoId} defaultValue={horimetroEmTexto(sugestao)} required /></div>
          <div className="space-y-1.5"><Label htmlFor="litros">Litros</Label><Input id="litros" name="litros" inputMode="decimal" placeholder="40,5" required /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="valor">Valor (R$)</Label><Input id="valor" name="valor" inputMode="decimal" placeholder="250,00" required /></div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => fechar(false)}>Cancelar</Button>
            <Button requiresWrite type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
