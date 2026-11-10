// Registros do módulo Veículos nos dados de teste: para cada um dos cinco veículos, abastecimentos, plano de manutenção, manutenção preventiva e corretiva,
// ocorrências e check list (com itens NOK em alguns), para testar o extrato, os relatórios e os painéis. Grava pelas mesmas funções das telas, com datas
// no passado e o km sempre crescendo (a regra de km do registro confere abastecimentos e manutenções juntos).
import { criarAssociacao } from "../checklist-associacao-veiculo.ts";
import { avaliarItem, concluirChecklist, gruposAplicaveis, iniciarChecklist, iniciarChecklistAvulso } from "../checklist-veiculo.ts";
import { hojeLocal } from "../empregados.ts";
import { registrarOcorrenciaVeiculo, salvarTratativa } from "../ocorrencias-veiculo.ts";
import * as Gerais from "../parametros-base.ts";
import { criarPlano } from "../plano-manutencao.ts";
import { registrarAbastecimento, registrarManutencao } from "../registros-veiculo.ts";
import { EMPREGADOS, PLANOS_CHECKLIST_TESTE, VEICULOS } from "./conjunto.ts";

type Armazenamento = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const dia = (agora: Date, atras: number) => hojeLocal(new Date(agora.getTime() - atras * 86_400_000));
const ignorar = (acao: () => unknown) => { try { acao(); } catch { /* já existe: o conjunto é aplicado de novo sem duplicar */ } };
const em = (agora: Date, atras: number) => new Date(agora.getTime() - atras * 86_400_000);

// Histórico de manutenções para o gráfico de custo preventivo x corretivo (regra 80/20) ter barras variadas, acima e abaixo da meta de 80% de preventiva. Os intervalos entre as datas são de
// até 25 dias e o conjunto começa 175 dias atrás, para cobrir os seis meses do gráfico em qualquer dia de hoje. As preventivas recentes são de freios (e não de óleo) para não mudar quais planos
// de óleo nascem vencidos; `desc` é quanto o km do registro fica abaixo do km atual do veículo.
export const HISTORICO_MANUTENCOES = [
  { atras: 175, desc: 6600, tipo: "Preventiva", acao: "oleo", item: "Óleo do motor", pecas: "380,00", mao: "150,00" },
  { atras: 150, desc: 6000, tipo: "Preventiva", acao: "oleo", item: "Óleo do motor", pecas: "380,00", mao: "150,00" },
  { atras: 125, desc: 5400, tipo: "Preventiva", acao: "oleo", item: "Óleo do motor", pecas: "380,00", mao: "150,00" },
  { atras: 112, desc: 5000, tipo: "Corretiva", acao: "freios", item: "Pastilhas de freio", pecas: "120,00", mao: "60,00" },
  { atras: 90, desc: 3800, tipo: "Preventiva", acao: "oleo", item: "Óleo do motor", pecas: "380,00", mao: "150,00" },
  { atras: 75, desc: 3200, tipo: "Corretiva", acao: "freios", item: "Pastilhas de freio", pecas: "200,00", mao: "100,00" },
  { atras: 50, desc: 2350, tipo: "Corretiva", acao: "freios", item: "Pastilhas de freio", pecas: "100,00", mao: "50,00" },
  { atras: 25, desc: 900, tipo: "Preventiva", acao: "freios", item: "Pastilhas de freio", pecas: "280,00", mao: "120,00" },
  { atras: 2, desc: 20, tipo: "Preventiva", acao: "freios", item: "Pastilhas de freio", pecas: "250,00", mao: "100,00" },
] as const;

