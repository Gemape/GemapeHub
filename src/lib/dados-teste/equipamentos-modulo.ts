// Registros do módulo Equipamentos nos dados de teste: parâmetros mínimos (ações de manutenção, tipos de ocorrência e check lists associados) e cinco
// registros de cada controle (abastecimento, manutenção, ocorrência, check list de manutenção e de vistoria). Grava pelas mesmas funções das telas.
import {
  aplicarPadraoUmaVez, cadastrarPadraoManutencao, cadastrarPadraoVistoria, checklistsDaAssociacao, gruposAplicaveis, lerChecklistEquipamento, salvarAssociacao, type FinalidadeChecklist,
} from "../equipamentos-checklist.ts";
import { cadastrarPadraoAcoes, lerManutencaoEquipamento, salvarPlano, salvarTipoOcorrencia } from "../equipamentos-manutencao.ts";
import { lerParametrosEquipamento } from "../equipamentos-parametros.ts";
import { hojeLocal } from "../empregados.ts";
import { nomeAcaoPadrao, ROTULOS_ACAO } from "../equipamentos-manutencao-padrao.ts";
import {
  CHAVE_ABASTECIMENTOS_EQ, CHAVE_MANUTENCOES_EQ, CHAVE_OCORRENCIAS_EQ, registrarAbastecimentoEq, registrarManutencaoEq, registrarOcorrenciaEq, resolverOcorrenciaEq,
} from "../registros-equipamento.ts";
import {
  avaliarItemEq, CHAVE_CHECKLISTS_EQ, concluirChecklistEq, gruposDoChecklistEq, gruposDoTipoEq, iniciarChecklistAvulsoEq, iniciarChecklistEq, periodicidadesDaAssociacaoEq,
} from "../checklist-equipamento-exec.ts";
import { EMPREGADOS, EQUIPAMENTOS, PREFIXO } from "./conjunto.ts";

type Armazenamento = Pick<Storage, "getItem" | "setItem" | "removeItem">;

// Ações do padrão inicial usadas nas manutenções e nos planos de teste (os nomes vêm do padrão, para não duplicar ações em Parâmetros).
const LUB_EMPILHADEIRA = nomeAcaoPadrao("Empilhadeiras", ROTULOS_ACAO.LUBRIFICACAO);
const SUSPENSAO_EMPILHADEIRA = nomeAcaoPadrao("Empilhadeiras", "Revisão de suspensão e direção");
const ELETRICO_EMPILHADEIRA = nomeAcaoPadrao("Empilhadeiras", ROTULOS_ACAO.ELETRICO);
const LUB_COMPRESSOR = nomeAcaoPadrao("Compressores diesel", ROTULOS_ACAO.LUBRIFICACAO);
const TRANSMISSAO_COMPRESSOR = nomeAcaoPadrao("Compressores diesel", ROTULOS_ACAO.TRANSMISSAO);
const TIPOS_OCORRENCIA = [
  { nome: "Falha mecânica", descricao: "O equipamento parou ou perdeu desempenho por defeito mecânico." },
  { nome: "Vazamento de fluido", descricao: "Vazamento de óleo, combustível ou fluido hidráulico." },
  { nome: "Dano estrutural", descricao: "Trinca, amassado ou desgaste na estrutura do equipamento." },
  { nome: "Falha elétrica", descricao: "Problema em bateria, painel, cabos ou sensores." },
  { nome: "Incidente sem vítimas", descricao: "Batida ou queda de carga sem pessoas feridas." },
] as const;

const dia = (agora: Date, atras: number) => hojeLocal(new Date(agora.getTime() - atras * 86_400_000));
const ignorar = (acao: () => unknown) => { try { acao(); } catch { /* já existe: o conjunto é aplicado de novo sem duplicar */ } };

function trocarId(storage: Armazenamento, chave: string, antigo: string, novo: string): void {
  const lista = JSON.parse(storage.getItem(chave) ?? "[]") as { id: string }[];
  for (const l of lista) if (l.id === antigo) l.id = novo;
  storage.setItem(chave, JSON.stringify(lista));
}

