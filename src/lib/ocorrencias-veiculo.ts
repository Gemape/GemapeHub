// Ocorrências de veículo com status e tratativa (decisão 60). Fase 1: ficam só no navegador, em
// modo demonstração; as tabelas no banco real são pendência da Fase 2.
import {
  alterarLista, dinheiroPositivo, lerLista, validarData, validarHora, type StorageLike,
} from "./registros-veiculo.ts";
import { hojeLocal } from "./empregados.ts";

const CHAVE = "gemape-demo-ocorrencias-veiculo";
export const MAX_FOTOS = 6;
const LIMITE_FOTO = 600_000; // caracteres do data URL; a foto comprimida fica bem abaixo disso

export type StatusOcorrencia = "Aberta" | "Em tratativa" | "Encerrada";
export const STATUS_OCORRENCIA: readonly StatusOcorrencia[] = ["Aberta", "Em tratativa", "Encerrada"];

export type Tratativa = {
  responsavelId: string;
  descricaoEmpresa: string;
  descricaoTerceiros: string;
  custoEmpresa: number;
  pagamentoTerceiros: string;
  seguradora: boolean;
  registradaEm: string;
  atualizadaEm: string;
};

export type OcorrenciaVeiculo = {
  id: string;
  codigo: string;
  cadastradaEm: string;
  veiculoId: string;
  tipoId: string;
  tipoNome: string;
  ocorridoEm: string; // AAAA-MM-DDTHH:MM, horário local
  local: string;
  condutorId: string;
  danoEmpresa: boolean;
  danoTerceiros: boolean;
  descricao: string;
  fotos: string[];
  status: StatusOcorrencia;
  tratativa: Tratativa | null;
  encerradaEm: string | null;
};

const storagePadrao = (): StorageLike | null => (typeof localStorage === "undefined" ? null : localStorage);
const novoId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random()));

export const lerOcorrenciasVeiculo = (storage: StorageLike | null = storagePadrao()): OcorrenciaVeiculo[] =>
  lerLista<OcorrenciaVeiculo>(CHAVE, storage).lista;

export const contarPorStatus = (lista: { status: StatusOcorrencia }[]): Record<StatusOcorrencia, number> => ({
  Aberta: lista.filter((o) => o.status === "Aberta").length,
  "Em tratativa": lista.filter((o) => o.status === "Em tratativa").length,
  Encerrada: lista.filter((o) => o.status === "Encerrada").length,
});

function validarFotos(fotos: string[]): string[] {
  if (fotos.length > MAX_FOTOS) throw new Error(`No máximo ${MAX_FOTOS} fotos por ocorrência.`);
  if (fotos.some((f) => typeof f !== "string" || !f.startsWith("data:image/") || f.length > LIMITE_FOTO)) {
    throw new Error("Uma das fotos não é uma imagem válida ou ficou grande demais.");
  }
  return fotos;
}

// Guardar fotos pode estourar o espaço do navegador: avisa em português, sem perder o que já havia.
function gravar<T>(acao: () => T): T {
  try {
    return acao();
  } catch (erro) {
    if (erro instanceof Error && /quota|exceeded/i.test(`${erro.name} ${erro.message}`)) {
      throw new Error("O navegador ficou sem espaço para guardar as fotos. Remova fotos antigas ou anexe menos fotos.");
    }
    throw erro;
  }
}

export type EntradaOcorrencia = {
  veiculoId: string;
  tipoId: string;
  data: string;
  hora: string;
  local: string;
  condutorId: string;
  danoEmpresa: boolean;
  danoTerceiros: boolean;
  descricao: string;
  fotos: string[];
};

