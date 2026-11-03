
test("o status de criticidade tem legenda sempre visível e balão ao passar o mouse (decisão 354)", () => {
  const tela = readFileSync(new URL("../src/components/modules/SugestaoComprasEpi.tsx", import.meta.url), "utf8");
  assert.match(tela, /<LegendaStatusCompra \/>/, "a legenda fica acima da tabela");
  assert.equal((tela.match(/<EtiquetaStatusCompra status=\{l\.status\} \/>/g) ?? []).length, 2, "a tabela e a lista do relatório usam a etiqueta com balão");
  const legenda = readFileSync(new URL("../src/components/modules/LegendaStatusCompra.tsx", import.meta.url), "utf8");
  assert.match(legenda, /TooltipContent/);
  assert.match(legenda, /STATUS_CRITICIDADE\[n\]\.significado/, "a legenda usa o significado de Parâmetros Específicos");
  assert.match(legenda, /Sem consumo registrado/);
});
