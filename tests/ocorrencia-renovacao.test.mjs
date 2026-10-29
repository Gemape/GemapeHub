import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { ocorrenciaProxima, ocorrenciaVencida } from "../src/lib/frota-ocorrencias.ts";
import { dataLimiteSugerida } from "../src/lib/prazo-ocorrencias.ts";
import { montarOcorrenciaHtml } from "../src/lib/ocorrencia-relatorio-html.ts";
import { registrarOcorrenciaVeiculo, renovarPrazoTratativa, salvarTratativa } from "../src/lib/ocorrencias-veiculo.ts";
import { SENHA_DEMONSTRACAO, autorizarRenovacao, lerSupervisoresSalvos, salvarSupervisores, supervisoresEfetivos } from "../src/lib/supervisores-ocorrencias.ts";

const ler = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");
const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};

const USUARIOS = [
  { id: "u1", nome: "Administrador Demo", perfil: "admin" },
  { id: "u2", nome: "Helena Rocha (RH)", perfil: "rh" },
  { id: "u3", nome: "Paulo Mendes (Padrão)", perfil: "padrao" },
];

test("os supervisores são os escolhidos; sem escolha salva, os administradores", () => {
  const s = memoria();
  assert.equal(lerSupervisoresSalvos(s), null);
  assert.deepEqual(supervisoresEfetivos(USUARIOS, s).map((u) => u.id), ["u1"]);
  salvarSupervisores(["u2", "u2", "u3"], s);
  assert.deepEqual(lerSupervisoresSalvos(s), ["u2", "u3"]);
  assert.deepEqual(supervisoresEfetivos(USUARIOS, s).map((u) => u.id), ["u2", "u3"]);
  salvarSupervisores([], s);
  assert.deepEqual(supervisoresEfetivos(USUARIOS, s), [], "lista salva vazia = ninguém é supervisor");
});

test("toda renovação exige o supervisor escolhido e a senha de login dele, mesmo de quem já é supervisor (decisão 315)", () => {
  const supervisores = [USUARIOS[0], USUARIOS[1]];
  assert.throws(() => autorizarRenovacao({ supervisorId: "", senha: SENHA_DEMONSTRACAO }, supervisores), /Escolha o supervisor/);
  assert.throws(() => autorizarRenovacao({ supervisorId: "u1", senha: "" }, supervisores), /Digite a senha/, "o supervisor também digita a senha");
  assert.throws(() => autorizarRenovacao({ supervisorId: "u1", senha: "errada" }, supervisores), /Senha incorreta/);
  assert.throws(() => autorizarRenovacao({ supervisorId: "u3", senha: SENHA_DEMONSTRACAO }, supervisores), /Escolha o supervisor/, "só vale quem está na lista");
  assert.equal(autorizarRenovacao({ supervisorId: "u1", senha: SENHA_DEMONSTRACAO }, supervisores).id, "u1");
  // a verificação de senha é trocável (Fase 2: login do Supabase)
  assert.equal(autorizarRenovacao({ supervisorId: "u2", senha: "outra" }, supervisores, (id, senha) => id === "u2" && senha === "outra").id, "u2");
});

