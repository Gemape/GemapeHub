// Marca escolhida numa lista de Cadastros > Gerais (decisão 22). O formulário usa ids,
// para que um nome de marca nunca se confunda com "Sem marca". Marca antiga digitada,
// que não está em Gerais, continua aparecendo e é preservada ao editar outros campos.
import { mesmoNome, type Opcao } from "./parametros-base.ts";

export const SEM_MARCA = "sem-marca";
export const MARCA_LEGADA = "marca-legada";
export const selecaoMarca = (id: string) => `marca:${id}`;

const ERRO_ESCOLHA = "Marca inválida. Escolha uma marca de Cadastros > Gerais.";

export function selecaoInicialMarca(
  marcas: Opcao[],
  marcaAtual: string | null | undefined,
): { valor: string; legada: string | null } {
  const atual = marcaAtual?.trim() ?? "";
  if (!atual) return { valor: SEM_MARCA, legada: null };
  // Só a grafia exata, como em Ferramenta: "hering" não vira "Hering" sem o usuário escolher.
  const cadastrada = marcas.find((m) => m.nome === atual);
  if (cadastrada) return { valor: selecaoMarca(cadastrada.id), legada: null };
  return { valor: MARCA_LEGADA, legada: marcaAtual ?? atual };
}

export function marcaDaSelecao(
  selecao: string,
  marcas: Opcao[],
  marcaAtual: string | null | undefined,
  opcoes: { obrigatoria?: boolean } = {},
): string {
  if (!selecao || selecao === SEM_MARCA) {
    if (opcoes.obrigatoria) throw new Error("Selecione a marca.");
    return "";
  }
  if (selecao === MARCA_LEGADA) {
    if (!marcaAtual?.trim()) throw new Error(ERRO_ESCOLHA);
    return marcaAtual;
  }
  const marca = marcas.find((m) => selecaoMarca(m.id) === selecao);
  if (!marca) throw new Error(ERRO_ESCOLHA);
  return marca.nome;
}

export function marcaEmUso(registros: { marca?: string | null }[], nome: string): boolean {
  return registros.some((r) => !!r.marca && mesmoNome(r.marca, nome));
}
