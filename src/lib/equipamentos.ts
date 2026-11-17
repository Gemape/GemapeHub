// Parâmetros > Equipamentos > Cadastrar equipamento: dados gerais (obrigatórios para todo equipamento) e especificações
// técnicas por grupo. O tipo escolhido (Parâmetros Específicos) decide quais grupos de campos técnicos aparecem; os demais ficam de fora do
// formulário e não são guardados. Fase 1: fica só no navegador, em modo demonstração; a tabela entra na Fase 2.
import { hojeLocal } from "./empregados.ts";
import { capitalizarTexto } from "./formatacao-cadastral.ts";

export type GrupoTecnico = "motor" | "eletrico" | "extintor";

export const STATUS_EQUIPAMENTO = ["Ativo", "Em manutenção", "Baixado/Inativo", "Reserva"] as const;

export const GRUPOS_TECNICOS: readonly GrupoTecnico[] = ["motor", "eletrico", "extintor"];

export const TITULO_GRUPO_TECNICO: Record<GrupoTecnico, string> = {
  motor: "Máquinas e veículos",
  eletrico: "Equipamentos elétricos e motores",
  extintor: "Extintor",
};

// `numero` aceita vírgula decimal; com `unidades` a pessoa escolhe a unidade, com `unidadeFixa` ela é só mostrada.
export type CampoTecnico = {
  id: string;
  grupo: GrupoTecnico;
  rotulo: string;
  tipo: "select" | "numero" | "data";
  opcoes?: readonly string[];
  unidades?: readonly string[];
  unidadeFixa?: string;
  obrigatorio?: boolean;
};

export const CAMPOS_TECNICOS: readonly CampoTecnico[] = [
  { id: "propulsao", grupo: "motor", rotulo: "Tipo de propulsão / alimentação", tipo: "select", opcoes: ["Diesel", "Gasolina", "Elétrico", "GLP/Gás", "Manual"] },
  { id: "capacidadeCarga", grupo: "motor", rotulo: "Capacidade de carga", tipo: "numero", unidades: ["kg", "t"] },
  { id: "horimetroInicial", grupo: "motor", rotulo: "Horímetro inicial", tipo: "numero", unidadeFixa: "h" },
  { id: "consumoEstimado", grupo: "motor", rotulo: "Consumo estimado", tipo: "numero", unidadeFixa: "L/h" },
  { id: "capacidadeTanque", grupo: "motor", rotulo: "Capacidade do tanque", tipo: "numero", unidadeFixa: "L" },
  { id: "tensao", grupo: "eletrico", rotulo: "Tensão elétrica (voltagem)", tipo: "select", opcoes: ["110V", "220V Monofásico", "220V Trifásico", "380V", "440V"] },
  { id: "potencia", grupo: "eletrico", rotulo: "Potência", tipo: "numero", unidades: ["CV", "HP", "kW"] },
  { id: "correnteNominal", grupo: "eletrico", rotulo: "Corrente nominal", tipo: "numero", unidadeFixa: "A" },
  { id: "pressaoTrabalho", grupo: "eletrico", rotulo: "Pressão de trabalho", tipo: "numero", unidades: ["PSI", "Bar"] },
  { id: "vazaoAgua", grupo: "eletrico", rotulo: "Vazão de água", tipo: "numero", unidadeFixa: "L/min" },
  { id: "agente", grupo: "extintor", rotulo: "Tipo de agente extintor", tipo: "select", opcoes: ["Água", "Pó PQS ABC", "Pó PQS BC", "CO2"], obrigatorio: true },
  { id: "capacidade", grupo: "extintor", rotulo: "Capacidade / carga", tipo: "numero", unidades: ["kg", "L"], obrigatorio: true },
  { id: "ultimaRecarga", grupo: "extintor", rotulo: "Data da última recarga", tipo: "data", obrigatorio: true },
  { id: "vencimentoTesteHidrostatico", grupo: "extintor", rotulo: "Vencimento do teste hidrostático", tipo: "data", obrigatorio: true },
];

// Campos técnicos dos grupos que o tipo do equipamento libera (Parâmetros Específicos), na ordem da tela.
export function camposTecnicosDosGrupos(grupos: readonly GrupoTecnico[]): CampoTecnico[] {
  return CAMPOS_TECNICOS.filter((c) => grupos.includes(c.grupo));
}

export type EntradaEquipamento = {
  id?: string;
  empresaId: string;
  patrimonio: string;
  nome: string;
  tipoId: string;
  marca: string;
  modelo: string;
  numeroSerie: string;
  dataAquisicao: string;
  valorCompra: string | number;
  status: string;
  setor: string;
  // Valores dos campos técnicos pelo id; a unidade de quem tem escolha vem em `${id}Unidade`.
  tecnico?: Record<string, string | undefined>;
};

export type EquipamentoDados = {
  empresaId: string;
  patrimonio: string;
  nome: string;
  tipoId: string;
  marca: string;
  modelo: string;
  numeroSerie: string;
  dataAquisicao: string;
  valorCompra: number;
  status: string;
  setor: string;
  tecnico: Record<string, string>;
};

const compactar = (v: string | undefined | null) => String(v ?? "").trim().replace(/\s+/g, " ");

