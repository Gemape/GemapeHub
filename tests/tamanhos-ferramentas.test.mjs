import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  adicionarTamanhoGrupoFerramenta, cadastrarTamanhosPadraoFerramentas, lerParametros, removerListaFerramenta,
  removerTamanhoGrupoFerramenta,
} from "../src/lib/parametros-base.ts";
import { GRUPOS_SEM_TAMANHO, TAMANHOS_FERRAMENTAS_PADRAO, grupoTemTamanhos } from "../src/lib/tamanhos-ferramentas-padrao.ts";

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};
import { adicionarListaFerramenta } from "../src/lib/parametros-base.ts";
const adicionarGrupo = (s, nome) => { adicionarListaFerramenta("gruposFerramenta", nome, s); return grupo(s, nome).id; };
const grupo = (s, nome) => lerParametros(s).gruposFerramenta.find((g) => g.nome.toLowerCase() === nome.toLowerCase());

test("a planilha tem 15 colunas (sem Luva, dec 134) e os tamanhos transcritos (dec 117)", () => {
  assert.equal(TAMANHOS_FERRAMENTAS_PADRAO.length, 15);
  const de = (g) => TAMANHOS_FERRAMENTAS_PADRAO.find((x) => x.grupo === g).tamanhos;
  assert.equal(de("Chave boca").length, 15);
  assert.equal(de("Chave estria").length, 16);
  assert.deepEqual(de("Torx"), ["T10", "T15", "T20", "T27", "T30", "T40", "T45", "T50"]);
  assert.deepEqual(de("Chave Allen"), ["1,5", "2", "2,5", "3", "4", "5", "6", "8", "10"]);
});

test("cadastrar tamanhos padrão cria os grupos que faltam e é repetível sem duplicar", () => {
  const s = memoria();
  const r = cadastrarTamanhosPadraoFerramentas(s);
  assert.equal(r.grupos, 3); // Chave, Torx e Canhão Torx (Luva não tem tamanhos, dec 134)
  const total = TAMANHOS_FERRAMENTAS_PADRAO.reduce((n, g) => n + g.tamanhos.length, 0);
  assert.equal(r.tamanhos, total);
  const dados = lerParametros(s);
  assert.equal(dados.tamanhosGrupoFerramenta[grupo(s, "Alicates").id].length, 9);
  assert.equal(dados.tamanhosGrupoFerramenta[grupo(s, "Chave Philips").id], undefined);
  assert.deepEqual(cadastrarTamanhosPadraoFerramentas(s), { grupos: 0, tamanhos: 0 });
});

test("incluir e excluir tamanho de um grupo; repetido e vazio são recusados", () => {
  const s = memoria();
  const lima = grupo(s, "Lima").id;
  assert.equal(adicionarTamanhoGrupoFerramenta(lima, "  Triangular ", s), "Triangular");
  assert.throws(() => adicionarTamanhoGrupoFerramenta(lima, "triangular", s), /já existe/i);
  assert.throws(() => adicionarTamanhoGrupoFerramenta(lima, "  ", s), /informe/i);
  assert.throws(() => adicionarTamanhoGrupoFerramenta("x", "1", s), /não encontrad|encontr/i);
  removerTamanhoGrupoFerramenta(lima, "Triangular", s);
  assert.deepEqual(lerParametros(s).tamanhosGrupoFerramenta[lima], []);
});

test("excluir o grupo leva os tamanhos dele; dados antigos sem o campo abrem normalmente", () => {
  const s = memoria();
  const lima = grupo(s, "Lima").id;
  adicionarTamanhoGrupoFerramenta(lima, "Chata", s);
  removerListaFerramenta("gruposFerramenta", lima, s);
  assert.equal(lerParametros(s).tamanhosGrupoFerramenta[lima], undefined);
  const antigo = memoria();
  antigo.setItem("gemape-demo-parametros-base", JSON.stringify({ categorias: [] }));
  const dadosAntigos = lerParametros(antigo);
  // dados antigos abrem normalmente; só a Chave de fenda recebe os tamanhos da dec 135
  assert.deepEqual(Object.keys(dadosAntigos.tamanhosGrupoFerramenta), [dadosAntigos.gruposFerramenta.find((g) => g.nome === "Chave de fenda").id]);
});

test("a Chave de fenda tem os 6 tamanhos da dec 135, incluídos uma vez e sem repetir", () => {
  const fenda = TAMANHOS_FERRAMENTAS_PADRAO.find((g) => g.grupo === "Chave de fenda").tamanhos;
  assert.deepEqual(fenda, ['1/8" x 3" (3x75 mm)', '3/16" x 4" (5x100 mm)', '1/4" x 4" (6,5x100 mm)', '1/4" x 6" (6,5x150 mm)', '5/16" x 6" (8x150 mm)', '3/8" x 8" (10x200 mm)']);
  const s = memoria();
  s.setItem("gemape-demo-parametros-base", JSON.stringify({ categorias: [] })); // navegador que já tinha cadastros salvos
  const id = grupo(s, "Chave de fenda").id;
  assert.deepEqual(lerParametros(s).tamanhosGrupoFerramenta[id], fenda);
  removerTamanhoGrupoFerramenta(id, fenda[0], s);
  assert.equal(lerParametros(s).tamanhosGrupoFerramenta[id].length, 5); // depois de salvar, o tamanho tirado não volta
  assert.equal(cadastrarTamanhosPadraoFerramentas(s).tamanhos > 0, true);
  assert.equal(lerParametros(s).tamanhosGrupoFerramenta[id].filter((t) => t === fenda[1]).length, 1); // sem repetir
});

