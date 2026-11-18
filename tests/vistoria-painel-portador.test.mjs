import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rotuloDaCaixaComPortador } from "../src/lib/portadores-caixa.ts";
import { descricaoDoDesaparecimento } from "../src/lib/vistoria-ferramentas-ocorrencia.ts";

const le = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const registro = (o) => ({ id: "r", caixa_id: "c1", caixa_codigo: "CX-0001", empresa_id: "e", empregado_id: "p", empregado_nome: "Ana Souza", status: "Ativa", observacao: "", data_inicio: "2026-01-01", data_fim: null, ...o });

test("a caixa aparece com o portador ativo na frente do código", () => {
  assert.equal(rotuloDaCaixaComPortador([registro({})], { id: "c1", codigo: "CX-0001" }), "CX-0001 — Ana Souza");
  assert.equal(rotuloDaCaixaComPortador([registro({ status: "Inativa", data_fim: "2026-02-01" })], { id: "c1", codigo: "CX-0001" }), "CX-0001");
  assert.equal(rotuloDaCaixaComPortador([], { id: "c1", codigo: "CX-0001" }), "CX-0001");
  // histórico com dois portadores ativos na mesma caixa: não derruba a tela, mostra só o código
  assert.equal(rotuloDaCaixaComPortador([registro({}), registro({ id: "r2" })], { id: "c1", codigo: "CX-0001" }), "CX-0001");
});

test("o texto do desaparecimento cita a ferramenta, a caixa, a data e a tratativa", () => {
  const t = descricaoDoDesaparecimento({ ferramenta: "FER-0002 — Alicate", quantidade: 1, caixa: "CX-0001", data: "2026-11-18", observacao: " Sumiu na obra " });
  assert.match(t, /1 × FER-0002 — Alicate ausente\(s\) na caixa CX-0001 em 18\/11\/2026\./);
  assert.match(t, /Observação da vistoria: Sumiu na obra Tratativa: localizar a ferramenta ou repô-la/);
  assert.doesNotMatch(descricaoDoDesaparecimento({ ferramenta: "X", quantidade: 2, caixa: "C", data: "2026-01-02" }), /Observação da vistoria/);
});

test("as telas usam o portador no campo Caixa, geram o termo de entrega na troca de portador e abrem a ocorrência da ferramenta ausente", () => {
  for (const f of ["FerramentasEntregaCaixa", "FerramentasReposicaoCaixa", "FerramentasBaixaCaixa"]) assert.match(le(`src/components/modules/${f}.tsx`), /rotuloDaCaixaComPortador\(portadores, c\)/, f);
  const p = le("src/components/modules/PortadoresCaixaModulo.tsx");
  assert.match(p, /registrarPortador\([\s\S]*gerarTermoDeEntrega\(caixa, empregado\)/);
  assert.match(p, /lerTextosTermos\(\)\.entrega/);
  const v = le("src/components/modules/FerramentasTermoVistoria.tsx");
  assert.match(v, /<FerramentasPainelVistorias onFazerVistoria=\{iniciarVistoria\} \/>/);
  assert.match(v, /value="Ausente"/);
  assert.match(v, /it\.conformidade === "Ausente"[\s\S]*salvarOcorrencia\.mutateAsync/);
  const painel = le("src/components/modules/FerramentasPainelVistorias.tsx");
  for (const x of ["Realizadas", "Pendentes", "Não realizadas no prazo", 'faixa="verde"', 'faixa="amarelo"', 'faixa="vermelho"', "Fazer vistoria"]) assert.ok(painel.includes(x), x);
});
