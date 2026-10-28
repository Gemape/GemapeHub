import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { rotuloDoVeiculo } from "@/components/modules/rotulo-veiculo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ocorrenciaVencida } from "@/lib/frota-ocorrencias";
import { lerPrazosOcorrencias } from "@/lib/prazo-ocorrencias";
import { hojeLocal } from "@/lib/empregados";
import { montarExtratoHtml, type Celula, type Cor, type TabelaExtrato } from "@/lib/extrato-html";
import { historicoAbastecimentos, kmAtualDoVeiculo, mediaKmPorLitro, pontosDeAtencao, sugestoesPreventivas, type StatusSugestao } from "@/lib/extrato-veiculo";
import { formatarData } from "@/lib/gemape";
import { painelDoMes, type SituacaoPrevisao } from "@/lib/checklist-painel";
import { pendenciaAberta } from "@/lib/checklist-veiculo";
import { diasEntre } from "@/lib/viagens";
import { useEmpresas, useMovimentacoes, useOcorrencias, type Veiculo } from "@/lib/hooks-gemape";
import { gruposDaManutencao, resumoManutencao } from "@/lib/registros-veiculo";
import { useAbastecimentos, useChecklistsVeiculo, useManutencoesVeiculo, useOcorrenciasVeiculo, usePlanosVeiculo, usePrevisoesChecklist } from "@/lib/use-registros-veiculo";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { useEmpresa } from "@/lib/empresa-context";
import { MODO_DEMO } from "@/lib/modo-demo";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";

// No relatório a situação sai com o ponto colorido, como nos indicadores da tela.
const SITUACAO: Record<StatusSugestao, { rotulo: string; cor: Cor }> = {
  vencida: { rotulo: "Vencida", cor: "vermelho" },
  atencao: { rotulo: "Atenção", cor: "amarelo" },
  em_dia: { rotulo: "Em dia", cor: "verde" },
  sem_registro: { rotulo: "Sem registro", cor: "cinza" },
};
const COR_OCORRENCIA: Record<string, Cor> = { Aberta: "vermelho", "Em tratativa": "amarelo", Encerrada: "verde" };

const numero = (n: number) => n.toLocaleString("pt-BR");

// Extrato do veículo (decisões 57 e 296): ao escolher o veículo na Frota, a janela pede o período (data início e fim, opcionais) e oferece o extrato completo e
// os atalhos para as manutenções sugeridas, as manutenções realizadas e as ocorrências. Cada botão abre o relatório no visualizador, ocupando a tela toda, com
// abastecimentos e média km/L, ocorrências, manutenções realizadas (preventivas e corretivas) e as preventivas sugeridas pelo plano, com as vencidas sinalizadas.
// O período vale para o que aconteceu (manutenções, abastecimentos e ocorrências); as sugeridas sempre mostram a situação de hoje. Imprimir e baixar o PDF
// ficam no próprio visualizador. Só leitura.
// Clicar numa bolinha da Frota (Preventivas, Ocorrências ou Check list) abre direto a informação que ela resume (decisão 305): `secao` já vem escolhida e o relatório
// abre na hora, sem a janela do período.
export type SecaoExtrato = "completo" | "sugeridas" | "realizadas" | "ocorrencias" | "ocorrenciasAbertas" | "checklists";
type Secao = SecaoExtrato;
const TITULO: Record<Secao, string> = {
  completo: "Extrato do veículo", sugeridas: "Manutenções sugeridas do veículo", realizadas: "Manutenções realizadas do veículo", ocorrencias: "Ocorrências do veículo",
  ocorrenciasAbertas: "Ocorrências em aberto do veículo", checklists: "Check lists do veículo",
};
const ARQUIVO: Record<Secao, string> = {
  completo: "Extrato do veiculo", sugeridas: "Manutencoes sugeridas", realizadas: "Manutencoes realizadas", ocorrencias: "Ocorrencias do veiculo",
  ocorrenciasAbertas: "Ocorrencias em aberto", checklists: "Check lists do veiculo",
};
// Posição das tabelas do extrato (sugeridas, realizadas, itens em atenção, abastecimentos, ocorrências, check lists) que cada botão mostra.
const SECOES: Record<Secao, number[]> = { completo: [0, 1, 2, 3, 4, 5], sugeridas: [0], realizadas: [1, 2], ocorrencias: [4], ocorrenciasAbertas: [4], checklists: [5] };
const SITUACAO_CHECKLIST: Record<SituacaoPrevisao, { rotulo: string; cor: Cor }> = {
  realizado: { rotulo: "Realizado no prazo", cor: "verde" },
  nao_realizado: { rotulo: "Não realizado no prazo", cor: "vermelho" },
  a_vencer: { rotulo: "A vencer", cor: "amarelo" },
  opcional: { rotulo: "Opcional", cor: "cinza" },
};