// Número com vírgula decimal ("1.250,5" e "R$ 1.250,5" valem); `null` se vazio, negativo ou texto.
function lerNumero(valor: string | number | undefined, casas: number, maximo: number): number | null {
  if (valor === undefined || String(valor).trim() === "") return null;
  if (typeof valor === "number") return valor >= 0 && valor <= maximo ? valor : null;
  const texto = String(valor).replace(/R\$/gi, "").replace(/\s/g, "");
  // Sem vírgula, ponto seguido de exatamente 3 dígitos é milhar ("185.000", "2.500"), como se escreve no Brasil; "0.125" e "12.5" são decimais.
  const milhar = !texto.includes(",") && /^[1-9]\d{0,2}(\.\d{3})+$/.test(texto);
  const normal = texto.includes(",") || milhar ? texto.replace(/\./g, "").replace(",", ".") : texto;
  if (!new RegExp(`^\\d+(\\.\\d{1,${casas}})?$`).test(normal)) return null;
  const n = Number(normal);
  return n <= maximo ? n : null;
}

// Data real no formato AAAA-MM-DD (30/02 não vale).
function dataReal(d: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const t = new Date(`${d}T00:00:00Z`);
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === d;
}

// Valida e normaliza o equipamento. Qualquer erro interrompe antes de gravar (quem chama grava tudo ou nada).
// `contexto.tipo` é o tipo do equipamento já lido dos Parâmetros Específicos (quem chama resolve); os grupos dele decidem os campos técnicos.
export function normalizarEquipamento(
  entrada: EntradaEquipamento,
  contexto: { hoje?: Date; tipo?: { id: string; grupos: readonly GrupoTecnico[] } | undefined } = {},
): EquipamentoDados {
  const hoje = hojeLocal(contexto.hoje ?? new Date());
  const exigir = (valor: string, mensagem: string) => {
    if (!valor) throw new Error(mensagem);
    return valor;
  };
  const empresaId = exigir(compactar(entrada.empresaId), "Escolha a empresa do equipamento.");
  const patrimonio = exigir(compactar(entrada.patrimonio).toLocaleUpperCase("pt-BR"), "Informe o código de patrimônio (TAG ou placa).");
  const nome = exigir(capitalizarTexto(entrada.nome), "Informe o nome do equipamento.");
  if (!contexto.tipo || contexto.tipo.id !== entrada.tipoId) throw new Error("Escolha o tipo do equipamento.");
  const marca = exigir(capitalizarTexto(entrada.marca), "Informe a marca ou o fabricante.");
  const modelo = exigir(capitalizarTexto(entrada.modelo), "Informe o modelo do equipamento.");
  const numeroSerie = exigir(compactar(entrada.numeroSerie), "Informe o número de série.");
  const dataAquisicao = compactar(entrada.dataAquisicao);
  if (!dataAquisicao) throw new Error("Informe a data de aquisição.");
  if (!dataReal(dataAquisicao)) throw new Error("Data de aquisição inválida. Use uma data real, como 15/03/2026.");
  if (dataAquisicao > hoje) throw new Error("A data de aquisição não pode ser futura (depois de hoje).");
  const valorCompra = lerNumero(entrada.valorCompra, 2, 99_999_999.99);
  if (valorCompra === null) throw new Error("Informe o valor de compra em reais (0 ou mais).");
  if (!(STATUS_EQUIPAMENTO as readonly string[]).includes(entrada.status)) throw new Error("Escolha o status atual do equipamento.");
  const setor = exigir(capitalizarTexto(entrada.setor), "Informe o setor ou a localização.");

  // Só os campos dos grupos do tipo escolhido; o que sobrou de outro tipo é descartado.
  const tecnico: Record<string, string> = {};
  for (const campo of camposTecnicosDosGrupos(contexto.tipo.grupos)) {
    const bruto = compactar(entrada.tecnico?.[campo.id]);
    if (!bruto) {
      if (campo.obrigatorio) throw new Error(`Informe: ${campo.rotulo}.`);
      continue;
    }
    if (campo.tipo === "select") {
      if (!campo.opcoes?.includes(bruto)) throw new Error(`${campo.rotulo}: escolha uma das opções da lista.`);
      tecnico[campo.id] = bruto;
    } else if (campo.tipo === "data") {
      if (!dataReal(bruto)) throw new Error(`${campo.rotulo}: data inválida.`);
      if (campo.id === "ultimaRecarga" && bruto > hoje) throw new Error("A data da última recarga não pode ser futura.");
      tecnico[campo.id] = bruto;
    } else {
      const n = lerNumero(bruto, 3, 9_999_999.999);
      if (n === null) throw new Error(`Informe ${campo.rotulo.toLocaleLowerCase("pt-BR")} como número (0 ou mais).`);
      tecnico[campo.id] = String(n);
      if (campo.unidades) {
        const unidade = compactar(entrada.tecnico?.[`${campo.id}Unidade`]) || campo.unidades[0]!;
        if (!campo.unidades.includes(unidade)) throw new Error(`Escolha uma unidade válida para ${campo.rotulo.toLocaleLowerCase("pt-BR")}.`);
        tecnico[`${campo.id}Unidade`] = unidade;
      }
    }
  }
  return { empresaId, patrimonio, nome, tipoId: entrada.tipoId, marca, modelo, numeroSerie, dataAquisicao, valorCompra, status: entrada.status, setor, tecnico };
}
