import { useEffect, useMemo, useState } from "react";

import { useAccess } from "@/lib/access-context";
import { alertasDosCartoes, resumoDeVeiculos, type AlertaCartao } from "@/lib/alertas-cartao";
import { pendenciasDeHoje, type DespesaAbertaViagem, type GrupoPendencia, type OcorrenciaAtencaoEq, type OrdemAtencaoEq } from "@/lib/atencao-hoje";
import { hojeLocal } from "@/lib/empregados";
import { TODAS } from "@/lib/empresa-context";
import { listarEquipamentos } from "@/lib/equipamentos-demo";
import { estadoEstoqueModulo } from "@/lib/estoque-tamanho";
import { useEmpregados, useItens, useMovimentacoes, useVeiculos } from "@/lib/hooks-gemape";
import { lerPrazos } from "@/lib/prazo-viagens";
import { EVENTO_REGISTROS_EQUIPAMENTO, lerManutencoesEq, lerOcorrenciasEq } from "@/lib/registros-equipamento";
import { listarRelatorios, relatorioPorDespesa } from "@/lib/relatorios-viagens";
import { listarRespostas } from "@/lib/respostas-despesas";
import { useAbastecimentos, useChecklistsVeiculo, useManutencoesVeiculo, useOcorrenciasVeiculo, usePlanosVeiculo, usePrevisoesChecklist } from "@/lib/use-registros-veiculo";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { dadosDoLancamento } from "@/lib/viagens";

// Equipamentos e Viagens ficam só no navegador (modo demonstração): lidos depois de montar e relidos quando os registros de equipamento mudam.
type RegistrosLocais = { nomes: Map<string, string>; ordens: OrdemAtencaoEq[]; ocorrencias: OcorrenciaAtencaoEq[]; despesas: DespesaAbertaViagem[]; prazoDias: number };
function lerRegistrosLocais(): RegistrosLocais {
  const relatorios = relatorioPorDespesa(listarRelatorios());
  const prazos = lerPrazos();
  return {
    nomes: new Map(listarEquipamentos().map((e) => [e.id, e.nome])),
    ordens: lerManutencoesEq().map((m) => ({ id: m.id, equipamentoId: m.equipamentoId, tipo: m.tipo, ...(m.status ? { status: m.status } : {}), ...(m.dataPrevista ? { dataPrevista: m.dataPrevista } : {}), ...(m.responsavel ? { responsavel: m.responsavel } : {}) })),
    ocorrencias: lerOcorrenciasEq().map((o) => ({ id: o.id, equipamentoId: o.equipamentoId, tipoNome: o.tipoNome, status: o.status, data: o.data, ...(o.codigo ? { codigo: o.codigo } : {}) })),
    despesas: prazos.pcmAplica ? listarRespostas().filter((r) => !relatorios.has(r.id)).map((r) => { const d = dadosDoLancamento(r); return { id: r.id, tecnico: d.responsavel ?? d.tecnico ?? "Sem técnico", registradaEm: r.data }; }) : [],
    prazoDias: prazos.pcm,
  };
}

export type Pendencias = {
  pode: boolean;
  carregando: boolean;
  grupos: GrupoPendencia[];
  erroLocais: boolean;
  podeEquipamentos: boolean;
  podeViagens: boolean;
  /** Alerta de cada cartão cujos dados foram lidos (cartão fora do mapa: sem dado para dizer "Tudo em dia"). */
  alertas: Map<string, AlertaCartao>;
};

