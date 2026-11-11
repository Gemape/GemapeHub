// Módulo Equipamentos nos dados de teste: os parâmetros (padrão de check lists, ações de manutenção e tipos de ocorrência) e os registros de só dez equipamentos
// (INDICES_COM_DADOS), um ou dois de cada tipo: associação de check list, plano de manutenção, abastecimentos (nos de motor a combustão), manutenção preventiva e
// corretiva, ocorrência e quinze check lists preenchidos (cinco periódicos de manutenção, cinco de vistoria e cinco avulsos). Os outros equipamentos de teste
// ficam só cadastrados, para registrar tudo do zero. Grava pelas mesmas funções das telas, com datas no passado e o horímetro sempre crescendo.
import {
  aplicarPadraoUmaVez, cadastrarPadraoManutencao, cadastrarPadraoVistoria, gruposAplicaveis, lerChecklistEquipamento, salvarAssociacao, type FinalidadeChecklist,
} from "../equipamentos-checklist.ts";
import { cadastrarPadraoAcoes, lerManutencaoEquipamento, salvarPlano, salvarTipoOcorrencia } from "../equipamentos-manutencao.ts";
import { lerParametrosEquipamento } from "../equipamentos-parametros.ts";
import { hojeLocal } from "../empregados.ts";
import { ACOES_PADRAO_EQUIPAMENTO } from "../equipamentos-manutencao-padrao.ts";
import {
  CHAVE_ABASTECIMENTOS_EQ, CHAVE_MANUTENCOES_EQ, CHAVE_OCORRENCIAS_EQ, registrarAbastecimentoEq, registrarManutencaoEq, registrarOcorrenciaEq, salvarTratativaEq,
} from "../registros-equipamento.ts";
import {
  avaliarItemEq, CHAVE_CHECKLISTS_EQ, concluirChecklistEq, gruposDoChecklistEq, gruposDoTipoEq, iniciarChecklistAvulsoEq, iniciarChecklistEq, periodicidadesDaAssociacaoEq,
} from "../checklist-equipamento-exec.ts";
import { EMPREGADOS, EQUIPAMENTOS_DE_TESTE, INDICES_COM_DADOS, PLANOS_CHECKLIST_TESTE, PREFIXO } from "./conjunto.ts";

type Armazenamento = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const TIPOS_OCORRENCIA = [
  { nome: "Falha mecânica", descricao: "O equipamento parou ou perdeu desempenho por defeito mecânico." },
  { nome: "Vazamento de fluido", descricao: "Vazamento de óleo, combustível ou fluido hidráulico." },
  { nome: "Dano estrutural", descricao: "Trinca, amassado ou desgaste na estrutura do equipamento." },
  { nome: "Falha elétrica", descricao: "Problema em bateria, painel, cabos ou sensores." },
  { nome: "Incidente sem vítimas", descricao: "Batida ou queda de carga sem pessoas feridas." },
] as const;
const TEXTO_OCORRENCIA: Record<string, string> = {
  "Falha mecânica": "Ruído forte e perda de rendimento durante a operação.",
  "Vazamento de fluido": "Vazamento pequeno de fluido notado na partida.",
  "Dano estrutural": "Trinca e desgaste na estrutura, notados na vistoria.",
  "Falha elétrica": "Painel apagou duas vezes durante a operação.",
  "Incidente sem vítimas": "Batida leve ao manobrar, sem feridos e sem danos ao equipamento.",
};
// Família de ações do padrão de cada tipo de equipamento (as manutenções e os planos usam as ações dela).
const FAMILIA_DO_TIPO: Record<string, string> = {
  "tipo-empilhadeiras": "Empilhadeiras", "tipo-munck": "Motores estacionários", "tipo-ponte-rolante": "Equipamentos de apoio", "tipo-serra-de-corte": "Equipamentos de apoio",
  "tipo-maquina-de-solda": "Equipamentos de apoio", "tipo-compressor-de-ar": "Compressores diesel", "tipo-jato-alta-pressao": "Equipamentos de apoio", "tipo-extintores": "Extintores de incêndio",
};