export function ExtratoVeiculo({ veiculo, secao = null, onFechar }: { veiculo: Veiculo | null; secao?: SecaoExtrato | null; onFechar: () => void }) {
  const { empresaId } = useEmpresa();
  const parametros = useParametrosBase();
  const abastecimentos = useAbastecimentos();
  const manutencoes = useManutencoesVeiculo();
  const planos = usePlanosVeiculo();
  const { data: movimentacoes = [] } = useMovimentacoes("veiculo", empresaId);
  const { data: ocorrencias = [] } = useOcorrencias("", "veiculo");
  const ocorrenciasNovas = useOcorrenciasVeiculo();
  const checklists = useChecklistsVeiculo();
  const previsoes = usePrevisoesChecklist();
  const { data: empresas = [] } = useEmpresas();
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const periodoInvalido = !!inicio && !!fim && inicio > fim;

  function abrirRelatorio(v: Veiculo, secaoPedida: Secao) {
    // A tabela antiga de ocorrências (fora da demonstração) não tem status: não há como separar as em aberto, então abre todas, com o título certo.
    const secao: Secao = !MODO_DEMO && secaoPedida === "ocorrenciasAbertas" ? "ocorrencias" : secaoPedida;
    // Período (AAAA-MM-DD, as duas pontas valem); vazio = sem limite daquele lado.
    const noPeriodo = (data: string) => (!inicio || data.slice(0, 10) >= inicio) && (!fim || data.slice(0, 10) <= fim);
    const dele = <T extends { veiculoId: string }>(l: T[]) => l.filter((x) => x.veiculoId === v.id);
    const manutTodas = dele(manutencoes);
    const abast = historicoAbastecimentos(dele(abastecimentos).filter((a) => noPeriodo(a.data)));
    const manut = manutTodas.filter((m) => noPeriodo(m.data));
    const media = mediaKmPorLitro(abast);
    // Km atual e sugeridas olham todos os registros, não só o período: são a situação de hoje.
    const kmAtual = kmAtualDoVeiculo(v.quilometragem_atual, dele(abastecimentos), manutTodas);
    const sugestoes = sugestoesPreventivas({
      plano: planos.find((p) => p.veiculoId === v.id) ?? null,
      acoes: parametros.acoesManutencaoVeiculo,
      manutencoes: manutTodas,
      kmAtual,
      hoje: hojeLocal(),
    });
    const vencidas = sugestoes.filter((s) => s.status === "vencida").length;

    // Manutenções do extrato: as registradas na tela Manutenção e as marcadas em Movimentações (registros antigos; a aba saiu do módulo na decisão 77).
    const nomeAcao = (id: string) => parametros.acoesManutencaoVeiculo.find((a) => a.id === id)?.nome;
    const linhasManutencao = [
      ...manut.map((m) => ({ data: m.data, km: m.km as number | null, tipo: m.tipo as string, servico: resumoManutencao(m, nomeAcao) })),
      ...movimentacoes
        .filter((m) => m.veiculo_id === v.id && (m as { acao_manutencao?: string }).acao_manutencao && noPeriodo(m.data_movimentacao))
        .map((m) => {
          const x = m as { acao_manutencao?: string; subitens_manutencao?: string[] };
          const subs = x.subitens_manutencao?.length ? `: ${x.subitens_manutencao.join(", ")}` : "";
          return { data: m.data_movimentacao.slice(0, 10), km: null, tipo: "Movimentação", servico: `${x.acao_manutencao}${subs}` };
        }),
    ].sort((a, b) => b.data.localeCompare(a.data));
    // Registros antigos (um grupo só, sem `grupos`) também contam como manutenção que fez o item.
    const atencao = pontosDeAtencao(manut.map((m) => ({ id: m.id, data: m.data, km: m.km, grupos: gruposDaManutencao(m) })), nomeAcao);
    // Em demonstração valem as ocorrências da tela nova (decisão 60); fora dela, as da tabela antiga.
    const prazosOcorrencias = lerPrazosOcorrencias();
    const ocorrenciasDoVeiculo = (MODO_DEMO
      ? ocorrenciasNovas.filter((o) => o.veiculoId === v.id && noPeriodo(o.ocorridoEm) && (secao !== "ocorrenciasAbertas" || o.status !== "Encerrada")).map((o) => ({ data: o.ocorridoEm.slice(0, 10), descricao: `${o.codigo} · ${o.tipoNome}: ${o.descricao}`, situacao: o.status as string, vencida: ocorrenciaVencida(o, hojeLocal(), prazosOcorrencias) }))
      : ocorrencias.filter((o) => o.veiculo_id === v.id && noPeriodo(o.data)).map((o) => ({ data: o.data, descricao: o.descricao_ocorrencia, situacao: (o.responsavel_registro ?? "—") as string, vencida: false }))
    ).sort((a, b) => b.data.localeCompare(a.data));

    // Check lists periódicos do veículo: uma linha por prazo dos últimos 30 dias em diante (o que a bolinha da Frota resume), com o resultado e as pendências do realizado.
    const hoje = hojeLocal();
    const linhasChecklist = painelDoMes(null, previsoes.filter((p) => p.veiculoId === v.id), checklists.filter((c) => c.veiculoId === v.id), hoje).linhas
      .filter((l) => diasEntre(l.fim, hoje) <= 30);
    const rotulo = rotuloDoVeiculo(parametros, v);
    const tabelas: TabelaExtrato[] = [
        {
          titulo: "Manutenções preventivas sugeridas", vazio: "Este veículo não tem plano de manutenções (Parâmetros > Veículos > Manutenção).",
          colunas: [{ titulo: "Ação" }, { titulo: "Periodicidade" }, { titulo: "Última vez" }, { titulo: "Próxima revisão" }, { titulo: "Situação" }],
          linhas: sugestoes.map((x): Celula[] => [
            x.nome,
            `${numero(x.intervaloKm)} km ou ${x.intervaloMeses} meses`,
            x.ultima ? `${numero(x.ultima.km)} km (${formatarData(x.ultima.data)})` : "—",
            x.proximoKm !== null && x.proximaData ? `${numero(x.proximoKm)} km ou ${formatarData(x.proximaData)}` : "—",
            { texto: `${SITUACAO[x.status].rotulo}${x.status !== "em_dia" && x.status !== "sem_registro" ? ` · ${x.motivo}` : ""}`, cor: SITUACAO[x.status].cor },
          ]),
        },
        {
          titulo: "Manutenções realizadas", vazio: "Nenhuma manutenção registrada.",
          colunas: [{ titulo: "Data" }, { titulo: "Tipo" }, { titulo: "Serviço" }, { titulo: "Km", direita: true }],
          linhas: linhasManutencao.map((m) => [formatarData(m.data), m.tipo, m.servico, m.km === null ? "—" : numero(m.km)]),
        },
        {
          titulo: "Itens não realizados em atenção", vazio: "Nenhum item ficou sem fazer com observação.",
          nota: "O item sai desta lista quando uma manutenção posterior o realiza.",
          colunas: [{ titulo: "Manutenção" }, { titulo: "Grupo" }, { titulo: "Item" }, { titulo: "Observação" }, { titulo: "Km", direita: true }],
          linhas: atencao.map((a) => [formatarData(a.data), a.grupo, a.item, a.observacao, numero(a.km)]),
        },
        {
          titulo: "Histórico de abastecimentos", vazio: "Nenhum abastecimento registrado.",
          colunas: [{ titulo: "Data e hora" }, { titulo: "Km", direita: true }, { titulo: "Km rodados", direita: true }, { titulo: "Litros", direita: true }, { titulo: "Valor", direita: true }, { titulo: "Km/L", direita: true }],
          linhas: abast.map((a) => [
            `${formatarData(a.data)}${a.hora ? ` ${a.hora}` : ""}`, numero(a.km), a.kmRodados === null ? "—" : numero(a.kmRodados), a.litros.toLocaleString("pt-BR"),
            a.valor ? a.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—", a.kmPorLitro === null ? "—" : a.kmPorLitro.toLocaleString("pt-BR", { maximumFractionDigits: 1 }),
          ]),
        },
        {
          titulo: "Ocorrências", vazio: "Nenhuma ocorrência registrada.",
          colunas: [{ titulo: "Data" }, { titulo: "Descrição" }, { titulo: MODO_DEMO ? "Status" : "Responsável" }],
          linhas: ocorrenciasDoVeiculo.map((o): Celula[] => [formatarData(o.data), o.descricao, o.vencida ? { texto: `${o.situacao} · vencida`, cor: "vermelho" } : COR_OCORRENCIA[o.situacao] ? { texto: o.situacao, cor: COR_OCORRENCIA[o.situacao]! } : o.situacao]),
        },
        {
          titulo: "Check lists periódicos", vazio: "Este veículo não tem check list periódico previsto nos últimos 30 dias (Parâmetros > Veículos > Check list).",
          nota: "Prazos dos últimos 30 dias em diante; só os obrigatórios entram nos indicadores.",
          colunas: [{ titulo: "Prazo" }, { titulo: "Periodicidade" }, { titulo: "Responsável" }, { titulo: "Situação" }, { titulo: "Pendências", direita: true }, { titulo: "Check list" }],
          linhas: linhasChecklist.map((l): Celula[] => {
            const feito = l.checklistId ? checklists.find((c) => c.id === l.checklistId) : undefined;
            return [
              l.inicio === l.fim ? formatarData(l.fim) : `${formatarData(l.inicio)} a ${formatarData(l.fim)}`, l.periodicidade, l.responsavelNome || "—",
              { texto: SITUACAO_CHECKLIST[l.situacao].rotulo, cor: SITUACAO_CHECKLIST[l.situacao].cor },
              feito ? String(feito.itens.filter(pendenciaAberta).length) : "—", l.checklistCodigo ?? "—",
            ];
          }),
        },
    ];
    const html = montarExtratoHtml({
      titulo: TITULO[secao],
      assunto: rotulo,
      ...(inicio || fim ? { subtitulo: `Período: ${inicio ? formatarData(inicio) : "desde o início"} a ${fim ? formatarData(fim) : "hoje"}` } : {}),
      empresa: empresas.find((e) => e.id === v.empresa_id)?.nome_fantasia ?? "",
      resumo: [
        ["Km atual", numero(kmAtual)],
        ["Média de consumo", media === null ? "— (precisa de dois abastecimentos)" : `${media.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km/L`],
        vencidas > 0 ? ["Preventivas vencidas", String(vencidas), "vermelho"] : ["Preventivas vencidas", "0"],
      ],
      tabelas: tabelas.filter((_, n) => SECOES[secao].includes(n)),
    });
    abrirDocumento({ titulo: TITULO[secao], html, arquivo: nomeArquivoDocumento(ARQUIVO[secao], rotulo), telaCheia: true });
  }

  // Escolher outro veículo começa sem período.
  useEffect(() => { setInicio(""); setFim(""); }, [veiculo?.id]);
  // Vindo de uma bolinha da Frota, o relatório abre na hora e a escolha é desfeita para o próximo clique.
  useEffect(() => {
    if (!veiculo || !secao) return;
    abrirRelatorio(veiculo, secao);
    onFechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [veiculo, secao]);

  const rotuloVeiculo = veiculo ? rotuloDoVeiculo(parametros, veiculo) : "";
  const gerar = (secao: Secao) => { if (veiculo && !periodoInvalido) abrirRelatorio(veiculo, secao); };
  return (
    <Dialog open={!!veiculo && !secao} onOpenChange={(a) => { if (!a) onFechar(); }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Extrato do veículo</DialogTitle>
          <DialogDescription>{rotuloVeiculo}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="extrato-inicio">Data início</Label>
            <Input id="extrato-inicio" type="date" value={inicio} max={fim || undefined} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="extrato-fim">Data fim</Label>
            <Input id="extrato-fim" type="date" value={fim} min={inicio || undefined} onChange={(e) => setFim(e.target.value)} />
          </div>
        </div>
        {periodoInvalido && <p className="text-sm text-destructive">A data início não pode ser depois da data fim.</p>}
        <p className="text-xs text-muted-foreground">
          O período vale para as manutenções realizadas, os abastecimentos e as ocorrências. As manutenções sugeridas mostram sempre a situação de hoje. Sem datas, vale todo o histórico.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={periodoInvalido} onClick={() => gerar("sugeridas")}>Manutenções sugeridas</Button>
          <Button type="button" variant="outline" size="sm" disabled={periodoInvalido} onClick={() => gerar("realizadas")}>Manutenções realizadas</Button>
          <Button type="button" variant="outline" size="sm" disabled={periodoInvalido} onClick={() => gerar("ocorrencias")}>Ocorrências</Button>
        </div>
        <div className="space-y-1.5 border-t pt-3">
          <p className="text-sm font-medium">Ir para a rotina do veículo</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/veiculos" search={{ aba: "manutencao" }}>Realizar manutenção</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/veiculos" search={{ aba: "ocorrencias" }}>Tratar ocorrências</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/veiculos" search={{ aba: "checklist" }}>Realizar check list</Link></Button>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onFechar}>Fechar</Button>
          <Button type="button" disabled={periodoInvalido} onClick={() => gerar("completo")}>Extrato completo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
