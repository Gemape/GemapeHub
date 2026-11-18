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