export function registrarOcorrenciaVeiculo(
  entrada: EntradaOcorrencia,
  storage = storagePadrao(),
  agora = new Date(),
  tiposValidos: { id: string; nome: string }[] = [],
): OcorrenciaVeiculo {
  if (!entrada.veiculoId) throw new Error("Selecione o veículo.");
  const tipo = tiposValidos.find((t) => t.id === entrada.tipoId);
  if (!entrada.tipoId || !tipo) throw new Error("Selecione o tipo de ocorrência (cadastrados em Parâmetros > Veículos).");
  const data = validarData(entrada.data, agora);
  let hora: string;
  try { hora = validarHora(entrada.hora); } catch { throw new Error("Informe a hora do ocorrido (HH:MM)."); }
  const p2 = (n: number) => String(n).padStart(2, "0");
  if (data === hojeLocal(agora) && hora > `${p2(agora.getHours())}:${p2(agora.getMinutes())}`) {
    throw new Error("A hora do ocorrido não pode ser futura.");
  }
  const local = entrada.local.trim().replace(/\s+/g, " ").slice(0, 200);
  if (!local) throw new Error("Informe o local da ocorrência.");
  if (!entrada.condutorId) throw new Error("Selecione o condutor.");
  const descricao = entrada.descricao.trim().slice(0, 2000);
  if (!descricao) throw new Error("Informe a descrição da ocorrência.");
  const fotos = validarFotos(entrada.fotos);
  let criada!: OcorrenciaVeiculo;
  gravar(() =>
    alterarLista<OcorrenciaVeiculo>(CHAVE, storage, (lista) => {
      // O código é calculado dentro da gravação, para dois cadastros seguidos não repetirem o número.
      const maior = lista.reduce((m, o) => Math.max(m, Number(String(o.codigo ?? "").replace(/\D/g, "")) || 0), 0);
      criada = {
        id: novoId(),
        codigo: `OCO-${String(maior + 1).padStart(4, "0")}`,
        cadastradaEm: agora.toISOString(),
        veiculoId: entrada.veiculoId,
        tipoId: tipo.id,
        tipoNome: tipo.nome,
        ocorridoEm: `${data}T${hora}`,
        local,
        condutorId: entrada.condutorId,
        danoEmpresa: !!entrada.danoEmpresa,
        danoTerceiros: !!entrada.danoTerceiros,
        descricao,
        fotos,
        status: "Aberta",
        tratativa: null,
        encerradaEm: null,
      };
      return [...lista, criada];
    }),
  );
  return criada;
}

export type EntradaTratativa = {
  responsavelId: string;
  descricaoEmpresa: string;
  descricaoTerceiros: string;
  custoEmpresa: string | number;
  pagamentoTerceiros: string;
  seguradora: string;
};

// Custo pode ser zero; fora isso segue o formato de reais da tela ("R$ 1.500,50").
function custo(valor: string | number): number | null {
  const texto = String(valor ?? "").replace(/R\$/gi, "").trim();
  if (!texto) return null;
  if (/^0+([.,]0{1,2})?$/.test(texto)) return 0;
  return dinheiroPositivo(valor);
}

function mudar(id: string, storage: StorageLike | null, alterar: (o: OcorrenciaVeiculo) => OcorrenciaVeiculo): OcorrenciaVeiculo {
  let resultado!: OcorrenciaVeiculo;
  gravar(() =>
    alterarLista<OcorrenciaVeiculo>(CHAVE, storage, (lista) => {
      const atual = lista.find((o) => o.id === id);
      if (!atual) throw new Error("Ocorrência não encontrada.");
      resultado = alterar(atual);
      return lista.map((o) => (o.id === id ? resultado : o));
    }),
  );
  return resultado;
}

const BLOQUEIO_ENCERRADA = "Esta ocorrência está encerrada. Só o Administrador pode alterá-la.";

// Salvar deixa a ocorrência "Em tratativa" (e pode ser editada de novo); encerrar fecha. Depois de
// encerrada só o Administrador mexe, e ela continua encerrada. Tudo ou nada.
export function salvarTratativa(
  id: string,
  dados: EntradaTratativa,
  opcoes: { encerrar: boolean; isAdmin: boolean },
  storage = storagePadrao(),
  agora = new Date(),
): OcorrenciaVeiculo {
  return mudar(id, storage, (o) => {
    if (o.status === "Encerrada" && !opcoes.isAdmin) throw new Error(BLOQUEIO_ENCERRADA);
    if (!dados.responsavelId) throw new Error("Selecione o responsável pela tratativa.");
    const descricaoEmpresa = dados.descricaoEmpresa.trim().slice(0, 2000);
    const descricaoTerceiros = dados.descricaoTerceiros.trim().slice(0, 2000);
    if (o.danoEmpresa && !descricaoEmpresa) throw new Error("Informe a descrição da tratativa do veículo da empresa.");
    if (o.danoTerceiros && !descricaoTerceiros) throw new Error("Informe a descrição da tratativa do veículo de terceiros.");
    const valor = custo(dados.custoEmpresa);
    if (valor === null) throw new Error("Informe o custo total da tratativa para a empresa (use 0 se não houve custo).");
    if (dados.seguradora !== "sim" && dados.seguradora !== "nao") throw new Error("Informe se houve uso de seguradora.");
    const iso = agora.toISOString();
    const tratativa: Tratativa = {
      responsavelId: dados.responsavelId,
      descricaoEmpresa,
      descricaoTerceiros,
      custoEmpresa: valor,
      pagamentoTerceiros: dados.pagamentoTerceiros.trim().slice(0, 1000),
      seguradora: dados.seguradora === "sim",
      registradaEm: o.tratativa?.registradaEm ?? iso,
      atualizadaEm: iso,
    };
    const encerra = o.status === "Encerrada" || opcoes.encerrar;
    return { ...o, tratativa, status: encerra ? "Encerrada" : "Em tratativa", encerradaEm: encerra ? (o.encerradaEm ?? iso) : null };
  });
}

