// Dec 223: o Abastecimento de fábrica passou a seguir a ordem e a classificação de Alimentação. Muitos testes antigos usam o
// Abastecimento só como exemplo de questionário completo; esta função devolve o estado com o Abastecimento como era antes.
export function legado(estado) {
  const regras = { ...estado.regras };
  const cartao = regras["Abastecimento"]?.["q-02"];
  if (cartao) regras["Abastecimento"] = { "q-02": cartao };
  else delete regras["Abastecimento"];
  return {
    ...estado,
    questionarios: { ...estado.questionarios, Abastecimento: ["q-01", "q-02", "q-04", "q-14", "q-05", "q-06", "q-08", "q-09", "q-10", "q-11", "q-12", "q-13"] },
    regras,
  };
}
