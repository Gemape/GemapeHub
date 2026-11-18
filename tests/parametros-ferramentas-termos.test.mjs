import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  TEXTOS_PADRAO, TERMOS_FERRAMENTA, lerTextosTermos, montarTextoDoTermo, salvarTextosTermos, textoDoTermoValido,
} from "../src/lib/termos-ferramentas-texto.ts";
import {
  PERIODICIDADES_VISTORIA, lerParametrosVistoria, salvarParametrosVistoria, PARAMETROS_VISTORIA_PADRAO,
} from "../src/lib/vistoria-ferramentas-parametros.ts";
import { CHAVE_SUPERVISORES_FERRAMENTAS, lerSupervisoresSalvos, salvarSupervisores, supervisoresEfetivos } from "../src/lib/supervisores-ocorrencias.ts";
import { montarTermoResponsabilidadeHtml } from "../src/lib/termo-responsabilidade-html.ts";
import { montarTermoVistoriaHtml } from "../src/lib/termo-vistoria-html.ts";

const le = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const memoria = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) }; };
const emp = { razao_social: "ACME Ltda", cnpj: "12345678000195" };

test("há quatro termos e cada um começa com o texto que já saía", () => {
  assert.deepEqual([...TERMOS_FERRAMENTA], ["entrega", "reposicao", "encerramento", "vistoria"]);
  assert.deepEqual(lerTextosTermos(memoria()), TEXTOS_PADRAO);
  for (const t of TERMOS_FERRAMENTA) assert.ok(TEXTOS_PADRAO[t].includes("{tabela}"), t);
});

test("os textos salvos valem; texto vazio ou longo demais volta ao padrão e não salva", () => {
  const m = memoria();
  salvarTextosTermos({ ...TEXTOS_PADRAO, entrega: "Recebi a caixa {caixa}.\n\n{tabela}" }, m);
  const lidos = lerTextosTermos(m);
  assert.equal(lidos.entrega, "Recebi a caixa {caixa}.\n\n{tabela}");
  assert.equal(lidos.vistoria, TEXTOS_PADRAO.vistoria);
  assert.throws(() => salvarTextosTermos({ ...TEXTOS_PADRAO, reposicao: "   " }, m), /Termo de reposição/);
  assert.equal(textoDoTermoValido("x".repeat(4001)), false);
  m.setItem("gemape-demo-ferramentas-termos-textos", JSON.stringify({ encerramento: "" }));
  assert.equal(lerTextosTermos(m).encerramento, TEXTOS_PADRAO.encerramento);
});

test("as marcas viram dados em negrito, o texto digitado nunca vira HTML e {tabela} reparte o texto", () => {
  const r = montarTextoDoTermo("Eu {empregado}, CPF {cpf}, <script>x</script> **ciente**.\n\nSegundo.\n\n{tabela}\n\nFim em {data}.", { empregado: "Ana <b>", cpf: "1", data: "30 de setembro" });
  assert.match(r.antes, /<p>Eu <strong>Ana &lt;b&gt;<\/strong>, CPF <strong>1<\/strong>, &lt;script&gt;x&lt;\/script&gt; <strong>ciente<\/strong>\.<\/p>/);
  assert.match(r.antes, /<p>Segundo\.<\/p>/);
  assert.match(r.depois, /<p>Fim em <strong>30 de setembro<\/strong>\.<\/p>/);
  assert.doesNotMatch(r.antes + r.depois, /<script|<b>/);
  assert.equal(montarTextoDoTermo("Só texto.", {}).depois, "");
});