export function adicionarFotosOcorrencia(
  id: string,
  novas: string[],
  opcoes: { isAdmin: boolean },
  storage = storagePadrao(),
): OcorrenciaVeiculo {
  return mudar(id, storage, (o) => {
    if (o.status === "Encerrada" && !opcoes.isAdmin) throw new Error(BLOQUEIO_ENCERRADA);
    return { ...o, fotos: validarFotos([...o.fotos, ...novas]) };
  });
}

export function removerFotoOcorrencia(id: string, indice: number, opcoes: { isAdmin: boolean }, storage = storagePadrao()): OcorrenciaVeiculo {
  return mudar(id, storage, (o) => {
    if (o.status === "Encerrada" && !opcoes.isAdmin) throw new Error(BLOQUEIO_ENCERRADA);
    return { ...o, fotos: o.fotos.filter((_, i) => i !== indice) };
  });
}

// Tipo fixo das ocorrências geradas por item NOK do check list (decisão 63); não depende de Parâmetros.
export const TIPO_OCORRENCIA_CHECKLIST = { id: "checklist", nome: "Item reprovado no check list" } as const;

export type EntradaOcorrenciaChecklist = { veiculoId: string; condutorId: string; descricao: string };

// Cria de uma vez as ocorrências dos itens NOK de um check list: Abertas, no tipo fixo, com o responsável
// do check list como condutor, dano no veículo da empresa e data e hora do momento. Tudo ou nada.
export function registrarOcorrenciasDoChecklist(
  entradas: EntradaOcorrenciaChecklist[],
  storage = storagePadrao(),
  agora = new Date(),
): OcorrenciaVeiculo[] {
  if (entradas.length === 0) return [];
  const p2 = (n: number) => String(n).padStart(2, "0");
  const ocorridoEm = `${hojeLocal(agora)}T${p2(agora.getHours())}:${p2(agora.getMinutes())}`;
  const criadas: OcorrenciaVeiculo[] = [];
  gravar(() =>
    alterarLista<OcorrenciaVeiculo>(CHAVE, storage, (lista) => {
      let maior = lista.reduce((m, o) => Math.max(m, Number(String(o.codigo ?? "").replace(/\D/g, "")) || 0), 0);
      for (const e of entradas) {
        maior += 1;
        criadas.push({
          id: novoId(),
          codigo: `OCO-${String(maior).padStart(4, "0")}`,
          cadastradaEm: agora.toISOString(),
          veiculoId: e.veiculoId,
          tipoId: TIPO_OCORRENCIA_CHECKLIST.id,
          tipoNome: TIPO_OCORRENCIA_CHECKLIST.nome,
          ocorridoEm,
          local: "Check list do veículo",
          condutorId: e.condutorId,
          danoEmpresa: true,
          danoTerceiros: false,
          descricao: e.descricao.trim().replace(/\s+/g, " ").slice(0, 2000),
          fotos: [],
          status: "Aberta",
          tratativa: null,
          encerradaEm: null,
        });
      }
      return [...lista, ...criadas];
    }),
  );
  return criadas;
}

// Desfaz o cadastro de ocorrências (usado só se o check list não puder ser gravado depois delas).
export function removerOcorrenciasPorId(ids: string[], storage = storagePadrao()): void {
  if (ids.length === 0) return;
  alterarLista<OcorrenciaVeiculo>(CHAVE, storage, (lista) => lista.filter((o) => !ids.includes(o.id)));
}
