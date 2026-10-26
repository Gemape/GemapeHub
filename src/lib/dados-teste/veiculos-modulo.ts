// Registros do módulo Veículos nos dados de teste: para cada um dos cinco veículos, abastecimentos, plano de manutenção, manutenção preventiva e corretiva,
// ocorrências e check list (com itens NOK em alguns), para testar o extrato, os relatórios e os painéis. Grava pelas mesmas funções das telas, com datas
// no passado e o km sempre crescendo (a regra de km do registro confere abastecimentos e manutenções juntos).
import { criarAssociacao } from "../checklist-associacao-veiculo.ts";
import { avaliarItem, concluirChecklist, gruposAplicaveis, iniciarChecklist } from "../checklist-veiculo.ts";
import { hojeLocal } from "../empregados.ts";
import { registrarOcorrenciaVeiculo, salvarTratativa } from "../ocorrencias-veiculo.ts";
import * as Gerais from "../parametros-base.ts";
import { criarPlano } from "../plano-manutencao.ts";
import { registrarAbastecimento, registrarManutencao } from "../registros-veiculo.ts";
import { EMPREGADOS, VEICULOS } from "./conjunto.ts";

type Armazenamento = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const dia = (agora: Date, atras: number) => hojeLocal(new Date(agora.getTime() - atras * 86_400_000));
const ignorar = (acao: () => unknown) => { try { acao(); } catch { /* já existe: o conjunto é aplicado de novo sem duplicar */ } };
const em = (agora: Date, atras: number) => new Date(agora.getTime() - atras * 86_400_000);

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

    // Plano de manutenção: o do primeiro veículo (óleo a cada 2.000 km) e o do quarto (óleo a cada mês) já nascem vencidos; os outros, em dia.
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

  // Check lists: um por veículo, semanal, concluído; os do segundo e do quarto têm item NOK, que gera ocorrência e pendência aberta.
  const grupos = Gerais.lerParametros(storage as never).itensChecklistVeiculo;
  VEICULOS.forEach((v, n) => {
    const aplicaveis = gruposAplicaveis(grupos, v.subId, false).slice(0, 2);
    if (aplicaveis.length === 0) return;
    const responsavel = EMPREGADOS[n]!;
    ignorar(() => criarAssociacao(v.id, { id: responsavel.id, nome: responsavel.nome }, aplicaveis.map((g) => ({ grupoId: g.id, tipo: "periodico", periodicidade: "Semanal" })), st, agora));
    const quando = em(agora, 6 - n);
    ignorar(() => {
      const criado = iniciarChecklist({
        veiculoId: v.id, veiculoRotulo: `${v.placa.slice(0, 3)}-${v.placa.slice(3)} · ${v.marca} ${v.modelo}`, tipoVeiculo: v.tipo, periodicidade: "Semanal",
        responsavelId: responsavel.id, responsavelNome: responsavel.nome, grupos: aplicaveis,
      }, st, quando);
      const problema = n === 1 || n === 3;
      criado.itens.forEach((item, k) => {
        const nok = problema && k === 0;
        avaliarItem(criado.id, item.id, { avaliacao: nok ? "NOK" : "OK", observacao: nok ? "Desgaste visível, agendar troca na próxima parada." : "" }, st);
      });
      concluirChecklist(criado.id, st, quando);
    });
  });
}