// Lê uma vez tudo o que a tela inicial precisa para avisar (pendências de hoje e alertas dos cartões). O histórico inteiro é pesado: a leitura começa um instante
// depois de a tela aparecer, para os cartões do menu não esperarem por ela.
export function usePendencias(): Pendencias {
  const { podeVerCaminho } = useAccess();
  const podeEpi = podeVerCaminho("/epi");
  const podeUniformes = podeVerCaminho("/uniformes");
  const podeFerramentas = podeVerCaminho("/ferramentas");
  const pode = podeEpi || podeUniformes || podeFerramentas;
  const parametros = useParametrosBase();
  const [pronto, setPronto] = useState(false);
  useEffect(() => { const t = setTimeout(() => setPronto(true), 600); return () => clearTimeout(t); }, []);
  const ler = pode && pronto;
  const { data: empregados = [], isLoading: l1 } = useEmpregados(TODAS, false, ler);
  const { data: epis = [], isLoading: l2 } = useItens("epi", TODAS, "", ler);
  const { data: uniformes = [] } = useItens("uniforme", TODAS, "", ler);
  const { data: ferramentas = [] } = useItens("ferramenta", TODAS, "", ler);
  const { data: movsEpi = [], isLoading: l3 } = useMovimentacoes("epi", TODAS, undefined, ler);
  const { data: movsFerramenta = [] } = useMovimentacoes("ferramenta", TODAS, undefined, ler);
  const podeEquipamentos = podeVerCaminho("/equipamentos");
  const podeViagens = podeVerCaminho("/viagens");
  const podeVeiculos = podeVerCaminho("/veiculos");
  const [locais, setLocais] = useState<RegistrosLocais | null>(null);
  const [erroLocais, setErroLocais] = useState(false);
  useEffect(() => {
    if (!pronto) return;
    const ler = () => { try { setLocais(lerRegistrosLocais()); setErroLocais(false); } catch { setLocais(null); setErroLocais(true); } };
    ler();
    // Relê quando os registros de equipamento mudam, quando outra aba grava (viagens, prazos) e quando a aba volta a ficar em foco.
    window.addEventListener(EVENTO_REGISTROS_EQUIPAMENTO, ler);
    window.addEventListener("storage", ler);
    window.addEventListener("focus", ler);
    return () => { window.removeEventListener(EVENTO_REGISTROS_EQUIPAMENTO, ler); window.removeEventListener("storage", ler); window.removeEventListener("focus", ler); };
  }, [pronto]);

  const grupos = useMemo(
    () => pendenciasDeHoje({
      hoje: hojeLocal(), empregados, epis, uniformes, ferramentas, movsEpi, movsFerramenta, estado: (modulo, item) => estadoEstoqueModulo(parametros, modulo, item as never),
      ...(locais ? { equipamentos: { nomes: locais.nomes, ordens: locais.ordens, ocorrencias: locais.ocorrencias }, viagens: { despesasEmAberto: locais.despesas, prazoDias: locais.prazoDias } } : {}),
    })
      // Quem não vê o módulo não vê o cartão dele, e os cartões de Equipamentos e Viagens só aparecem depois de lidos (senão mostrariam "0" sem terem sido lidos).
      .filter((g) => (podeEpi || !g.id.startsWith("epi-") && g.id !== "minimo-epi") && (podeUniformes || g.id !== "minimo-uniforme") && (podeFerramentas || (g.id !== "minimo-ferramenta" && g.id !== "devolucao-atrasada")))
      .filter((g) => (g.id !== "equipamentos" || (podeEquipamentos && locais !== null)) && (g.id !== "viagens" || (podeViagens && locais !== null))),
    [empregados, epis, uniformes, ferramentas, movsEpi, movsFerramenta, parametros, locais, podeEpi, podeUniformes, podeFerramentas, podeEquipamentos, podeViagens],
  );

  // Veículos: as mesmas regras da Frota (check list, revisões do plano e ocorrências), lidas só para quem pode ver a tela.
  const { data: veiculos, isLoading: lv } = useVeiculos(TODAS, pronto && podeVeiculos);
  const abastecimentos = useAbastecimentos();
  const manutencoes = useManutencoesVeiculo();
  const planos = usePlanosVeiculo();
  const ocorrencias = useOcorrenciasVeiculo();
  const checklists = useChecklistsVeiculo();
  const previsoes = usePrevisoesChecklist();
  const resumoVeiculos = useMemo(
    () => (pronto && podeVeiculos && veiculos && !lv
      ? resumoDeVeiculos({ veiculos, previsoes, checklists, planos, acoes: parametros.acoesManutencaoVeiculo, manutencoes, abastecimentos, ocorrencias })
      : null),
    [pronto, podeVeiculos, veiculos, lv, previsoes, checklists, planos, parametros, manutencoes, abastecimentos, ocorrencias],
  );

  const carregando = !pronto || l1 || l2 || l3;
  const alertas = useMemo(
    () => alertasDosCartoes(pode && !carregando ? grupos : null, resumoVeiculos),
    [pode, carregando, grupos, resumoVeiculos],
  );
  return { pode, carregando, grupos, erroLocais, podeEquipamentos, podeViagens, alertas };
}
