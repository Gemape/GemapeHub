// Ordem de Serviço de EPI (Parâmetros > EPI > Cadastrar Ordem de Serviço): por função e setor, o que o empregado precisa saber sobre os riscos da função, os EPIs
// que usa, o que não pode fazer e os treinamentos que precisa ter. Cada ordem é identificada por Função + Setor, sem repetir. Todos os tópicos são obrigatórios.
// O texto fica como digitado, sem capitalização automática: siglas como FISPQ, LOTO e NR-26 seriam estragadas.
// Fase 1: fica só no navegador, em modo demonstração; na Fase 2 vira tabela no banco.

type StorageLike = Pick<Storage, "getItem" | "setItem">;

const CHAVE = "gemape-demo-ordens-servico-epi";
export const EVENTO_ORDENS = "gemape-ordens-servico-epi";
export const MAX_TEXTO_OS = 4000;
export const MAX_LINHA_OS = 80;

// Os tópicos, na ordem do modelo. `tipo`: "linha" é um campo de uma linha; os demais são áreas de texto (as listas levam um item por linha, com ● ou como a pessoa preferir).
export const CAMPOS_OS = [
  { chave: "funcao", rotulo: "Função", tipo: "linha" },
  { chave: "setor", rotulo: "Setor", tipo: "linha" },
  { chave: "objetivo", rotulo: "Objetivo", tipo: "texto" },
  { chave: "atividades", rotulo: "Descrição das atividades", tipo: "texto" },
  { chave: "riscos", rotulo: "Riscos ocupacionais", tipo: "lista" },
  { chave: "epis", rotulo: "Equipamentos de proteção individual", tipo: "lista" },
  { chave: "condutasProibidas", rotulo: "Condutas proibidas", tipo: "lista" },
  { chave: "procedimentos", rotulo: "Procedimentos de segurança críticos", tipo: "lista" },
  { chave: "treinamentos", rotulo: "Treinamentos e autorizações", tipo: "lista" },
] as const;

export type CampoOs = (typeof CAMPOS_OS)[number]["chave"];
export type ConteudoOs = Record<CampoOs, string>;
export type OrdemServicoEpi = ConteudoOs & { id: string; atualizadaEm: string };

const storagePadrao = (): StorageLike | null => (typeof localStorage === "undefined" ? null : localStorage);

// Data de uma ordem (guardada em UTC) no fuso de Brasília.
export const dataDaOrdem = (iso: string): string => (iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—");

export const ordemVazia = (): ConteudoOs => Object.fromEntries(CAMPOS_OS.map((c) => [c.chave, ""])) as ConteudoOs;

const chaveDe = (t: string) => t.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[̀-ͯ]/g, "");
const novoId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `os-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);

// `integro` é false quando havia dados que não puderam ser lidos: a tela mostra a lista vazia, mas nada é gravado por cima deles.
function lerComEstado(storage: StorageLike | null): { ordens: OrdemServicoEpi[]; integro: boolean } {
  if (!storage) return { ordens: [], integro: true };
  let bruto: string | null;
  try { bruto = storage.getItem(CHAVE); } catch { return { ordens: [], integro: false }; }
  if (bruto === null) return { ordens: [], integro: true };
  try {
    const salvas = JSON.parse(bruto) as unknown;
    if (!Array.isArray(salvas)) return { ordens: [], integro: false };
    const validas = salvas.filter((o): o is Partial<OrdemServicoEpi> => !!o && typeof o === "object" && typeof (o as { id?: unknown }).id === "string");
    const ordens = validas.map((o) => ({
      ...ordemVazia(),
      ...Object.fromEntries(CAMPOS_OS.map((c) => [c.chave, String(o[c.chave] ?? "")])),
      id: String(o.id),
      atualizadaEm: String(o.atualizadaEm ?? ""),
    })) as OrdemServicoEpi[];
    return { ordens, integro: validas.length === salvas.length };
  } catch {
    return { ordens: [], integro: false };
  }
}

export const lerOrdens = (storage: StorageLike | null = storagePadrao()): OrdemServicoEpi[] => lerComEstado(storage).ordens;

function alterar(storage: StorageLike | null, mudanca: (ordens: OrdemServicoEpi[]) => OrdemServicoEpi[]) {
  if (!storage) throw new Error("Armazenamento do navegador indisponível.");
  const { ordens, integro } = lerComEstado(storage);
  if (!integro) throw new Error("As ordens de serviço salvas neste navegador não puderam ser lidas. Nada foi alterado, para não apagá-las.");
  // A mudança (e as validações dela) roda fora do try: só a gravação em si vira a mensagem de armazenamento.
  const novas = mudanca(ordens);
  try {
    storage.setItem(CHAVE, JSON.stringify(novas));
  } catch {
    throw new Error("Não foi possível guardar a ordem de serviço neste navegador.");
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO_ORDENS));
}

function conteudoLimpo(conteudo: ConteudoOs): ConteudoOs {
  const limpo = ordemVazia();
  for (const campo of CAMPOS_OS) {
    const texto = String(conteudo[campo.chave] ?? "").trim();
    if (!texto) throw new Error(`Preencha "${campo.rotulo}".`);
    const limite = campo.tipo === "linha" ? MAX_LINHA_OS : MAX_TEXTO_OS;
    if (texto.length > limite) throw new Error(`"${campo.rotulo}" aceita no máximo ${limite} caracteres.`);
    limpo[campo.chave] = campo.tipo === "linha" ? texto.replace(/\s+/g, " ") : texto;
  }
  return limpo;
}

// Cria a ordem ou, com `id`, edita a existente. Função e setor não se repetem em outra ordem; a edição de uma ordem não acusa repetição dela mesma.
export function salvarOrdem(conteudo: ConteudoOs, opcoes: { id?: string } = {}, storage = storagePadrao(), agora = new Date()): OrdemServicoEpi {
  const limpo = conteudoLimpo(conteudo);
  const ordem: OrdemServicoEpi = { ...limpo, id: opcoes.id ?? novoId(), atualizadaEm: agora.toISOString() };
  alterar(storage, (ordens) => {
    if (opcoes.id && !ordens.some((o) => o.id === opcoes.id)) throw new Error("Esta ordem de serviço não existe mais.");
    if (ordens.some((o) => o.id !== ordem.id && chaveDe(o.funcao) === chaveDe(ordem.funcao) && chaveDe(o.setor) === chaveDe(ordem.setor))) {
      throw new Error(`Já existe uma ordem de serviço para a função "${ordem.funcao}" no setor "${ordem.setor}".`);
    }
    return opcoes.id ? ordens.map((o) => (o.id === ordem.id ? ordem : o)) : [...ordens, ordem];
  });
  return ordem;
}

export function removerOrdem(id: string, storage = storagePadrao()): void {
  alterar(storage, (ordens) => ordens.filter((o) => o.id !== id));
}