test("o termo de entrega e o de vistoria usam o texto cadastrado, e o padrão reproduz o que já saía", () => {
  const dados = { empresa: emp, empregado: { nome: "Ana", cpf: "111" }, caixaCodigo: "CX-0001", data: "2026-09-30", linhas: [] };
  const padrao = montarTermoResponsabilidadeHtml(dados);
  assert.match(padrao, /Eu, <strong>Ana<\/strong>, CPF <strong>111<\/strong>, declaro que recebi da empresa <strong>ACME Ltda<\/strong>, inscrita sob o CNPJ nº <strong>12\.345\.678\/0001-95<\/strong>/);
  assert.match(padrao, /<strong>CAIXA Nº <strong>CX-0001<\/strong><\/strong>/);
  assert.match(padrao, /Comprometo-me a:<br>• Utilizar as ferramentas com cuidado[\s\S]*Segue abaixo a listagem[\s\S]*<table>[\s\S]*Por estar de acordo, assino ao final/);
  assert.match(montarTermoResponsabilidadeHtml({ ...dados, texto: "Texto novo da caixa {caixa}.\n\n{tabela}\n\nFechamento." }), /Texto novo da caixa <strong>CX-0001<\/strong>\.[\s\S]*<table>[\s\S]*Fechamento\./);
  const vist = { empresa: emp, caixa: { codigo: "CX-0001" }, responsavel: "Ana", data: "2026-09-30", linhas: [] };
  assert.match(montarTermoVistoriaHtml(vist), /ausentes deverão ser localizadas pelo portador em até 15 dias[\s\S]*<table>[\s\S]*Por ter acompanhado a vistoria/);
  assert.match(TEXTOS_PADRAO.reposicao, /a reposição de ferramentas[\s\S]*nova composição/);
  assert.match(TEXTOS_PADRAO.encerramento, /devolvo à empresa[\s\S]*acerto de desligamento/);
  assert.match(montarTermoVistoriaHtml({ ...vist, texto: "Vistoria de {caixa}.\n\n{tabela}" }), /Vistoria de <strong>CX-0001<\/strong>/);
});

test("periodicidade e prazo da vistoria: seis periodicidades, prazo inteiro de 0 a 365, valor ruim volta ao padrão", () => {
  assert.deepEqual([...PERIODICIDADES_VISTORIA], ["Quinzenal", "Mensal", "Bimestral", "Trimestral", "Semestral", "Anual"]);
  const m = memoria();
  assert.deepEqual(lerParametrosVistoria(m), PARAMETROS_VISTORIA_PADRAO);
  salvarParametrosVistoria({ periodicidade: "Trimestral", prazoDias: 10 }, m);
  assert.deepEqual(lerParametrosVistoria(m), { periodicidade: "Trimestral", prazoDias: 10 });
  assert.throws(() => salvarParametrosVistoria({ periodicidade: "Diária", prazoDias: 1 }, m), /periodicidade/);
  assert.throws(() => salvarParametrosVistoria({ periodicidade: "Mensal", prazoDias: 366 }, m), /entre 0 e 365/);
  assert.throws(() => salvarParametrosVistoria({ periodicidade: "Mensal", prazoDias: 1.5 }, m), /entre 0 e 365/);
  m.setItem("gemape-demo-ferramentas-vistoria-parametros", JSON.stringify({ periodicidade: "x", prazoDias: "1e1" }));
  assert.deepEqual(lerParametrosVistoria(m), PARAMETROS_VISTORIA_PADRAO);
});

test("os supervisores das ferramentas têm lista própria, separada da dos veículos", () => {
  const m = memoria();
  const usuarios = [{ id: "a", nome: "A", perfil: "admin" }, { id: "b", nome: "B", perfil: "operador" }];
  assert.deepEqual(supervisoresEfetivos(usuarios, m, CHAVE_SUPERVISORES_FERRAMENTAS).map((u) => u.id), ["a"]);
  salvarSupervisores(["b"], m, CHAVE_SUPERVISORES_FERRAMENTAS);
  assert.deepEqual(supervisoresEfetivos(usuarios, m, CHAVE_SUPERVISORES_FERRAMENTAS).map((u) => u.id), ["b"]);
  assert.equal(lerSupervisoresSalvos(m), null, "a lista dos veículos não mudou");
  assert.deepEqual(supervisoresEfetivos(usuarios, m).map((u) => u.id), ["a"]);
});

test("a tela de Parâmetros Específicos de Ferramentas mostra os textos, a vistoria e os supervisores", () => {
  assert.match(le("src/routes/_authenticated/cadastros/gerais/categorias.tsx"), /categoria\.id === "cat-ferramentas" && <ParametrosFerramentas \/>/);
  const t = le("src/components/parametros/ParametrosFerramentas.tsx");
  for (const x of ["Textos dos termos", "Periodicidade", "Prazo para realizar a vistoria", "Salvar textos", "Salvar vistoria", '<SupervisoresOcorrencias ambito="ferramentas" />']) assert.ok(t.includes(x), x);
  assert.match(le("src/components/modules/FerramentasTermoEncerramento.tsx"), /montarTextoDoTermo\(lerTextosTermos\(\)\.encerramento/);
  assert.match(le("src/components/modules/FerramentasTermoResponsabilidade.tsx"), /texto: lerTextosTermos\(\)\.entrega/);
  assert.match(le("src/components/modules/FerramentasTermoVistoria.tsx"), /texto: lerTextosTermos\(\)\.vistoria/);
});
