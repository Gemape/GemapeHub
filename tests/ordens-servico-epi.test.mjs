import test from "node:test";
import assert from "node:assert/strict";

import {
  CAMPOS_OS, MAX_TEXTO_OS, lerOrdens, ordemVazia, removerOrdem, salvarOrdem,
} from "../src/lib/ordens-servico-epi.ts";

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => void dados.set(c, v) };
};
const completa = (extra = {}) => ({
  funcao: "Mecânico / montador",
  setor: "Oficina mecânica",
  objetivo: "Orientar o colaborador sobre os riscos inerentes à sua função.",
  atividades: "Realizar manutenção preventiva e corretiva em motores.",
  riscos: "● Físicos: ruído excessivo, calor.\n● Químicos: vapores de combustíveis.",
  epis: "● Proteção auditiva: protetor auricular.\n● Proteção das mãos: luvas.",
  condutasProibidas: "● Operar máquinas sem treinamento e autorização.",
  procedimentos: "● Consultar a FISPQ dos produtos químicos antes do uso.\n● Aplicar LOTO, se aplicável.",
  treinamentos: "● Treinamento de integração de segurança.\n● NR-26 e NR-12.",
  ...extra,
});

test("os tópicos da ordem de serviço são os nove pedidos, na ordem", () => {
  assert.deepEqual(CAMPOS_OS.map((c) => c.rotulo), [
    "Função", "Setor", "Objetivo", "Descrição das atividades", "Riscos ocupacionais",
    "Equipamentos de proteção individual", "Condutas proibidas", "Procedimentos de segurança críticos", "Treinamentos e autorizações",
  ]);
  assert.deepEqual(Object.keys(ordemVazia()), CAMPOS_OS.map((c) => c.chave));
});

test("salvar guarda a ordem como digitada, com id e data, e a lista a devolve", () => {
  const s = memoria();
  const o = salvarOrdem(completa(), {}, s, new Date("2026-11-03T12:00:00Z"));
  assert.ok(o.id);
  assert.equal(o.atualizadaEm, "2026-11-03T12:00:00.000Z");
  assert.match(o.procedimentos, /FISPQ/);
  assert.match(o.procedimentos, /LOTO/, "siglas ficam como digitadas");
  assert.deepEqual(lerOrdens(s).map((x) => x.id), [o.id]);
});

test("todos os tópicos são obrigatórios e o erro diz qual falta", () => {
  for (const c of CAMPOS_OS) {
    assert.throws(() => salvarOrdem(completa({ [c.chave]: "   " }), {}, memoria()), new RegExp(c.rotulo));
  }
});

test("função e setor não se repetem, sem diferenciar maiúsculas, acentos e espaços", () => {
  const s = memoria();
  salvarOrdem(completa(), {}, s);
  assert.throws(() => salvarOrdem(completa({ funcao: "  MECANICO  /  MONTADOR ", setor: "OFICINA MECANICA" }), {}, s), /já existe/i);
  // Mesma função em outro setor é outra ordem.
  assert.ok(salvarOrdem(completa({ setor: "Oficina de pintura" }), {}, s));
  assert.equal(lerOrdens(s).length, 2);
});

test("editar troca o conteúdo da mesma ordem sem duplicar e sem acusar repetição de si mesma", () => {
  const s = memoria();
  const o = salvarOrdem(completa(), {}, s);
  const e = salvarOrdem(completa({ objetivo: "Novo objetivo." }), { id: o.id }, s, new Date("2026-11-04T12:00:00Z"));
  assert.equal(e.id, o.id);
  assert.equal(lerOrdens(s).length, 1);
  assert.equal(lerOrdens(s)[0].objetivo, "Novo objetivo.");
  assert.equal(lerOrdens(s)[0].atualizadaEm, "2026-11-04T12:00:00.000Z");
});

test("editar uma ordem para a função e o setor de outra é recusado", () => {
  const s = memoria();
  salvarOrdem(completa(), {}, s);
  const b = salvarOrdem(completa({ funcao: "Pintor", setor: "Pintura" }), {}, s);
  assert.throws(() => salvarOrdem(completa(), { id: b.id }, s), /já existe/i);
  assert.equal(lerOrdens(s).find((x) => x.id === b.id).funcao, "Pintor");
});

test("excluir tira só a ordem pedida", () => {
  const s = memoria();
  const a = salvarOrdem(completa(), {}, s);
  const b = salvarOrdem(completa({ funcao: "Pintor" }), {}, s);
  removerOrdem(a.id, s);
  assert.deepEqual(lerOrdens(s).map((x) => x.id), [b.id]);
});

test("texto maior que o limite é recusado", () => {
  assert.throws(() => salvarOrdem(completa({ riscos: "x".repeat(MAX_TEXTO_OS + 1) }), {}, memoria()), /no máximo/i);
});

test("dado ilegível não é sobrescrito por uma gravação nova", () => {
  const s = memoria();
  s.setItem("gemape-demo-ordens-servico-epi", "{quebrado");
  assert.deepEqual(lerOrdens(s), []);
  assert.throws(() => salvarOrdem(completa(), {}, s), /não puderam ser lidas/i);
  assert.equal(s.getItem("gemape-demo-ordens-servico-epi"), "{quebrado");
});

import { readFileSync } from "node:fs";
const le = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");

test("Cadastrar Ordem de Serviço fica em Parâmetros > EPI, dentro de Cadastrar EPI, ao lado da ficha", async () => {
  const { MENU_EPI } = await import("../src/lib/menu-parametros.ts");
  const filhos = MENU_EPI.find((i) => i.titulo === "Cadastrar EPI").filhos.map((f) => [f.titulo, f.url]);
  assert.deepEqual(filhos, [["Cadastrar Ficha de EPI", "/epi-ficha"], ["Cadastrar Ordem de Serviço", "/epi-ordem-servico"]]);
  assert.match(le("routeTree.gen.ts"), /epi-ordem-servico/, "a rota está no mapa de rotas gerado");
});

test("a tela cadastra, clona, edita, exclui, busca e exporta, e mostra os nove tópicos", () => {
  const t = le("routes/_authenticated/epi-ordem-servico.tsx");
  assert.match(t, /Cadastrar Ordem de Serviço/);
  assert.match(t, /Nova ordem de serviço/);
  assert.match(t, /onClonar=\{\(\) => clonar\(o\)\}/);
  assert.match(t, /copia\.funcao = "";\s*copia\.setor = "";/, "clonar deixa função e setor em branco");
  assert.match(t, /onExcluir=/);
  assert.match(t, /exportarCsv\(\s*"ordens-de-servico-epi"/);
  assert.match(t, /CAMPOS_OS\.filter\(\(c\) => c\.tipo === "linha"\)/);
  assert.match(t, /CAMPOS_OS\.filter\(\(c\) => c\.tipo !== "linha"\)/);
  assert.doesNotMatch(t, /capitalizar=/, "o texto fica como digitado (siglas FISPQ, LOTO, NR-26)");
});

test("a tela cobre as telas e a permissão do EPI, pelo prefixo /epi-", async () => {
  const { telaDaRota } = await import("../src/lib/permissoes-demo.ts");
  assert.equal(telaDaRota("/epi-ordem-servico", {}).startsWith("epi"), true);
});
