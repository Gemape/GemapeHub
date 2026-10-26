import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEmpresa } from "@/lib/empresa-context";
import type { Equipamento } from "@/lib/equipamentos-demo";
import { STATUS_EQUIPAMENTO } from "@/lib/equipamentos";
import { formatarData } from "@/lib/gemape";
import { montarExtratoHtml, type Celula } from "@/lib/extrato-html";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";
import { combinaBusca } from "@/lib/parametros-base";
import { pendenciasAbertasEq } from "@/lib/checklist-equipamento-exec";
import { custoDaManutencaoEq, ultimoHorimetro } from "@/lib/registros-equipamento";
import { nomeDoTipo, numero, reais, rotuloDoEquipamento, TODOS, useAbastecimentosEq, useChecklistsEq, useEquipamentosDaEmpresa, useManutencoesEq, useOcorrenciasEq } from "./comum";

// Módulos > Equipamentos > Inventário dos Equipamentos: a lista dos equipamentos cadastrados em Parâmetros > Equipamentos com a situação de cada um
// (status, horímetro, última manutenção, ocorrências abertas e último check list) e o extrato completo por equipamento. Só leitura: o cadastro
// continua em Parâmetros. Só modo demonstração.
export function InventarioEquipamentoModulo() {
  const { empresas } = useEmpresa();
  const equipamentos = useEquipamentosDaEmpresa();
  const abastecimentos = useAbastecimentosEq();
  const manutencoes = useManutencoesEq();
  const ocorrencias = useOcorrenciasEq();
  const checklists = useChecklistsEq();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState(TODOS);
  const nomeEmpresa = (id: string) => empresas.find((e) => e.id === id)?.nome_fantasia ?? "—";

  const situacao = (e: Equipamento) => {
    const ultimaManut = manutencoes.filter((m) => m.equipamentoId === e.id).sort((a, b) => b.data.localeCompare(a.data))[0];
    const ultimoCheck = checklists.filter((c) => c.equipamentoId === e.id && c.status === "Concluído").sort((a, b) => b.data.localeCompare(a.data))[0];
    return {
      horimetro: ultimoHorimetro(e.id, localStorage) ?? (Number(e.tecnico["horimetroInicial"]) || null),
      ultimaManut, ultimoCheck, abertas: ocorrencias.filter((o) => o.equipamentoId === e.id && o.status === "Aberta").length,
    };
  };
  // O Extrato abre direto o relatório no padrão dos demais, no visualizador em tela cheia (onde se imprime ou se baixa), com abastecimentos, manutenções, ocorrências e check lists.
  function gerarRelatorio(e: Equipamento) {
    const dele = <T extends { equipamentoId: string; data: string }>(l: T[]) => l.filter((x) => x.equipamentoId === e.id).sort((a, b) => b.data.localeCompare(a.data));
    const manut = dele(manutencoes);
    const abertas = ocorrencias.filter((o) => o.equipamentoId === e.id && o.status === "Aberta").length;
    const horimetro = ultimoHorimetro(e.id, localStorage) ?? (Number(e.tecnico["horimetroInicial"]) || null);
    const html = montarExtratoHtml({
      titulo: "Extrato do equipamento",
      assunto: rotuloDoEquipamento(e),
      subtitulo: `${nomeDoTipo(e)} · ${e.marca} ${e.modelo} · série ${e.numeroSerie} · adquirido em ${formatarData(e.dataAquisicao)} por ${reais(e.valorCompra)}`,
      empresa: nomeEmpresa(e.empresaId),
      resumo: [["Horímetro atual", horimetro === null ? "—" : `${numero(horimetro)} h`], ["Custo de manutenção", reais(manut.reduce((s, m) => s + custoDaManutencaoEq(m), 0))], abertas > 0 ? ["Ocorrências abertas", String(abertas), "vermelho"] : ["Ocorrências abertas", "0"]],
      tabelas: [
        {
          titulo: "Abastecimentos", vazio: "Nenhum abastecimento.",
          colunas: [{ titulo: "Data e hora" }, { titulo: "Horímetro", direita: true }, { titulo: "Litros", direita: true }, { titulo: "Valor", direita: true }],
          linhas: dele(abastecimentos).map((a) => [`${formatarData(a.data)} ${a.hora}`, `${numero(a.horimetro)} h`, numero(a.litros), reais(a.valor)]),
        },
        {
          titulo: "Manutenções", vazio: "Nenhuma manutenção.",
          colunas: [{ titulo: "Data" }, { titulo: "Tipo" }, { titulo: "Horímetro", direita: true }, { titulo: "Ações" }, { titulo: "Local" }, { titulo: "Custo", direita: true }],
          linhas: manut.map((m) => [formatarData(m.data), m.tipo, `${numero(m.horimetro)} h`, m.acoes.map((a) => a.nome).join(", "), m.localNome || "Na empresa", reais(custoDaManutencaoEq(m))]),
        },
        {
          titulo: "Ocorrências", vazio: "Nenhuma ocorrência.",
          colunas: [{ titulo: "Data" }, { titulo: "Tipo" }, { titulo: "Status" }, { titulo: "Descrição" }],
          linhas: dele(ocorrencias).map((o): Celula[] => [formatarData(o.data), o.tipoNome, { texto: o.status, cor: o.status === "Aberta" ? "vermelho" : "verde" }, o.descricao]),
        },
        {
          titulo: "Check lists", vazio: "Nenhum check list.",
          colunas: [{ titulo: "Data" }, { titulo: "Finalidade" }, { titulo: "Responsável" }, { titulo: "Situação" }, { titulo: "Resultado" }],
          linhas: dele(checklists).map((c): Celula[] => {
            const nok = c.itens.filter((i) => i.avaliacao === "NOK").length;
            return [formatarData(c.data), c.finalidade === "manutencao" ? "Manutenção" : "Vistoria", c.responsavelNome || "avulso", c.status, nok > 0 ? { texto: `${nok} NOK`, cor: "vermelho" } : { texto: "Tudo OK", cor: "verde" }];
          }),
        },
      ],
    });
    abrirDocumento({ titulo: "Extrato do equipamento", html, arquivo: nomeArquivoDocumento("Extrato do equipamento", e.patrimonio, e.nome), telaCheia: true });
  }

  const linhas = equipamentos
    .filter((e) => status === TODOS || e.status === status)
    .filter((e) => combinaBusca(busca, e.patrimonio, e.nome, nomeDoTipo(e), e.marca, e.modelo, e.setor, e.numeroSerie, nomeEmpresa(e.empresaId)));
  const abertasTotal = ocorrencias.filter((o) => o.status === "Aberta" && equipamentos.some((e) => e.id === o.equipamentoId)).length;
  const custoTotal = manutencoes.filter((m) => equipamentos.some((e) => e.id === m.equipamentoId)).reduce((s, m) => s + custoDaManutencaoEq(m), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Equipamentos</p><p className="text-lg font-semibold">{equipamentos.length}</p></div>
        <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Em manutenção</p><p className="text-lg font-semibold">{equipamentos.filter((e) => e.status === "Em manutenção").length}</p></div>
        <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Ocorrências abertas</p><p className="text-lg font-semibold">{abertasTotal}</p></div>
        <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Custo de manutenção</p><p className="text-lg font-semibold">{reais(custoTotal)}</p></div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Input aria-label="Buscar equipamento" placeholder="Buscar por patrimônio, nome, tipo, marca ou setor" className="max-w-sm" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <div className="space-y-1.5">
          <Label htmlFor="status_inventario">Situação</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="status_inventario" className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value={TODOS}>Todas</SelectItem>{STATUS_EQUIPAMENTO.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patrimônio</TableHead><TableHead>Equipamento</TableHead><TableHead>Tipo</TableHead><TableHead>Empresa / setor</TableHead><TableHead>Status</TableHead>
              <TableHead className="text-right">Horímetro</TableHead><TableHead>Última manutenção</TableHead><TableHead>Ocorrências abertas</TableHead><TableHead>Último check list</TableHead><TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 && <TableRow><TableCell colSpan={10} className="py-6 text-center text-muted-foreground">{busca.trim() || status !== TODOS ? "Nenhum resultado para o filtro." : "Nenhum equipamento cadastrado. Cadastre em Parâmetros > Equipamentos."}</TableCell></TableRow>}
            {linhas.map((e) => {
              const s = situacao(e);
              return (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.patrimonio}</TableCell>
                  <TableCell className="font-medium">{e.nome}<span className="block text-xs font-normal text-muted-foreground">{e.marca} {e.modelo}</span></TableCell>
                  <TableCell>{nomeDoTipo(e)}</TableCell>
                  <TableCell>{nomeEmpresa(e.empresaId)}<span className="block text-xs text-muted-foreground">{e.setor}</span></TableCell>
                  <TableCell><Badge variant={e.status === "Ativo" ? "secondary" : "outline"}>{e.status}</Badge></TableCell>
                  <TableCell className="text-right">{s.horimetro === null ? "—" : `${numero(s.horimetro)} h`}</TableCell>
                  <TableCell>{s.ultimaManut ? `${formatarData(s.ultimaManut.data)} · ${s.ultimaManut.tipo}` : "—"}</TableCell>
                  <TableCell>{s.abertas > 0 ? <Badge variant="destructive">{s.abertas}</Badge> : "0"}</TableCell>
                  <TableCell>{s.ultimoCheck ? <>{formatarData(s.ultimoCheck.data)} {pendenciasAbertasEq([s.ultimoCheck], e.id).length > 0 ? <Badge variant="destructive">{pendenciasAbertasEq([s.ultimoCheck], e.id).length} pend.</Badge> : <Badge variant="secondary">OK</Badge>}</> : "—"}</TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="sm" aria-label={`Extrato de ${e.nome}`} onClick={() => gerarRelatorio(e)}>Extrato</Button></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

    </div>
  );
}