export function semearModuloVeiculos(storage: Armazenamento, agora: Date): void {
  const st = storage as Storage;
  ignorar(() => Gerais.cadastrarPadraoChecklistVeiculos(storage as never));
  const parametros = Gerais.lerParametros(storage as never);
  const acoes = parametros.acoesManutencaoVeiculo;
  const acaoPorNome = (nome: string) => acoes.find((a) => a.nome === nome);
  const oleo = acaoPorNome("Troca de óleo e filtros");
  const freios = acaoPorNome("Freios e suspensão");
  const pneus = acaoPorNome("Pneus e alinhamento");
  const tipoOcorrencia = (nome: string) => parametros.tiposOcorrenciaVeiculo.find((t) => t.nome === nome);
  const subitem = (acao: typeof oleo, nome: string) => acao?.subitens.find((s) => s.nome === nome)?.id;

  // O histórico de manutenções precisa dos grupos e subitens de Parâmetros: confere uma vez antes de gravar o primeiro veículo, para não deixar dados pela metade.
  const grupoDoHistorico = (h: (typeof HISTORICO_MANUTENCOES)[number]) => (h.acao === "oleo" ? oleo : freios);
  for (const h of HISTORICO_MANUTENCOES) {
    const acao = grupoDoHistorico(h);
    if (!acao || !subitem(acao, h.item)) throw new Error(`Dados de teste: falta "${h.item}" em Parâmetros > Veículos para o histórico de manutenções.`);
  }

  VEICULOS.forEach((v, n) => {
    const K = v.km;
    // Abastecimentos mais antigos e mais novos que o que a base já grava (entre 20 e 8 dias atrás), com o km crescendo.
    for (const [atras, hora, km, litros, valor] of [[45, "08:10", K - 2200, 36, 215], [32, "17:40", K - 1500, 40, 238], [3, "07:50", K - 50, 41, 252]] as const) {
      ignorar(() => registrarAbastecimento({ veiculoId: v.id, data: dia(agora, atras), hora, km, litros, valor }, st, agora));
    }

    // Manutenções: uma preventiva (óleo e filtros, na empresa) e uma corretiva (freios, em oficina de terceiro).
    if (oleo && subitem(oleo, "Óleo do motor") && subitem(oleo, "Filtro de óleo")) {
      ignorar(() => registrarManutencao({
        veiculoId: v.id, data: dia(agora, 60), km: K - 2500, tipo: "Preventiva", acaoId: oleo.id,
        itens: [{ subitemId: subitem(oleo, "Óleo do motor")! }, { subitemId: subitem(oleo, "Filtro de óleo")! }],
        local: "empresa", localNome: "", custoPecas: "280,00", custoMaoDeObra: "120,00",
      }, st, agora, acoes));
    }
    if (freios && subitem(freios, "Pastilhas de freio")) {
      ignorar(() => registrarManutencao({
        veiculoId: v.id, data: dia(agora, 15), km: K - 350, tipo: "Corretiva", acaoId: freios.id, descricao: "Ruído ao frear e pedal mais baixo que o normal.",
        itens: [{ subitemId: subitem(freios, "Pastilhas de freio")!, observacao: "Pastilhas dianteiras no limite." }],
        local: "terceiro", localNome: "Auto Center Triângulo", custoPecas: "420,00", custoMaoDeObra: "260,00",
      }, st, agora, acoes));
    }

    // Histórico dos meses anteriores (ver HISTORICO_MANUTENCOES); a conferência dos parâmetros já foi feita antes do loop dos veículos.
    for (const h of HISTORICO_MANUTENCOES) {
      const acao = grupoDoHistorico(h)!;
      const id = subitem(acao, h.item)!;
      ignorar(() => registrarManutencao({
        veiculoId: v.id, data: dia(agora, h.atras), km: K - h.desc, tipo: h.tipo, acaoId: acao.id,
        ...(h.tipo === "Corretiva" ? { descricao: "Desgaste identificado na revisão do veículo." } : {}),
        itens: [{ subitemId: id }], local: "empresa", localNome: "", custoPecas: h.pecas, custoMaoDeObra: h.mao,
      }, st, agora, acoes));
    }

    // Plano de manutenção: o do primeiro veículo (óleo a cada 2.000 km) e o do quarto (óleo a cada mês) já nascem vencidos; os outros, em dia.
    // Os planos de freios nascem em dia para os cinco, porque o histórico acima tem preventiva de freios recente.
    const itensDoPlano = [
      oleo ? { acaoId: oleo.id, km: n === 0 ? 2000 : 10000, meses: n === 3 ? 1 : 6 } : null,
      freios ? { acaoId: freios.id, km: 20000, meses: 12 } : null,
      n === 4 && pneus ? { acaoId: pneus.id, km: 30000, meses: 12 } : null,
    ].filter((i): i is { acaoId: string; km: number; meses: number } => i !== null);
    if (itensDoPlano.length > 0) ignorar(() => criarPlano(v.id, itensDoPlano, st, agora, acoes.map((a) => a.id)));
  });

  // Ocorrências: cinco, uma por veículo; uma em tratativa e uma encerrada, as outras abertas.
  const ocorrencias = [
    { n: 0, atras: 18, tipo: "Colisão leve", local: "Pátio do cliente, Av. Industrial, 500", empresa: true, terceiros: false, texto: "Pequena batida no para-choque traseiro ao manobrar no pátio." },
    { n: 1, atras: 12, tipo: "Pane mecânica na estrada", local: "BR-050, km 112", empresa: true, terceiros: false, texto: "Superaquecimento do motor, caminhão parado até a chegada do guincho.", tratativa: "andamento" },
    { n: 2, atras: 9, tipo: "Multa de trânsito", local: "Av. Brasil, 1200", empresa: true, terceiros: false, texto: "Infração por excesso de velocidade em via urbana, identificar o condutor.", tratativa: "encerrada" },
    { n: 3, atras: 5, tipo: "Colisão leve", local: "Estacionamento do cliente, Rua das Flores, 90", empresa: true, terceiros: true, texto: "Contato com o veículo de terceiro ao estacionar, sem feridos." },
    { n: 4, atras: 2, tipo: "Pane mecânica na estrada", local: "Rodovia Anhanguera, km 45", empresa: true, terceiros: false, texto: "Falha na embreagem durante a viagem de entrega." },
    { n: 5, atras: 16, tipo: "Multa de trânsito", local: "Rua XV de Novembro, 300", empresa: true, terceiros: false, texto: "Estacionamento em local proibido durante visita ao cliente.", tratativa: "encerrada" },
    { n: 6, atras: 14, tipo: "Colisão leve", local: "Estacionamento do shopping, Av. Paulista, 1000", empresa: true, terceiros: true, texto: "Arranhão na lateral causado por outro veículo, sem feridos." },
    { n: 7, atras: 10, tipo: "Pane mecânica na estrada", local: "BR-381, km 450", empresa: true, terceiros: false, texto: "Pneu furado em viagem; troca feita no acostamento.", tratativa: "andamento" },
    { n: 8, atras: 7, tipo: "Colisão leve", local: "Pátio da obra, Rua Sete, 25", empresa: true, terceiros: false, texto: "Contato com poste ao manobrar o caminhão, dano no para-choque." },
    { n: 9, atras: 3, tipo: "Multa de trânsito", local: "Av. Amazonas, 800", empresa: true, terceiros: false, texto: "Radar de velocidade em via urbana, condutor a identificar." },
  ] as const;
  ocorrencias.forEach((o) => {
    const v = VEICULOS[o.n]!;
    const tipo = tipoOcorrencia(o.tipo);
    if (!tipo) return;
    ignorar(() => {
      const criada = registrarOcorrenciaVeiculo({
        veiculoId: v.id, tipoId: tipo.id, data: dia(agora, o.atras), hora: "09:15", local: o.local, condutorId: EMPREGADOS[o.n]!.id,
        danoEmpresa: o.empresa, danoTerceiros: o.terceiros, descricao: o.texto, fotos: [],
      }, st, agora, parametros.tiposOcorrenciaVeiculo);
      if ("tratativa" in o) {
        salvarTratativa(criada.id, {
          responsavelId: EMPREGADOS[o.n]!.id, descricaoEmpresa: o.tratativa === "encerrada" ? "Multa paga e condutor identificado." : "Veículo rebocado para a oficina, aguardando orçamento do reparo.",
          descricaoTerceiros: "", custoEmpresa: o.tratativa === "encerrada" ? "195,23" : "1850", pagamentoTerceiros: "", seguradora: "nao",
        }, { encerrar: o.tratativa === "encerrada", isAdmin: true }, st, agora);
      }
    });
  });

  // Check lists para consulta e teste: em cada veículo, cinco periódicos (semanais, quinzenais ou mensais, conforme o veículo, com períodos feitos e perdidos) e cinco avulsos, todos concluídos e preenchidos; parte deles com
  // item NOK, que gera ocorrência e pendência aberta. Os avulsos usam os grupos "Avulso ·" do tipo do veículo (sem periodicidade nem responsável).
  const grupos = Gerais.lerParametros(storage as never).itensChecklistVeiculo;
  // Os grupos do padrão primeiro; os que a pessoa criou (e os personalizados de outro veículo) ficam de fora dos check lists de teste.
  const escolher = (lista: typeof grupos) => lista.filter((g) => !g.nome.startsWith("Personalizado")).sort((x, y) => Number(Gerais.ehGrupoChecklistPadrao(y.nome)) - Number(Gerais.ehGrupoChecklistPadrao(x.nome))).slice(0, 2);
  const preencher = (criado: { id: string; itens: { id: string }[] }, problema: boolean, quando: Date) => {
    criado.itens.forEach((item, k) => {
      const nok = problema && k === 0;
      avaliarItem(criado.id, item.id, { avaliacao: nok ? "NOK" : "OK", observacao: nok ? "Desgaste visível, agendar troca na próxima parada." : "" }, st);
    });
    concluirChecklist(criado.id, st, quando);
  };
  VEICULOS.forEach((v, n) => {
    const periodicos = escolher(gruposAplicaveis(grupos, v.subId, false));
    const avulsos = escolher(gruposAplicaveis(grupos, v.subId, true));
    // Os dois últimos veículos têm responsável do PCM (Thiago e Camila, os empregados 7 e 8, da mesma empresa de cada veículo, para o responsável da associação valer), para os indicadores do PCM do check list terem dados; os outros três são da Oficina.
    // Do sexto veículo em diante, o responsável é o empregado de mesma ordem (n % 3 = empresa do veículo, como EMPRESAS[n % 3] em conjunto.ts).
    const responsavel = EMPREGADOS[n < 3 ? n : n < 5 ? n + 3 : n]!;
    const plano = PLANOS_CHECKLIST_TESTE[n < 3 ? n : n < 5 ? n - 2 : n % 5]!;
    const rotulo = `${v.placa.slice(0, 3)}-${v.placa.slice(3)} · ${v.marca} ${v.modelo}`;
    if (periodicos.length > 0) {
      ignorar(() => criarAssociacao(v.id, { id: responsavel.id, nome: responsavel.nome }, periodicos.map((g) => ({ grupoId: g.id, tipo: "periodico", periodicidade: plano.periodicidade })), st, em(agora, plano.desde)));
      plano.dias.forEach((dias, k) => {
        const quando = em(agora, dias);
        ignorar(() => preencher(iniciarChecklist({ veiculoId: v.id, veiculoRotulo: rotulo, tipoVeiculo: v.tipo, periodicidade: plano.periodicidade, responsavelId: responsavel.id, responsavelNome: responsavel.nome, grupos: periodicos, grupoChecklist: n < 3 ? "Técnicos" : "PCM" }, st, quando), (n + k) % 4 === 1, quando));
      });
    }
    if (avulsos.length > 0) {
      for (let k = 0; k < 5; k++) {
        const quando = em(agora, 1 + k * 3);
        ignorar(() => preencher(iniciarChecklistAvulso({ veiculoId: v.id, veiculoRotulo: rotulo, tipoVeiculo: v.tipo, grupos: avulsos, grupoChecklist: n < 3 ? "Técnicos" : "PCM" }, st, quando), (n + k) % 3 === 0, quando));
      }
    }
  });
}
