// Vincular e desvincular o portador de uma caixa: datas permitidas e autorização do supervisor para datas retroativas.
// A senha do supervisor vale só no modo demonstração; a autenticação de verdade vem na Fase 2.
export const SENHA_DEMO_SUPERVISOR = "supervisor";

const normalizar = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
const br = (data: string) => data.slice(0, 10).split("-").reverse().join("/");

export const ehRetroativa = (data: string, hoje: string): boolean => !!data && data < hoje;

/** Confere a data da vinculação ou da desvinculação; `minimo` é a data a partir da qual ela pode valer (início do portador atual). */
export function erroDaDataDoVinculo(data: string, hoje: string, minimo?: string | null): string | null {
  if (!data) return "Informe a data.";
  if (data > hoje) return "A data não pode ser futura.";
  if (minimo && data < minimo) return `A data não pode ser anterior a ${br(minimo)}, quando o portador atual assumiu a caixa.`;
  return null;
}

type Pessoa = { id: string; nome: string; ativo: boolean; data_demissao: string | null; supervisor_id?: string | null };

/** Supervisor é o empregado ativo que consta como supervisor de alguém. Devolve o supervisor ou a mensagem do que está errado. */
export function validarSupervisor(nome: string, senha: string, empregados: readonly Pessoa[], hoje: string, impedidoId?: string): { supervisor: Pessoa } | { erro: string } {
  if (!nome.trim()) return { erro: "Informe o nome do supervisor." };
  if (!senha) return { erro: "Informe a senha do supervisor." };
  const ids = new Set(empregados.map((e) => e.supervisor_id).filter((s): s is string => !!s));
  if (ids.size === 0) return { erro: "Nenhum empregado tem supervisor cadastrado. Informe o supervisor de cada empregado no Cadastro de empregados." };
  const achados = empregados.filter((e) => ids.has(e.id) && e.ativo && (!e.data_demissao || e.data_demissao > hoje) && normalizar(e.nome) === normalizar(nome));
  if (achados.length === 0) return { erro: "Supervisor não encontrado. Informe o nome completo de um supervisor ativo." };
  if (achados.length > 1) return { erro: "Há mais de um supervisor com esse nome; a autorização precisa identificar uma pessoa só." };
  const supervisor = achados[0]!;
  // Quem é o portador não autoriza o próprio registro retroativo.
  if (impedidoId && supervisor.id === impedidoId) return { erro: "O próprio portador não pode autorizar o registro. Chame outro supervisor." };
  if (senha !== SENHA_DEMO_SUPERVISOR) return { erro: "Senha do supervisor incorreta." };
  return { supervisor };
}

/** O que o supervisor está autorizando, dito por extenso na janela de senha. */
export function textoDaAutorizacao(d: { acao: "vincular" | "desvincular"; caixa: string; empregado: string; data: string; hoje: string }): string {
  return d.acao === "vincular"
    ? `Autorizo o registro retroativo, com data de ${br(d.data)} (anterior a hoje, ${br(d.hoje)}), do início da responsabilidade de ${d.empregado} pela caixa ${d.caixa}.`
    : `Autorizo o registro retroativo, com data de ${br(d.data)} (anterior a hoje, ${br(d.hoje)}), do encerramento da responsabilidade de ${d.empregado} pela caixa ${d.caixa}.`;
}