const dia = (agora: Date, atras: number) => hojeLocal(new Date(agora.getTime() - atras * 86_400_000));
// Só o que já existe é ignorado (o conjunto é aplicado de novo sem duplicar); qualquer outro erro sobe e desfaz a aplicação inteira.
const ignorar = (acao: () => unknown) => { try { acao(); } catch (erro) { if (!/já (existe|tem|está)|Já existe/i.test(String(erro))) throw erro; } };
const numeroDe = (texto: string | undefined) => Number(String(texto ?? "").replace(/\./g, "").replace(",", ".")) || 0;

function trocarId(storage: Armazenamento, chave: string, antigo: string, novo: string): void {
  const lista = JSON.parse(storage.getItem(chave) ?? "[]") as { id: string }[];
  for (const l of lista) if (l.id === antigo) l.id = novo;
  storage.setItem(chave, JSON.stringify(lista));
}

export function semearModuloEquipamentos(storage: Armazenamento, agora: Date): void {
  // Parâmetros: o que as telas de Parâmetros > Equipamentos trazem (o padrão de check lists e as ações e tipos de ocorrência).
  ignorar(() => aplicarPadraoUmaVez(storage));
  ignorar(() => cadastrarPadraoManutencao(storage));
  ignorar(() => cadastrarPadraoVistoria(storage));
  ignorar(() => cadastrarPadraoAcoes(storage));
  for (const t of TIPOS_OCORRENCIA) ignorar(() => salvarTipoOcorrencia({ nome: t.nome, descricao: t.descricao }, storage));
  const tipos = lerParametrosEquipamento(storage).tipos;
  const acoes = lerManutencaoEquipamento(storage).acoes;
  const tiposOcorrencia = lerManutencaoEquipamento(storage).tiposOcorrencia;
  const st = storage as Storage;
  const checklists: { idx: number; k: number; finalidade: FinalidadeChecklist; atras: number; problema: boolean; avulso?: boolean }[] = [];

  INDICES_COM_DADOS.forEach((idx, k) => {
    const e = EQUIPAMENTOS_DE_TESTE[idx]!;
    const id = `${PREFIXO}equipamento-${idx + 1}`;
    const responsavel = EMPREGADOS[k]!;
    const plano = PLANOS_CHECKLIST_TESTE[k % PLANOS_CHECKLIST_TESTE.length]!;

    // Associação de check list (manutenção e vistoria), valendo desde antes dos check lists para o painel do mês ter as previsões do período.
    for (const finalidade of ["manutencao", "vistoria"] as FinalidadeChecklist[]) {
      const grupos = gruposAplicaveis(e.tipoId, lerChecklistEquipamento(storage)[finalidade].grupos, false).slice(0, 2);
      if (grupos.length === 0 || !tipos.some((t) => t.id === e.tipoId)) continue;
      ignorar(() => salvarAssociacao(finalidade, {
        modo: "criar", equipamentoId: id, tipoId: e.tipoId, responsavel: { id: responsavel.id, nome: responsavel.nome },
        itens: grupos.map((g) => ({ grupoId: g.id, tipo: "periodico", periodicidade: plano.periodicidade })),
      }, storage, new Date(agora.getTime() - plano.desde * 86_400_000)));
    }

    // Abastecimentos: só nos de motor a combustão, com o horímetro sempre crescendo.
    const tecnico = e.tecnico as Record<string, string>;
    const base = numeroDe(tecnico["horimetroInicial"]);
    const combustao = ["Diesel", "Gasolina", "GLP/Gás"].includes(tecnico["propulsao"] ?? "");
    if (combustao) {
      ([[58, "08:00", 20, 35, 210], [44, "09:10", 70, 38, 228], [26, "07:40", 130, 36, 216]] as const).forEach(([atras, hora, soma, litros, valor], i) => {
        const r = registrarAbastecimentoEq({ equipamentoId: id, data: dia(agora, atras), hora, horimetro: base + soma, litros, valor }, st, agora);
        trocarId(storage, CHAVE_ABASTECIMENTOS_EQ, r.id, `${PREFIXO}eq-abastecimento-${k + 1}-${i + 1}`);
      });
    }

    // Manutenções (uma preventiva na empresa e uma corretiva em terceiro) e plano, com as ações do padrão da família do tipo.
    const familia = ACOES_PADRAO_EQUIPAMENTO.filter((a) => a.nome.startsWith(FAMILIA_DO_TIPO[e.tipoId] ?? ""));
    const daFamilia = familia.map((a) => acoes.find((x) => x.nome === a.nome)).filter((a): a is NonNullable<typeof a> => !!a);
    const primeira = familia[0];
    const segunda = familia[1] ?? familia[0];
    const comoAcao = (a: typeof primeira) => { const x = a && acoes.find((y) => y.nome === a.nome); return x && a ? [{ acaoId: x.id, nome: x.nome, subitens: [a.subitens[0]!] }] : []; };
    const horas = (soma: number) => (base > 0 ? base + soma : 0);
    ([
      { tipo: "Preventiva", atras: 22, soma: 150, a: primeira, local: "empresa", localNome: "", pecas: "260,00", mao: "140,00", parada: "4", obs: "Revisão programada, sem pendências." },
      { tipo: "Corretiva", atras: 12, soma: 190, a: segunda, local: "terceiro", localNome: "Oficina Industrial Triângulo", pecas: "980,00", mao: "420,00", parada: "16", obs: "Reparo de defeito notado na vistoria." },
    ] as const).forEach((m, i) => {
      const r = registrarManutencaoEq({
        equipamentoId: id, tipo: m.tipo, data: dia(agora, m.atras), horimetro: horas(m.soma), acoes: comoAcao(m.a), local: m.local, localNome: m.localNome,
        custoPecas: m.pecas, custoMaoDeObra: m.mao, observacao: m.obs, horasParada: m.parada,
      }, st, agora);
      trocarId(storage, CHAVE_MANUTENCOES_EQ, r.id, `${PREFIXO}eq-manutencao-${k + 1}-${i + 1}`);
    });
    // Ordens de serviço em aberto, para testar o acompanhamento: uma pendente (atrasada em alguns) e uma em andamento, com técnico e previsão.
    if (k % 3 !== 2) {
      const andamento = k % 3 === 1;
      const o = registrarManutencaoEq({
        equipamentoId: id, tipo: andamento ? "Corretiva" : "Preventiva", status: andamento ? "Em andamento" : "Pendente", data: dia(agora, andamento ? 4 : 6), dataPrevista: dia(agora, k % 2 === 0 ? -5 : 2),
        responsavel: responsavel.nome, local: "empresa", localNome: "", observacao: andamento ? "Troca de componente aguardando peça." : "Revisão agendada com o técnico.", acoes: [],
      }, st, agora);
      trocarId(storage, CHAVE_MANUTENCOES_EQ, o.id, `${PREFIXO}eq-os-${k + 1}`);
    }
    if (daFamilia.length > 0) {
      ignorar(() => salvarPlano({ modo: "criar", equipamentoId: id, itens: daFamilia.slice(0, 2).map((a, i) => ({ acaoId: a.id, horas: i === 0 ? 250 * ((k % 3) + 1) : 1000, meses: i === 0 ? 3 + (k % 4) : 12 })) }, storage, agora));
    }

    // Ocorrência: uma por equipamento, com tratativa em parte delas.
    const nomeTipo = TIPOS_OCORRENCIA[k % TIPOS_OCORRENCIA.length]!.nome;
    const tipoOcorrencia = tiposOcorrencia.find((t) => t.nome === nomeTipo);
    const oc = registrarOcorrenciaEq({ equipamentoId: id, tipoId: tipoOcorrencia?.id ?? "", tipoNome: nomeTipo, data: dia(agora, 20 - k), descricao: TEXTO_OCORRENCIA[nomeTipo]! }, st, agora);
    // Quatro encerradas e três em tratativa (a tratativa fica salva, sem encerrar); as outras três seguem abertas.
    if (k % 3 === 0 || k % 5 === 1 || k % 5 === 2) {
      salvarTratativaEq(oc.id, { responsavelId: responsavel.id, descricaoEmpresa: "Defeito corrigido e equipamento liberado.", custoEmpresa: 150 + k * 40, pagamentoTerceiros: "", seguradora: "nao" }, { encerrar: k % 3 === 0, isAdmin: true }, st, agora);
    }
    trocarId(storage, CHAVE_OCORRENCIAS_EQ, oc.id, `${PREFIXO}eq-ocorrencia-${k + 1}`);

    // Check lists: cinco periódicos de cada finalidade (um por período da periodicidade da associação) e cinco avulsos, todos concluídos.
    for (let j = 0; j < 5; j++) {
      const dias = plano.dias[j]!;
      checklists.push({ idx, k, finalidade: "manutencao", atras: dias, problema: (k + j) % 4 === 0 });
      checklists.push({ idx, k, finalidade: "vistoria", atras: dias, problema: (k + j) % 4 === 1 });
      checklists.push({ idx, k, finalidade: j % 2 === 0 ? "manutencao" : "vistoria", atras: 1 + j * 3, problema: (k + j) % 3 === 0, avulso: true });
    }
  });

  checklists.forEach((c, i) => {
    const e = EQUIPAMENTOS_DE_TESTE[c.idx]!;
    const id = `${PREFIXO}equipamento-${c.idx + 1}`;
    const parte = lerChecklistEquipamento(storage)[c.finalidade];
    const associacao = parte.associacoes.find((a) => a.equipamentoId === id);
    const periodicidade = c.avulso ? undefined : periodicidadesDaAssociacaoEq(associacao)[0];
    const grupos = periodicidade ? gruposDoChecklistEq(associacao, parte.grupos, periodicidade) : gruposDoTipoEq(parte.grupos, e.tipoId);
    if (grupos.length === 0) return;
    const agoraDoCheck = new Date(agora.getTime() - c.atras * 86_400_000);
    const baseCheck = { equipamentoId: id, equipamentoRotulo: `${e.patrimonio} · ${e.nome}`, tipoEquipamento: tipos.find((t) => t.id === e.tipoId)?.nome ?? "", finalidade: c.finalidade, grupos };
    const criado = periodicidade
      ? iniciarChecklistEq({ ...baseCheck, periodicidade, responsavelId: EMPREGADOS[c.k]!.id, responsavelNome: EMPREGADOS[c.k]!.nome }, st, agoraDoCheck)
      : iniciarChecklistAvulsoEq(baseCheck, st, agoraDoCheck);
    criado.itens.forEach((item, n) => {
      const nok = c.problema && n === 0;
      avaliarItemEq(criado.id, item.id, { avaliacao: nok ? "NOK" : "OK", observacao: nok ? "Desgaste visível, agendar troca na próxima parada." : "" }, st);
    });
    concluirChecklistEq(criado.id, st, agoraDoCheck);
    // As ocorrências geradas pelos itens NOK ganham id de teste (e o check list passa a apontar para o novo), para saírem junto no Limpar.
    const concluidoAgora = JSON.parse(storage.getItem(CHAVE_CHECKLISTS_EQ) ?? "[]") as { id: string; itens: { ocorrenciaId: string | null }[] }[];
    concluidoAgora.find((x) => x.id === criado.id)?.itens.forEach((item, n) => {
      if (!item.ocorrenciaId) return;
      const novo = `${PREFIXO}eq-ocorrencia-checklist-${i + 1}-${n + 1}`;
      trocarId(storage, CHAVE_OCORRENCIAS_EQ, item.ocorrenciaId, novo);
      item.ocorrenciaId = novo;
    });
    storage.setItem(CHAVE_CHECKLISTS_EQ, JSON.stringify(concluidoAgora));
    trocarId(storage, CHAVE_CHECKLISTS_EQ, criado.id, `${PREFIXO}eq-checklist-${i + 1}`);
  });
}