test("renovar o prazo exige a nova data, que passa a ser o limite da tratativa; encerrada não renova (decisão 316)", () => {
  const s = memoria();
  const tipos = [{ id: "t1", nome: "Colisão" }];
  const criada = registrarOcorrenciaVeiculo(
    { veiculoId: "v1", tipoId: "t1", condutorId: "e1", danoEmpresa: false, danoTerceiros: false, fotos: [], data: "2026-10-01", hora: "08:00", local: "BR-116", descricao: "Batida leve" },
    s, new Date("2026-10-02T15:00:00-03:00"), tipos,
  );
  const prazos = { iniciar: 2, finalizar: 5 };
  const quem = { autorizadoPorId: "u1", autorizadoPorNome: "Administrador Demo", registradoPorNome: "Paulo Mendes (Padrão)" };
  assert.equal(ocorrenciaVencida(criada, "2026-10-10", prazos), true);
  // A nova data é obrigatória, tem de ser uma data de verdade e não pode ser anterior ao dia da renovação.
  const agora = new Date("2026-10-10T12:00:00-03:00");
  assert.throws(() => renovarPrazoTratativa(criada.id, { ...quem, ate: "" }, s, agora), /Informe a data/);
  assert.throws(() => renovarPrazoTratativa(criada.id, { ...quem, ate: "2026-02-30" }, s, agora), /Informe a data/);
  assert.throws(() => renovarPrazoTratativa(criada.id, { ...quem, ate: "2026-10-09" }, s, agora), /anterior a hoje/);
  const renovada = renovarPrazoTratativa(criada.id, { ...quem, ate: "2026-10-15" }, s, agora);
  assert.equal(renovada.renovacoes.length, 1);
  assert.deepEqual([renovada.renovacoes[0].passo, renovada.renovacoes[0].ate, renovada.renovacoes[0].autorizadoPorNome], ["iniciar", "2026-10-15", "Administrador Demo"]);
  // Vale a data escolhida: até ela não vence; passada, vence. Faltando até dois dias, é vencimento próximo.
  assert.equal(ocorrenciaVencida(renovada, "2026-10-10", prazos), false);
  assert.equal(ocorrenciaVencida(renovada, "2026-10-15", prazos), false, "no próprio dia limite ainda vale");
  assert.equal(ocorrenciaVencida(renovada, "2026-10-16", prazos), true);
  assert.equal(ocorrenciaProxima(renovada, "2026-10-13", prazos), true);
  assert.equal(ocorrenciaProxima(renovada, "2026-10-11", prazos), false);
  // Renovação antiga, sem data, só recomeça a contagem no dia dela.
  const antiga = { ...criada, renovacoes: [{ em: "2026-10-10T12:00:00-03:00" }] };
  assert.equal(ocorrenciaVencida(antiga, "2026-10-12", prazos), false);
  assert.equal(ocorrenciaVencida(antiga, "2026-10-13", prazos), true);
  // Em tratativa: renova o passo de finalizar, e a renovação do passo anterior deixa de valer.
  const emTratativa = salvarTratativa(criada.id, { responsavelId: "e1", descricaoEmpresa: "", descricaoTerceiros: "", custoEmpresa: "0", pagamentoTerceiros: "", seguradora: "nao" }, { encerrar: false, isAdmin: true }, s, new Date("2026-10-18T10:00:00-03:00"));
  assert.equal(ocorrenciaVencida(emTratativa, "2026-10-20", prazos), false, "a data do passo anterior (15/10) não vale mais: o prazo é o de finalizar a partir de 18/10");
  // Renovação do passo anterior feita horas antes da tratativa começar, no mesmo dia, também não vale.
  const mesmoDia = { ...emTratativa, renovacoes: [{ em: "2026-10-18T08:00:00-03:00", ate: "2026-11-30" }] };
  assert.equal(ocorrenciaVencida(mesmoDia, "2026-10-24", prazos), true);
  const segunda = renovarPrazoTratativa(emTratativa.id, { ...quem, ate: "2026-10-30" }, s, new Date("2026-10-19T10:00:00-03:00"));
  assert.equal(segunda.renovacoes.at(-1).passo, "finalizar");
  assert.equal(ocorrenciaVencida(segunda, "2026-10-30", prazos), false);
  assert.equal(ocorrenciaVencida(segunda, "2026-10-31", prazos), true);
  // Encerrada: sem prazo, sem renovação.
  salvarTratativa(criada.id, { responsavelId: "e1", descricaoEmpresa: "", descricaoTerceiros: "", custoEmpresa: "0", pagamentoTerceiros: "", seguradora: "nao" }, { encerrar: true, isAdmin: true }, s);
  assert.throws(() => renovarPrazoTratativa(criada.id, { ...quem, ate: "2026-12-01" }, s), /encerrada/);
});

