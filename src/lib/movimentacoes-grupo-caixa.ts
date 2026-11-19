// Apoio das Movimentações de Ferramentas que escolhem a caixa, depois o grupo de ferramentas, e só então a ferramenta: saída do estoque, baixa definitiva e transferência.
// Funções puras, sem tela, para testar as regras sem montar componente.
export const SEM_GRUPO_FERRAMENTA = "Sem grupo";

const chave = (texto: string) => texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();

/** Grupo da ferramenta como aparece na lista: o cadastrado, ou "Sem grupo" quando está em branco. */
export const grupoDaFerramenta = (f: { grupo_ferramenta?: string | null | undefined }): string => (f.grupo_ferramenta ?? "").trim() || SEM_GRUPO_FERRAMENTA;

/** Grupos que existem entre as ferramentas, sem repetir (maiúscula e acento não separam grupos), em ordem alfabética. */
export function gruposDasFerramentas(ferramentas: readonly { grupo_ferramenta?: string | null | undefined }[]): string[] {
  const vistos = new Map<string, string>();
  for (const f of ferramentas) {
    const nome = grupoDaFerramenta(f);
    if (!vistos.has(chave(nome))) vistos.set(chave(nome), nome);
  }
  return [...vistos.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export const ehDoGrupo = (f: { grupo_ferramenta?: string | null | undefined }, grupo: string): boolean => !!grupo && chave(grupoDaFerramenta(f)) === chave(grupo);

export type SelecaoDeBaixa = { nome: string; quantidade: number; disponivel: number; saldoEstoque: number };

/** Confere a baixa definitiva de várias ferramentas de uma caixa; devolve a mensagem do primeiro problema ou null. */
export function erroDaBaixaEmLote(d: { selecionadas: readonly SelecaoDeBaixa[]; motivo: string; data: string }): string | null {
  if (d.selecionadas.length === 0) return "Marque ao menos uma ferramenta para dar baixa.";
  if (!d.motivo) return "Escolha o motivo da baixa.";
  if (!d.data) return "Informe a data da baixa.";
  for (const s of d.selecionadas) {
    if (!Number.isInteger(s.quantidade) || s.quantidade < 1) return `Informe a quantidade de ${s.nome} (inteiro, mínimo 1).`;
    if (s.quantidade > s.disponivel) return `Só ${s.disponivel} de ${s.nome} está guardada na caixa; a baixa não pode passar disso.`;
    if (s.quantidade > s.saldoEstoque) return `O estoque tem ${s.saldoEstoque} de ${s.nome}; a baixa não pode passar disso. Registre a entrada antes.`;
  }
  return null;
}

/** Texto da ocorrência aberta por uma baixa definitiva: a tratativa é apurar de quem foi a responsabilidade. */
export function descricaoDaBaixaDefinitiva(d: { ferramenta: string; quantidade: number; caixa: string; motivo: string; data: string; portador?: string | null | undefined; observacao?: string | null | undefined }): string {
  const data = d.data.slice(0, 10).split("-").reverse().join("/");
  const obs = d.observacao?.trim();
  return `Baixa definitiva de ${d.quantidade} × ${d.ferramenta} da caixa ${d.caixa} em ${data}. Motivo: ${d.motivo}. ${d.portador ? `Portador da caixa: ${d.portador}.` : "A caixa não tinha portador."}${obs ? ` Observação: ${obs}` : ""} Tratativa: apurar a responsabilidade pela baixa.`;
}

export type SelecaoDeTransferencia = { nome: string; comEmpregado: number; jaNoDestino: boolean; quantidade: number; disponivel: number };

/** Confere a transferência de várias ferramentas de uma caixa para outra; devolve a mensagem do primeiro problema ou null. */
export function erroDaTransferenciaEmLote(d: { origemId: string; destinoId: string; selecionadas: readonly SelecaoDeTransferencia[] }): string | null {
  if (!d.origemId) return "Escolha a caixa de origem.";
  if (!d.destinoId) return "Escolha a caixa de destino.";
  if (d.destinoId === d.origemId) return "A caixa de destino deve ser outra.";
  if (d.selecionadas.length === 0) return "Marque ao menos uma ferramenta para transferir.";
  for (const s of d.selecionadas) {
    if (s.jaNoDestino) return `${s.nome} já está na caixa de destino.`;
    if (s.comEmpregado > 0) return `${s.nome}: ${s.comEmpregado} está com empregado; registre a devolução antes de transferir.`;
    // A transferência leva a quantidade cadastrada na caixa; se parte dela já saiu por baixa, o destino ganharia unidades que não existem mais.
    if (s.disponivel < s.quantidade) return `${s.nome}: ${s.quantidade - s.disponivel} já saiu por baixa; ajuste a quantidade da ferramenta na caixa antes de transferir.`;
  }
  return null;
}
