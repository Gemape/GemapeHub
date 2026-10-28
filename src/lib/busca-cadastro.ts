// Busca por palavra-chave nos cadastros de Empregados, Clientes e Fornecedores (decisão 312): vale qualquer palavra, em qualquer campo do cadastro, sem diferenciar
// maiúsculas nem acentos, e todas as palavras digitadas precisam aparecer (em campos quaisquer, na ordem que for). Documentos (CPF, CNPJ) e telefone também
// casam só pelos dígitos, com ou sem pontuação.

// Todo valor de texto ou número do cadastro, mais os extras que a tela monta (nome da empresa, datas formatadas, situação), e os documentos sem pontuação.
export function camposDeBusca(cadastro: object, extras: (string | null | undefined)[] = []): string[] {
  // Identificadores internos (id, empresa_id, veiculoId...) não são do cadastro: um trecho de UUID não pode casar com a palavra digitada.
  const valores = Object.entries(cadastro).filter(([k]) => !/^id$|_id$|Id$/.test(k)).map(([, v]) => v).filter((v): v is string | number => typeof v === "string" || typeof v === "number").map(String);
  const soDigitos = valores.filter((v) => /[.\-/() ]/.test(v) && /\d/.test(v)).map((v) => v.replace(/\D/g, "")).filter((v) => v.length >= 4);
  return [...valores, ...soDigitos, ...extras.filter((e): e is string => !!e)];
}