test("a sugestão da data é hoje mais os dias do prazo, e o formulário tem o campo da nova data", () => {
  assert.equal(dataLimiteSugerida("2026-10-29", 2), "2026-10-31");
  assert.equal(dataLimiteSugerida("2026-12-30", 5), "2027-01-04");
  assert.equal(dataLimiteSugerida("2026-10-29", 0), "2026-10-29");
  const form = ler("components/modules/RenovarPrazoOcorrencia.tsx");
  assert.match(form, /<Input id="renovar_data" type="date" min=\{hoje\} value=\{ate\}/);
  assert.match(form, /renovarPrazoTratativa\(ocorrencia\.id, \{[^}]*ate \}\)/);
});

test("o relatório da ocorrência traz dados, tratativa e renovações e escapa os textos", () => {
  const html = montarOcorrenciaHtml({
    codigo: "OCO-0001", empresa: "Gemape", veiculo: "ABC1D23 <b>x</b>", tipo: "Colisão", status: "Encerrada", cadastradaEm: "02/10/2026 15:00", ocorridoEm: "01/10/2026 08:00",
    local: "BR-116", condutor: "Ana", danos: "Veículo da empresa", descricao: "<script>alert(1)</script>", fotos: 2,
    tratativa: { registradaEm: "03/10/2026 09:00", atualizadaEm: "04/10/2026 10:00", encerradaEm: "04/10/2026 10:00", responsavel: "Bruno", custoEmpresa: "R$ 1.500,00", descricaoEmpresa: "Funilaria", descricaoTerceiros: "", pagamentoTerceiros: "", seguradora: "Não" },
    renovacoes: [{ em: "10/10/2026 12:00", passo: "Iniciar a tratativa", ate: "15/10/2026", autorizadoPor: "Administrador Demo", registradoPor: "Paulo" }],
  }, new Date("2026-10-05T12:00:00Z"));
  for (const t of ["Relatório da ocorrência", "OCO-0001", "Dados da ocorrência", "Tratativa", "Renovações de prazo", "Nova data", "15/10/2026", "R$ 1.500,00", "Administrador Demo", "Encerrada"]) assert.ok(html.includes(t), t);
  assert.equal(html.includes("<script>"), false);
  assert.equal(html.includes("<b>x</b>"), false);
  const semTratativa = montarOcorrenciaHtml({ codigo: "OCO-2", empresa: "", veiculo: "V", tipo: "T", status: "Aberta", cadastradaEm: "", ocorridoEm: "", local: "", condutor: "", danos: "", descricao: "", fotos: 0, tratativa: null, renovacoes: [] });
  assert.ok(semTratativa.includes("Ainda sem tratativa registrada.") && semTratativa.includes("O prazo da tratativa não foi renovado."));
});

test("a tela da ocorrência tem Renovar prazo, o convite do PDF ao encerrar e o relatório da encerrada; os supervisores se escolhem em Parâmetros", () => {
  const tela = ler("components/modules/OcorrenciasVeiculoModulo.tsx");
  assert.match(tela, /onClick=\{\(\) => setRenovando\(atual\.id\)\}>Renovar prazo<\/Button>/);
  assert.match(tela, /if \(encerrar\) setRelatorioPara\(atual\.id\)/);
  assert.match(tela, /atual\.status === "Encerrada" && <Button variant="outline" onClick=\{\(\) => gerarRelatorio\(atual\)\}>Relatório \(PDF\)<\/Button>/);
  const dialogo = ler("components/modules/RenovarPrazoOcorrencia.tsx");
  assert.doesNotMatch(dialogo, /jaSupervisor|sem digitar a senha/);
  assert.match(dialogo, /const supervisorId = escolhido \?\? proprio;/);
  assert.match(dialogo, /type="password"/);
  assert.match(dialogo, /supervisores\.map\(\(s\) => <SelectItem/);
  assert.match(ler("routes/_authenticated/cadastros/gerais/categorias.tsx"), /categoria\.id === "cat-veiculos" && <SupervisoresOcorrencias \/>/);
});