export function semearModuloEquipamentos(storage: Armazenamento, agora: Date): void {
  // Parâmetros: o que as telas de Parâmetros > Equipamentos trazem (o padrão de check lists e as ações e tipos de ocorrência) e a associação de cada equipamento.
  ignorar(() => aplicarPadraoUmaVez(storage));
  ignorar(() => cadastrarPadraoManutencao(storage));
  ignorar(() => cadastrarPadraoVistoria(storage));
  ignorar(() => cadastrarPadraoAcoes(storage));
  for (const t of TIPOS_OCORRENCIA) ignorar(() => salvarTipoOcorrencia({ nome: t.nome, descricao: t.descricao }, storage));
  const idEquipamento = (n: number) => `${PREFIXO}equipamento-${n + 1}`;
  const tipos = lerParametrosEquipamento(storage).tipos;
  EQUIPAMENTOS.forEach((e, n) => {
    const responsavel = EMPREGADOS[n]!;
    for (const finalidade of ["manutencao", "vistoria"] as FinalidadeChecklist[]) {
      const grupos = gruposAplicaveis(e.tipoId, lerChecklistEquipamento(storage)[finalidade].grupos, false).slice(0, 2);
      if (grupos.length === 0 || !tipos.some((t) => t.id === e.tipoId)) continue;
      ignorar(() => salvarAssociacao(finalidade, {
        modo: "criar", equipamentoId: idEquipamento(n), tipoId: e.tipoId, responsavel: { id: responsavel.id, nome: responsavel.nome },
        itens: grupos.map((g, i) => ({ grupoId: g.id, tipo: "periodico", periodicidade: "Semanal" })),
      }, storage, agora));
    }
  });

  // Abastecimentos: o equipamento a gás (quarto), com o horímetro sempre crescendo.
  const abastecimentos = [[50, "08:10", 120, 38, 215], [42, "09:25", 168, 41.5, 232.4], [28, "07:50", 214, 39, 221.2], [14, "10:05", 262, 42, 240.8], [5, "08:40", 310, 40.5, 233.1]] as const;
  abastecimentos.forEach(([atras, hora, horimetro, litros, valor], i) => {
    const r = registrarAbastecimentoEq({ equipamentoId: idEquipamento(3), data: dia(agora, atras), hora, horimetro, litros, valor }, storage as Storage, agora);
    trocarId(storage, CHAVE_ABASTECIMENTOS_EQ, r.id, `${PREFIXO}eq-abastecimento-${i + 1}`);
  });

  // Manutenções: cinco, em quatro equipamentos, preventivas e corretivas, na empresa ou em terceiro, com custos.
  const acoes = lerManutencaoEquipamento(storage).acoes;
  const acao = (nome: string, ...subitens: string[]) => { const a = acoes.find((x) => x.nome === nome); return a ? [{ acaoId: a.id, nome: a.nome, subitens }] : []; };
  const manutencoes = [
    { n: 3, atras: 35, tipo: "Preventiva", horimetro: 190, acoes: acao(LUB_EMPILHADEIRA, "Troca de óleo do motor", "Filtro de óleo"), local: "empresa", localNome: "", pecas: "320,00", mao: "180,00", parada: "6", obs: "Revisão das 190 horas." },
    { n: 0, atras: 30, tipo: "Corretiva", horimetro: 1480, acoes: acao(ELETRICO_EMPILHADEIRA, "Troca de bateria"), local: "terceiro", localNome: "Elétrica Industrial Triângulo", pecas: "1.450,00", mao: "600,00", parada: "24", obs: "Troca de células da bateria." },
    { n: 1, atras: 20, tipo: "Preventiva", horimetro: 3200, acoes: acao(LUB_COMPRESSOR, "Filtro de óleo"), local: "empresa", localNome: "", pecas: "85,00", mao: "120,00", parada: "4", obs: "Lubrificação do conjunto motor-compressor." },
    { n: 0, atras: 10, tipo: "Preventiva", horimetro: 1530, acoes: acao(SUSPENSAO_EMPILHADEIRA, "Amortecedores", "Molas"), local: "empresa", localNome: "", pecas: "0,00", mao: "150,00", parada: "3", obs: "Sem vazamentos." },
    { n: 2, atras: 60, tipo: "Preventiva", horimetro: 0, acoes: acao(TRANSMISSAO_COMPRESSOR, "Líquido de arrefecimento"), local: "terceiro", localNome: "Recarga Segura Extintores", pecas: "90,00", mao: "60,00", parada: "2", obs: "Inspeção anual do extintor." },
  ];
  manutencoes.forEach((m, i) => {
    const r = registrarManutencaoEq({
      equipamentoId: idEquipamento(m.n), tipo: m.tipo, data: dia(agora, m.atras), horimetro: m.horimetro, acoes: m.acoes, local: m.local, localNome: m.localNome,
      custoPecas: m.pecas === "0,00" ? "" : m.pecas, custoMaoDeObra: m.mao, observacao: m.obs, horasParada: m.parada,
    }, storage as Storage, agora);
    trocarId(storage, CHAVE_MANUTENCOES_EQ, r.id, `${PREFIXO}eq-manutencao-${i + 1}`);
  });

  // Planos de manutenção por equipamento (ação, limite de horas e de meses): uns em dia, outros vencidos, para os indicadores mostrarem os dois casos.
  const nomeAcao = (nome: string) => acoes.find((a) => a.nome === nome)?.id ?? "";
  const planos: [number, [string, number, number][]][] = [
    [0, [[ELETRICO_EMPILHADEIRA, 500, 6], [SUSPENSAO_EMPILHADEIRA, 200, 3]]],
    [1, [[LUB_COMPRESSOR, 500, 6], [TRANSMISSAO_COMPRESSOR, 1000, 6]]],
    [2, [[TRANSMISSAO_COMPRESSOR, 1000, 12]]],
    [3, [[LUB_EMPILHADEIRA, 250, 3], [SUSPENSAO_EMPILHADEIRA, 100, 1], [ELETRICO_EMPILHADEIRA, 500, 6]]],
  ];
  for (const [n, itens] of planos) {
    ignorar(() => salvarPlano({ modo: "criar", equipamentoId: idEquipamento(n), itens: itens.filter(([nome]) => nomeAcao(nome)).map(([nome, horas, meses]) => ({ acaoId: nomeAcao(nome), horas, meses })) }, storage, agora));
  }

  // Ocorrências: cinco, três abertas e duas resolvidas.
  const tiposOcorrencia = lerManutencaoEquipamento(storage).tiposOcorrencia;
  const tipoDe = (nome: string) => tiposOcorrencia.find((t) => t.nome === nome);
  const ocorrencias = [
    { n: 3, atras: 20, tipo: "Vazamento de fluido", texto: "Pequeno vazamento de gás na conexão do cilindro, notado na partida.", solucao: "Conexão reapertada e vedação trocada." },
    { n: 0, atras: 18, tipo: "Falha elétrica", texto: "Painel apagou duas vezes durante a operação no turno da manhã.", solucao: "" },
    { n: 1, atras: 12, tipo: "Falha mecânica", texto: "Ruído forte no cabeçote ao atingir a pressão máxima.", solucao: "" },
    { n: 2, atras: 9, tipo: "Dano estrutural", texto: "Suporte de parede do extintor solto e com a pintura trincada.", solucao: "Suporte refixado com buchas novas." },
    { n: 3, atras: 3, tipo: "Incidente sem vítimas", texto: "Carga tombou levemente ao manobrar no corredor 4, sem feridos e sem danos ao mastro.", solucao: "" },
  ];
  ocorrencias.forEach((o, i) => {
    const tipo = tipoDe(o.tipo);
    const r = registrarOcorrenciaEq({ equipamentoId: idEquipamento(o.n), tipoId: tipo?.id ?? "", tipoNome: tipo?.nome ?? o.tipo, data: dia(agora, o.atras), descricao: o.texto }, storage as Storage, agora);
    if (o.solucao) resolverOcorrenciaEq(r.id, o.solucao, storage as Storage, agora);
    trocarId(storage, CHAVE_OCORRENCIAS_EQ, r.id, `${PREFIXO}eq-ocorrencia-${i + 1}`);
  });

  // Check lists: três de manutenção e dois de vistoria, iniciados, avaliados e concluídos pelas mesmas funções da tela; os itens vêm da associação de cada
  // equipamento (sem associação, os do tipo dele, como avulso). Dois deles têm item NOK, que gera ocorrência e pendência aberta.
  const checklists: { n: number; finalidade: FinalidadeChecklist; atras: number; problema: boolean }[] = [
    { n: 3, finalidade: "manutencao", atras: 34, problema: false }, { n: 0, finalidade: "manutencao", atras: 29, problema: true }, { n: 1, finalidade: "manutencao", atras: 19, problema: false },
    { n: 3, finalidade: "vistoria", atras: 7, problema: true }, { n: 2, finalidade: "vistoria", atras: 2, problema: false },
  ];
  checklists.forEach((c, i) => {
    const e = EQUIPAMENTOS[c.n]!;
    const parte = lerChecklistEquipamento(storage)[c.finalidade];
    const associacao = parte.associacoes.find((a) => a.equipamentoId === idEquipamento(c.n));
    const periodicidade = periodicidadesDaAssociacaoEq(associacao)[0];
    const grupos = periodicidade ? gruposDoChecklistEq(associacao, parte.grupos, periodicidade) : gruposDoTipoEq(parte.grupos, e.tipoId);
    if (grupos.length === 0) return;
    const agoraDoCheck = new Date(agora.getTime() - c.atras * 86_400_000);
    const base = { equipamentoId: idEquipamento(c.n), equipamentoRotulo: `${e.patrimonio} · ${e.nome}`, tipoEquipamento: tipos.find((t) => t.id === e.tipoId)?.nome ?? "", finalidade: c.finalidade, grupos };
    const criado = periodicidade
      ? iniciarChecklistEq({ ...base, periodicidade, responsavelId: EMPREGADOS[c.n]!.id, responsavelNome: EMPREGADOS[c.n]!.nome }, storage as Storage, agoraDoCheck)
      : iniciarChecklistAvulsoEq(base, storage as Storage, agoraDoCheck);
    criado.itens.forEach((item, k) => {
      const nok = c.problema && k === 0;
      avaliarItemEq(criado.id, item.id, { avaliacao: nok ? "NOK" : "OK", observacao: nok ? "Desgaste visível, agendar troca na próxima parada." : "" }, storage as Storage);
    });
    concluirChecklistEq(criado.id, storage as Storage, agoraDoCheck);
    // As ocorrências geradas pelos itens NOK ganham id de teste (e o check list passa a apontar para o novo), para saírem junto no Limpar.
    const concluidoAgora = JSON.parse(storage.getItem(CHAVE_CHECKLISTS_EQ) ?? "[]") as { id: string; itens: { ocorrenciaId: string | null }[] }[];
    concluidoAgora.find((x) => x.id === criado.id)?.itens.forEach((item, k) => {
      if (!item.ocorrenciaId) return;
      const novo = `${PREFIXO}eq-ocorrencia-checklist-${i + 1}-${k + 1}`;
      trocarId(storage, CHAVE_OCORRENCIAS_EQ, item.ocorrenciaId, novo);
      item.ocorrenciaId = novo;
    });
    storage.setItem(CHAVE_CHECKLISTS_EQ, JSON.stringify(concluidoAgora));
    trocarId(storage, CHAVE_CHECKLISTS_EQ, criado.id, `${PREFIXO}eq-checklist-${i + 1}`);
  });
}
