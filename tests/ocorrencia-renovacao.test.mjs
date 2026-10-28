import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { ocorrenciaVencida } from "../src/lib/frota-ocorrencias.ts";
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

test("quem já é supervisor renova sem senha; os outros precisam do supervisor e da senha dele", () => {
  const supervisores = [USUARIOS[0], USUARIOS[1]];
  // supervisor: não pede nada
  assert.equal(autorizarRenovacao({ usuario: USUARIOS[1], supervisorId: "", senha: "" }, supervisores).id, "u2");
  // não supervisor: exige supervisor, senha e senha certa
  assert.throws(() => autorizarRenovacao({ usuario: USUARIOS[2], supervisorId: "", senha: SENHA_DEMONSTRACAO }, supervisores), /Escolha o supervisor/);
  assert.throws(() => autorizarRenovacao({ usuario: USUARIOS[2], supervisorId: "u1", senha: "" }, supervisores), /Digite a senha/);
  assert.throws(() => autorizarRenovacao({ usuario: USUARIOS[2], supervisorId: "u1", senha: "errada" }, supervisores), /Senha incorreta/);
  assert.throws(() => autorizarRenovacao({ usuario: USUARIOS[2], supervisorId: "u3", senha: SENHA_DEMONSTRACAO }, supervisores), /Escolha o supervisor/, "só vale quem está na lista");
  assert.equal(autorizarRenovacao({ usuario: USUARIOS[2], supervisorId: "u1", senha: SENHA_DEMONSTRACAO }, supervisores).id, "u1");
  // a verificação de senha é trocável (Fase 2: login do Supabase)
  assert.equal(autorizarRenovacao({ usuario: USUARIOS[2], supervisorId: "u2", senha: "outra" }, supervisores, (id, senha) => id === "u2" && senha === "outra").id, "u2");
});

test("renovar o prazo recomeça a contagem e registra quem autorizou; encerrada não renova", () => {
  const s = memoria();
  const tipos = [{ id: "t1", nome: "Colisão" }];
  const criada = registrarOcorrenciaVeiculo(
    { veiculoId: "v1", tipoId: "t1", condutorId: "e1", danoEmpresa: false, danoTerceiros: false, fotos: [], data: "2026-10-01", hora: "08:00", local: "BR-116", descricao: "Batida leve" },
    s, new Date("2026-10-02T15:00:00-03:00"), tipos,
  );
  const prazos = { iniciar: 2, finalizar: 5 };
  assert.equal(ocorrenciaVencida(criada, "2026-10-10", prazos), true);
  const renovada = renovarPrazoTratativa(criada.id, { autorizadoPorId: "u1", autorizadoPorNome: "Administrador Demo", registradoPorNome: "Paulo Mendes (Padrão)" }, s, new Date("2026-10-10T12:00:00-03:00"));
  assert.equal(renovada.renovacoes.length, 1);
  assert.deepEqual([renovada.renovacoes[0].passo, renovada.renovacoes[0].autorizadoPorNome], ["iniciar", "Administrador Demo"]);
  assert.equal(ocorrenciaVencida(renovada, "2026-10-10", prazos), false, "a contagem recomeça no dia da renovação");
  assert.equal(ocorrenciaVencida(renovada, "2026-10-12", prazos), false);
  assert.equal(ocorrenciaVencida(renovada, "2026-10-13", prazos), true);
  // Em tratativa: renova o passo de finalizar.
  const emTratativa = salvarTratativa(criada.id, { responsavelId: "e1", descricaoEmpresa: "", descricaoTerceiros: "", custoEmpresa: "0", pagamentoTerceiros: "", seguradora: "nao" }, { encerrar: false, isAdmin: true }, s, new Date("2026-10-11T10:00:00-03:00"));
  const segunda = renovarPrazoTratativa(emTratativa.id, { autorizadoPorId: "u1", autorizadoPorNome: "Administrador Demo", registradoPorNome: "Administrador Demo" }, s, new Date("2026-10-14T10:00:00-03:00"));
  assert.equal(segunda.renovacoes.at(-1).passo, "finalizar");
  assert.equal(ocorrenciaVencida(segunda, "2026-10-19", prazos), false);
  assert.equal(ocorrenciaVencida(segunda, "2026-10-20", prazos), true);
  // Encerrada: sem prazo, sem renovação.
  salvarTratativa(criada.id, { responsavelId: "e1", descricaoEmpresa: "", descricaoTerceiros: "", custoEmpresa: "0", pagamentoTerceiros: "", seguradora: "nao" }, { encerrar: true, isAdmin: true }, s);
  assert.throws(() => renovarPrazoTratativa(criada.id, { autorizadoPorId: "u1", autorizadoPorNome: "A", registradoPorNome: "A" }, s), /encerrada/);
});

test("o relatório da ocorrência traz dados, tratativa e renovações e escapa os textos", () => {
  const html = montarOcorrenciaHtml({
    codigo: "OCO-0001", empresa: "Gemape", veiculo: "ABC1D23 <b>x</b>", tipo: "Colisão", status: "Encerrada", cadastradaEm: "02/10/2026 15:00", ocorridoEm: "01/10/2026 08:00",
    local: "BR-116", condutor: "Ana", danos: "Veículo da empresa", descricao: "<script>alert(1)</script>", fotos: 2,
    tratativa: { registradaEm: "03/10/2026 09:00", atualizadaEm: "04/10/2026 10:00", encerradaEm: "04/10/2026 10:00", responsavel: "Bruno", custoEmpresa: "R$ 1.500,00", descricaoEmpresa: "Funilaria", descricaoTerceiros: "", pagamentoTerceiros: "", seguradora: "Não" },
    renovacoes: [{ em: "10/10/2026 12:00", passo: "Iniciar a tratativa", autorizadoPor: "Administrador Demo", registradoPor: "Paulo" }],
  }, new Date("2026-10-05T12:00:00Z"));
  for (const t of ["Relatório da ocorrência", "OCO-0001", "Dados da ocorrência", "Tratativa", "Renovações de prazo", "R$ 1.500,00", "Administrador Demo", "Encerrada"]) assert.ok(html.includes(t), t);
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
  assert.match(dialogo, /jaSupervisor \? \(/);
  assert.match(dialogo, /type="password"/);
  assert.match(dialogo, /supervisores\.map\(\(s\) => <SelectItem/);
  assert.match(ler("routes/_authenticated/cadastros/gerais/categorias.tsx"), /categoria\.id === "cat-veiculos" && <SupervisoresOcorrencias \/>/);
});
