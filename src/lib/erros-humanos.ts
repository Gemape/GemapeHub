// Mensagens de erro em português simples e com o próximo passo, no lugar do texto técnico do banco ou da rede.
// Só texto: quem chama decide onde mostrar (aviso, alerta, campo).

const dataBr = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

export type ItemComValidade = { nome?: string | null; ca?: string | null; ca_validade?: string | null; data_validade?: string | null };

/** Vencimento que impede a entrega: o do CA (Certificado de Aprovação) ou o da validade do próprio item. Devolve a frase pronta, ou null se está em dia. */
export function mensagemValidadeVencida(item: ItemComValidade, dataEntrega: string): string | null {
  const nome = item.nome ? ` de “${item.nome}”` : "";
  if (item.ca_validade && item.ca_validade.slice(0, 10) < dataEntrega) {
    return `O Certificado de Aprovação (CA${item.ca ? ` ${item.ca}` : ""})${nome} venceu em ${dataBr(item.ca_validade)}. Deseja selecionar outro lote válido?`;
  }
  if (item.data_validade && item.data_validade.slice(0, 10) < dataEntrega) {
    return `A validade${nome} venceu em ${dataBr(item.data_validade)}. Deseja selecionar outro lote válido?`;
  }
  return null;
}

const texto = (erro: unknown): string => {
  if (typeof erro === "string") return erro;
  if (erro && typeof erro === "object") {
    const e = erro as { message?: unknown; details?: unknown; code?: unknown };
    return [e.message, e.details, e.code].filter((x) => typeof x === "string").join(" ");
  }
  return "";
};

// Mensagens que o próprio sistema já escreve em português para o usuário: ficam como estão.
const JA_HUMANA = /^(Informe|Selecione|Já existe|CPF|E-mail|Matrícula|Não foi possível|Escolha|Adicione|A data|O estoque|Somente|Sem conexão)/;

/** Traduz erro de rede, banco ou servidor para algo que o operador entenda e saiba o que fazer. */
export function mensagemHumana(erro: unknown): string {
  const t = texto(erro);
  const baixo = t.toLowerCase();
  if (!t) return "Algo deu errado. Tente de novo; se continuar, avise o responsável pelo sistema.";
  if (JA_HUMANA.test(t.trim())) return t.trim();
  if (/failed to fetch|networkerror|network request failed|load failed|timeout|timed out|offline/.test(baixo)) {
    return "Sem conexão com o servidor. Confira a internet e tente de novo; o que você digitou continua na tela.";
  }
  if (/duplicate key|unique constraint|23505|already exists/.test(baixo)) {
    return "Já existe um registro com esse código, número ou placa. Confira se ele já foi cadastrado.";
  }
  if (/foreign key|23503|violates foreign/.test(baixo)) {
    return "Este registro está sendo usado em outro cadastro (entregas, ocorrências ou vínculos) e não pode ser apagado ou alterado assim. Inative-o em vez de excluir.";
  }
  if (/not-null|null value|23502/.test(baixo)) {
    return "Falta preencher um campo obrigatório. Confira o formulário e tente de novo.";
  }
  if (/row-level security|permission denied|not authorized|42501|jwt|forbidden|\b(?:http|status|code|erro)\s*:?\s*(?:401|403)\b/.test(baixo)) {
    return "Você não tem permissão para esta ação, ou a sessão expirou. Entre de novo ou peça acesso a um Administrador.";
  }
  if (/\b(?:http|status|code|erro)\s*:?\s*5\d\d\b|^5\d\d\s|internal server|bad gateway|service unavailable|nullpointer|undefined is not|cannot read prop|unexpected token/.test(baixo)) {
    return "O sistema teve um problema ao concluir. Tente de novo em instantes; se continuar, avise o responsável pelo sistema.";
  }
  return t.length > 160 ? "Não foi possível concluir a ação. Tente de novo; se continuar, avise o responsável pelo sistema." : t;
}