test("a tela de Parâmetros Específicos de Ferramentas mostra os subgrupos de cada grupo, na mesma página (dec 159)", () => {
  const rota = readFileSync("src/routes/_authenticated/cadastros/gerais/categorias.tsx", "utf8");
  assert.match(rota, /<SubgruposFerramenta dados=\{dados\}/);
  assert.match(rota, /Grupos de ferramentas/); // a lista dos grupos (pais) continua na mesma página
  const tela = readFileSync("src/components/parametros/SubgruposFerramenta.tsx", "utf8");
  assert.match(tela, /Cadastrar subgrupos/);
  assert.match(tela, /Cadastrar padrão/);
  assert.match(tela, /<RestaurarPadraoInicial/);
  assert.match(tela, /<AcoesLinha rotulo=\{g\.nome\} onEditar=\{\(\) => abrir\("editar", g\)\} onExcluir=\{\(\) => excluir\(g\)\}/);
  assert.doesNotMatch(tela, /onClonar|clonar/i); // só Editar e Excluir em cada linha
  assert.match(tela, /<th className="px-3 py-2">Subgrupos<\/th>/);
});

test("Diversos e Luva não têm tamanhos: somem da tabela e o campo Tamanho não oferece opções (dec 134)", async () => {
  assert.deepEqual([...GRUPOS_SEM_TAMANHO], ["Diversos", "Luva"]);
  assert.equal(grupoTemTamanhos("luva"), false);
  assert.equal(grupoTemTamanhos("Diversos"), false);
  assert.equal(grupoTemTamanhos("Chave L"), true);
  const tela = readFileSync(new URL("../src/components/parametros/SubgruposFerramenta.tsx", import.meta.url), "utf8");
  assert.match(tela, /filter\(\(g\) => grupoTemTamanhos\(g\.nome\)\)/);
  const { tamanhosDoGrupoFerramenta } = await import("../src/lib/cadastro-ferramentas.ts");
  const s = memoria();
  const luva = adicionarGrupo(s, "Luva");
  adicionarTamanhoGrupoFerramenta(luva, "Raspa", s); // dado antigo guardado
  assert.deepEqual(tamanhosDoGrupoFerramenta(lerParametros(s), "Luva"), []);
});

test("subgrupos do grupo: cadastrar soma, editar substitui e excluir esvazia, tudo ou nada (dec 159)", async () => {
  const { definirSubgruposGrupoFerramenta } = await import("../src/lib/parametros-base.ts");
  const s = memoria();
  const id = adicionarGrupo(s, "Soquete");
  definirSubgruposGrupoFerramenta(id, ["8", "9", " 10 "], "somar", s);
  assert.deepEqual(lerParametros(s).tamanhosGrupoFerramenta[id], ["8", "9", "10"]);
  definirSubgruposGrupoFerramenta(id, ["11"], "somar", s);
  assert.deepEqual(lerParametros(s).tamanhosGrupoFerramenta[id], ["8", "9", "10", "11"]);
  assert.throws(() => definirSubgruposGrupoFerramenta(id, ["9"], "somar", s), /já existe/);
  assert.throws(() => definirSubgruposGrupoFerramenta(id, ["12", "12"], "substituir", s), /repetido/);
  assert.throws(() => definirSubgruposGrupoFerramenta(id, [" ", ""], "somar", s), /ao menos um/);
  assert.deepEqual(lerParametros(s).tamanhosGrupoFerramenta[id], ["8", "9", "10", "11"]); // erro não gravou nada
  definirSubgruposGrupoFerramenta(id, ["A", "B"], "substituir", s);
  assert.deepEqual(lerParametros(s).tamanhosGrupoFerramenta[id], ["A", "B"]);
  definirSubgruposGrupoFerramenta(id, [], "substituir", s);
  assert.equal(lerParametros(s).tamanhosGrupoFerramenta[id], undefined);
  assert.throws(() => definirSubgruposGrupoFerramenta("inexistente", ["1"], "somar", s), /não encontrado|Grupo/);
});

test("restaurar configurações iniciais dos subgrupos de ferramenta: situação, restauração e grupo excluído (dec 159)", async () => {
  const { situacoesPadraoFerramentas, restaurarPadroesFerramentas, definirSubgruposGrupoFerramenta, removerListaFerramenta } = await import("../src/lib/parametros-base.ts");
  const s = memoria();
  cadastrarTamanhosPadraoFerramentas(s);
  const torx = grupo(s, "Torx").id;
  const antes = situacoesPadraoFerramentas(s).find((p) => p.nome === "Torx");
  assert.equal(antes.situacao, "igual");
  definirSubgruposGrupoFerramenta(torx, ["T10"], "substituir", s);
  assert.equal(situacoesPadraoFerramentas(s).find((p) => p.nome === "Torx").situacao, "alterado");
  assert.deepEqual(restaurarPadroesFerramentas(["Torx"], s), { restaurados: 1, criados: 0 });
  assert.deepEqual(lerParametros(s).tamanhosGrupoFerramenta[torx], [...TAMANHOS_FERRAMENTAS_PADRAO.find((p) => p.grupo === "Torx").tamanhos]);
  removerListaFerramenta("gruposFerramenta", torx, s);
  assert.equal(situacoesPadraoFerramentas(s).find((p) => p.nome === "Torx").situacao, "ausente");
  assert.deepEqual(restaurarPadroesFerramentas(["Torx"], s), { restaurados: 0, criados: 1 });
  assert.throws(() => restaurarPadroesFerramentas([], s), /ao menos um/);
  assert.throws(() => restaurarPadroesFerramentas(["Inventado"], s), /padrão inicial/);
});
