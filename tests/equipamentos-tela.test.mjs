import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import { MENU_EQUIPAMENTOS } from "../src/lib/menu-parametros.ts";

const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
const menu = ler("components/layout/AppSidebar.tsx");

test("Parâmetros > Equipamentos > Cadastrar equipamento está no menu de Parâmetros", () => {
  assert.deepEqual(MENU_EQUIPAMENTOS.map((i) => [i.titulo, i.url]), [["Cadastrar equipamento", "/cadastros/equipamentos"], ["Parâmetros Específicos", "/cadastros/equipamentos-especificos"], ["Check list de manutenção", "/cadastros/equipamentos-checklist"], ["Check list de vistoria", "/cadastros/equipamentos-checklist"], ["Manutenção", "/cadastros/equipamentos-manutencao"], ["Tipos de ocorrência", "/cadastros/equipamentos-tipos-ocorrencia"]]);
  assert.match(menu, /function MenuEquipamentos/);
  assert.match(menu, /<MenuEquipamentos pathname=\{pathname\} \/>/);
});

test("Módulos > Equipamentos está no menu de Módulos", () => {
  assert.match(menu, /\{ titulo: "Equipamentos", url: "\/equipamentos", icone: Forklift, abas: ABAS_EQUIPAMENTO \}/);
});

test("as duas telas existem: o cadastro (Parâmetros) e o módulo, com as seis abas", () => {
  assert.ok(existsSync(new URL("../src/routes/_authenticated/cadastros/equipamentos.tsx", import.meta.url)));
  assert.ok(existsSync(new URL("../src/routes/_authenticated/equipamentos.tsx", import.meta.url)));
  const modulo = ler("routes/_authenticated/equipamentos.tsx");
  for (const aba of ["inventario", "indicadores", "abastecimento", "manutencao", "ocorrencias", "checklist-manutencao", "checklist-vistoria"]) assert.match(modulo, new RegExp(`TabsContent value="${aba}"`));
});

const dialogo = ler("components/parametros/EquipamentoDialog.tsx");

test("a janela mostra os campos técnicos só dos grupos do tipo escolhido (camposTecnicosDosGrupos)", () => {
  assert.match(dialogo, /camposTecnicosDosGrupos\(/);
  assert.match(dialogo, /htmlFor="subcategoria"/);
  assert.match(dialogo, /htmlFor="tipo"/);
  assert.doesNotMatch(dialogo, /CATEGORIAS_EQUIPAMENTO/);
  // os grupos são títulos de seção que só existem se houver campo
  assert.match(dialogo, /TITULO_GRUPO_TECNICO/);
});

test("os dados gerais pedem todos os campos combinados", () => {
  for (const rotulo of ["Código de patrimônio", "Nome / descrição do equipamento", "Subcategoria", "Tipo", "Marca / fabricante", "Modelo", "Número de série", "Data de aquisição", "Valor de compra", "Status atual", "Setor / localização", "Empresa"]) {
    assert.ok(dialogo.includes(rotulo), rotulo);
  }
});

test("capitalização: texto livre capitaliza; patrimônio, série e datas não", () => {
  for (const id of ["nome", "marca", "modelo", "setor"]) {
    assert.match(dialogo, new RegExp(`id="${id}"[^>]*capitalizar="texto"|capitalizar="texto"[^>]*id="${id}"`), id);
  }
  for (const id of ["patrimonio", "numeroSerie", "dataAquisicao"]) {
    const tag = dialogo.match(new RegExp(`<Input[^>]*id="${id}"[^>]*>`))?.[0] ?? "";
    assert.ok(tag, id);
    assert.doesNotMatch(tag, /capitalizar=/, id);
  }
});

test("segurança: nada de HTML solto nas telas do equipamento", () => {
  for (const f of ["components/parametros/EquipamentoDialog.tsx", "routes/_authenticated/cadastros/equipamentos.tsx", "routes/_authenticated/equipamentos.tsx"]) {
    assert.doesNotMatch(ler(f), /dangerouslySetInnerHTML|innerHTML/, f);
  }
});

test("a lista usa Clonar, Editar e Excluir (decisão 45) e trava o segundo clique ao salvar", () => {
  const pagina = ler("routes/_authenticated/cadastros/equipamentos.tsx");
  assert.match(pagina, /AcoesLinha/);
  assert.match(pagina, /onClonar/);
  assert.match(dialogo, /trava\.current/);
});
