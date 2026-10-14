// Municípios por UF (lista oficial do IBGE), carregados só quando a tela precisa deles (são ~5,5 mil nomes).
// Fonte: tabela de municípios do IBGE em https://github.com/kelvins/municipios-brasileiros (csv/municipios.csv), lida em 14/10/2026.
let cache: Promise<Record<string, string[]>> | null = null;

export function carregarMunicipios(): Promise<Record<string, string[]>> {
  cache ??= import("./dados/municipios-ibge.json", { with: { type: "json" } })
    .then((m) => m.default as Record<string, string[]>)
    // Falha de carregamento não fica guardada: a próxima chamada tenta de novo.
    .catch((erro) => { cache = null; throw erro; });
  return cache;
}

export async function municipiosDaUf(sigla: string): Promise<string[]> {
  return (await carregarMunicipios())[sigla.toUpperCase()] ?? [];
}

// Busca por palavra-chave, sem diferenciar maiúsculas nem acentos.
const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR");
export const filtrarMunicipios = (lista: string[], busca: string): string[] => {
  const termo = semAcento(busca.trim());
  return termo ? lista.filter((m) => semAcento(m).includes(termo)) : lista;
};
