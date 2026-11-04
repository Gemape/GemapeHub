import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { itensDaLista, montarOrdemServicoHtml, ordensDaFuncao } from "../src/lib/ordem-servico-empregado-html.ts";

const ordem = (funcao, setor, extra = {}) => ({ id: `${funcao}-${setor}`, atualizadaEm: "", funcao, setor, objetivo: "Evitar acidentes <b>", atividades: "Montar e desmontar máquinas.", riscos: "● Ruído\n- Esmagamento", epis: "• Botina\n* Luva", condutasProibidas: "Fumar na oficina", procedimentos: "Bloquear a energia (LOTO)", treinamentos: "NR-12", ...extra });
const ordens = [ordem("Mecânico / montador", "Oficina"), ordem("Pintor", "Pintura"), ordem("Mecânico/montador", "Campo")];

test("a ordem do empregado é a da função dele, sem diferenciar acento, maiúsculas nem espaços ao redor da barra", () => {
  assert.deepEqual(ordensDaFuncao(ordens, "mecanico/MONTADOR").map((o) => o.setor), ["Oficina", "Campo"]);
  assert.deepEqual(ordensDaFuncao(ordens, "Pintor").map((o) => o.setor), ["Pintura"]);
  assert.deepEqual(ordensDaFuncao(ordens, ""), []);
  assert.deepEqual(ordensDaFuncao(ordens, "Soldador"), []);
});

test("as listas viram itens, sem os marcadores digitados", () => {
  assert.deepEqual(itensDaLista("● Ruído\n- Esmagamento\n\n  • Queda\n* Calor"), ["Ruído", "Esmagamento", "Queda", "Calor"]);
});

test("o documento traz os nove tópicos, os dados do empregado, a ciência e as assinaturas, com o texto escapado", () => {
  const html = montarOrdemServicoHtml({ ordem: ordens[0], empresa: { razao_social: "Gemape <Máquinas>", cnpj: "12345678000190" }, empregado: { nome: "Ana & Cia", cpf: "111.222.333-44", matricula: "L1P2", data_admissao: "2024-03-10" } });
  for (const t of ["Objetivo", "Descrição das atividades", "Riscos ocupacionais", "Equipamentos de proteção individual", "Condutas proibidas", "Procedimentos de segurança críticos", "Treinamentos e autorizações"]) assert.match(html, new RegExp(t), t);
  assert.match(html, /Mecânico \/ montador/);
  assert.match(html, /Ana &amp; Cia/);
  assert.match(html, /Gemape &lt;Máquinas&gt;/);
  assert.match(html, /Evitar acidentes &lt;b&gt;/);
  assert.match(html, /<li>Ruído<\/li><li>Esmagamento<\/li>/);
  assert.match(html, /Declaro ter recebido esta Ordem de Serviço/);
  assert.match(html, /Responsável pela segurança/);
  assert.doesNotMatch(html, /undefined/);
});

test("EPIs > Ordem de Serviço é um submenu do módulo, depois da Ficha avulsa, e abre a tela por empregado", async () => {
  const { ABAS_EPI } = await import("../src/lib/menu-parametros.ts");
  const abas = ABAS_EPI.map((a) => a.aba);
  assert.equal(abas[abas.indexOf("ficha-avulsa") + 1], "ordem-servico");
  assert.equal(ABAS_EPI.find((a) => a.aba === "ordem-servico").titulo, "Ordem de Serviço");
  const pagina = readFileSync(new URL("../src/components/modules/PaginaModulo.tsx", import.meta.url), "utf8");
  assert.match(pagina, /<TabsContent value="ordem-servico"[^>]*>\s*<EpiOrdemServico \/>/);
  const tela = readFileSync(new URL("../src/components/modules/EpiOrdemServico.tsx", import.meta.url), "utf8");
  assert.match(tela, /ordensDaFuncao\(ordens, area\)/);
  assert.match(tela, /Parâmetros &gt; EPI &gt; Cadastrar Ordem de Serviço/);
});

test("o texto de abertura dos Parâmetros de EPI e de Uniformes quebra na largura dos quadros abaixo", () => {
  for (const arq of ["ParametrosEpi", "ParametrosUniforme"]) {
    const t = readFileSync(new URL(`../src/components/parametros/${arq}.tsx`, import.meta.url), "utf8");
    assert.match(t, /<div className="max-w-4xl">\s*<h2 id="parametros-/, arq);
  }
});
