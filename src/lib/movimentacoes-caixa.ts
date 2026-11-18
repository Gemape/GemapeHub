// Ferramentas > Movimentações > Entrega à caixa: a ferramenta do estoque é entregue a uma caixa (vínculo ferramenta-caixa), nunca a uma pessoa.
// Quem usa a caixa é o portador dela; o relatório do empregado cruza o histórico de portadores com o das caixas.
export type ItemDaCaixa = { ferramenta_id: string; quantidade: number; observacao?: string | null | undefined };

export type DadosEntregaNaCaixa = {
  ferramentaId: string;
  nomeFerramenta: string;
  quantidade: number;
  data: string;
  empresaDaCaixa: string | null;
  empresaDaFerramenta: string | null;
  /** Ferramentas que a caixa já guarda, para somar quando a ferramenta já está nela. */
  itensDaCaixa: readonly ItemDaCaixa[];
  /** Código da outra caixa em que a ferramenta já está, se estiver. */
  emOutraCaixa: string | null;
  /** Quanto do saldo do estoque ainda está fora de qualquer caixa. */
  semCaixa: number;
};

/** Confere a entrega e devolve a lista nova de ferramentas da caixa (ou a mensagem do que está errado). */
export function entregarFerramentaNaCaixa(d: DadosEntregaNaCaixa): { erro: string } | { itens: ItemDaCaixa[] } {
  if (!d.ferramentaId) return { erro: "Escolha a ferramenta." };
  if (!Number.isInteger(d.quantidade) || d.quantidade < 1) return { erro: "Informe a quantidade (inteiro, mínimo 1)." };
  if (!d.data) return { erro: "Informe a data da entrega." };
  if (d.empresaDaCaixa && d.empresaDaFerramenta && d.empresaDaCaixa !== d.empresaDaFerramenta)
    return { erro: `${d.nomeFerramenta} é de outra empresa: a caixa só recebe ferramentas da empresa dela.` };
  if (d.emOutraCaixa)
    return { erro: `${d.nomeFerramenta} já está na caixa ${d.emOutraCaixa}. Dê baixa ou transfira a ferramenta para usá-la em outra caixa.` };
  if (d.quantidade > d.semCaixa)
    return { erro: `Só ${Math.max(d.semCaixa, 0)} de ${d.nomeFerramenta} está fora das caixas; a entrega não pode passar disso. Registre a entrada no estoque antes.` };
  const jaNaCaixa = d.itensDaCaixa.some((i) => i.ferramenta_id === d.ferramentaId);
  const itens = jaNaCaixa
    ? d.itensDaCaixa.map((i) => (i.ferramenta_id === d.ferramentaId ? { ...i, quantidade: i.quantidade + d.quantidade } : { ...i }))
    : [...d.itensDaCaixa.map((i) => ({ ...i })), { ferramenta_id: d.ferramentaId, quantidade: d.quantidade, observacao: "" }];
  return { itens };
}

export type DadosReposicaoNaCaixa = {
  /** Ferramenta que sai da caixa (baixa). */
  antigaId: string;
  /** Ferramenta nova que entra no lugar; pode ser a mesma ferramenta, outra unidade dela. */
  novaId: string;
  nomeNova: string;
  quantidade: number;
  motivo: string;
  data: string;
  empresaDaCaixa: string | null;
  empresaDaNova: string | null;
  itensDaCaixa: readonly ItemDaCaixa[];
  /** Código da outra caixa em que a ferramenta nova já está, se estiver. */
  novaEmOutraCaixa: string | null;
  /** Quanto do saldo da ferramenta nova está fora de qualquer caixa. */
  semCaixaDaNova: number;
  /** Saldo do estoque da ferramenta que sai: a baixa não passa dele. */
  saldoEstoqueDaAntiga: number;
};

/** Troca de ferramenta na caixa: baixa a antiga e entrega a nova. Devolve a lista nova de ferramentas da caixa (ou o erro). */
export function reporFerramentaNaCaixa(d: DadosReposicaoNaCaixa): { erro: string } | { itens: ItemDaCaixa[] } {
  if (!d.antigaId) return { erro: "Escolha a ferramenta que sai da caixa." };
  if (!d.novaId) return { erro: "Escolha a ferramenta nova." };
  if (!Number.isInteger(d.quantidade) || d.quantidade < 1) return { erro: "Informe a quantidade (inteiro, mínimo 1)." };
  if (!d.motivo) return { erro: "Escolha o motivo da baixa." };
  if (!d.data) return { erro: "Informe a data da reposição." };
  const antiga = d.itensDaCaixa.find((i) => i.ferramenta_id === d.antigaId);
  if (!antiga) return { erro: "A ferramenta que sai não está na caixa." };
  if (d.quantidade > antiga.quantidade) return { erro: `Só ${antiga.quantidade} está guardada na caixa; a baixa não pode passar disso.` };
  if (d.quantidade > d.saldoEstoqueDaAntiga) return { erro: `O estoque tem ${d.saldoEstoqueDaAntiga} dessa ferramenta; a baixa não pode passar disso.` };
  if (d.empresaDaCaixa && d.empresaDaNova && d.empresaDaCaixa !== d.empresaDaNova)
    return { erro: `${d.nomeNova} é de outra empresa: a caixa só recebe ferramentas da empresa dela.` };
  if (d.novaEmOutraCaixa) return { erro: `${d.nomeNova} já está na caixa ${d.novaEmOutraCaixa}.` };
  if (d.quantidade > d.semCaixaDaNova)
    return { erro: `Só ${Math.max(d.semCaixaDaNova, 0)} de ${d.nomeNova} está fora das caixas; a reposição não pode passar disso. Registre a entrada no estoque antes.` };
  // Sai a quantidade da antiga (a linha some se zerar) e entra a da nova, somando se a caixa já a guarda.
  const semAntiga = d.itensDaCaixa.flatMap((i) => (i.ferramenta_id === d.antigaId ? (i.quantidade - d.quantidade > 0 ? [{ ...i, quantidade: i.quantidade - d.quantidade }] : []) : [{ ...i }]));
  const jaTem = semAntiga.some((i) => i.ferramenta_id === d.novaId);
  const itens = jaTem
    ? semAntiga.map((i) => (i.ferramenta_id === d.novaId ? { ...i, quantidade: i.quantidade + d.quantidade } : i))
    : [...semAntiga, { ferramenta_id: d.novaId, quantidade: d.quantidade, observacao: "" }];
  return { itens };
}
