import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { mensagemHumana, mensagemValidadeVencida } from "../src/lib/erros-humanos.ts";
import { validarCpfCampo, validarMatriculaCampo, validarPlacaCampo, validarSerieCampo } from "../src/lib/validacao-campos.ts";
import { frasePresenca, presentes, registrarSinal, TTL_PRESENCA_MS } from "../src/lib/presenca-registro.ts";
import { jaViuTour, marcarTourVisto, passosVisiveis, TOURS } from "../src/lib/tour.ts";

const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");

// localStorage de mentira para a fila e o tour (o Node dos testes não tem).
const memoria = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) }; };

test("erros técnicos viram frases simples com o próximo passo", () => {
  assert.match(mensagemHumana(new Error("Failed to fetch")), /Sem conexão/);
  assert.match(mensagemHumana({ message: 'duplicate key value violates unique constraint "veiculos_placa_key"', code: "23505" }), /Já existe um registro/);
  assert.match(mensagemHumana({ message: "update or delete violates foreign key constraint", code: "23503" }), /Inative-o em vez de excluir/);
  assert.match(mensagemHumana({ message: "new row violates row-level security policy" }), /não tem permissão/);
  assert.match(mensagemHumana(new Error("500 Internal Server Error")), /problema ao concluir/);
  assert.doesNotMatch(mensagemHumana(new Error("NullPointerException at x")), /NullPointer/);
  assert.match(mensagemHumana(null), /Algo deu errado/);
});

test("mensagens que o sistema já escreve em português ficam como estão", () => {
  assert.equal(mensagemHumana(new Error("Informe o responsável pela entrega.")), "Informe o responsável pela entrega.");
  assert.equal(mensagemHumana(new Error("Já existe um empregado com este CPF.")), "Já existe um empregado com este CPF.");
});

test("CA vencido vira a pergunta acionável com número do CA, item e data", () => {
  const m = mensagemValidadeVencida({ nome: "Luva nitrílica", ca: "12345", ca_validade: "2026-10-10" }, "2026-11-12");
  assert.equal(m, "O Certificado de Aprovação (CA 12345) de “Luva nitrílica” venceu em 10/10/2026. Deseja selecionar outro lote válido?");
  assert.equal(mensagemValidadeVencida({ nome: "Luva", ca_validade: "2027-01-01" }, "2026-11-12"), null);
  assert.match(mensagemValidadeVencida({ nome: "Cola", data_validade: "2026-01-02" }, "2026-11-12"), /A validade de “Cola” venceu em 02\/01\/2026/);
  assert.equal(mensagemValidadeVencida({}, "2026-11-12"), null);
});

test("validação ao sair do campo: CPF, matrícula, placa e série, com as mesmas regras do Salvar", () => {
  const outros = [{ id: "1", cpf: "529.982.247-25", matricula: "L1P1" }];
  assert.match(validarCpfCampo("111.111.111-11", outros), /CPF inválido/);
  assert.match(validarCpfCampo("52998224725", outros), /Já existe um empregado com este CPF/);
  assert.equal(validarCpfCampo("52998224725", outros, outros[0]), null, "o próprio empregado em edição não conflita");
  assert.equal(validarCpfCampo("", outros), null);
  assert.match(validarMatriculaCampo("abc", outros), /formato LxPx/);
  assert.match(validarMatriculaCampo("l1p1", outros), /Já existe um empregado com esta matrícula/);
  assert.equal(validarMatriculaCampo("L2P2", outros), null);
  const veiculos = [{ id: "v1", placa: "ABC-1234" }];
  assert.match(validarPlacaCampo("XX", veiculos), /Placa inválida/);
  assert.match(validarPlacaCampo("abc1234", veiculos), /Já existe um veículo com esta placa/);
  assert.equal(validarPlacaCampo("ABC1D23", veiculos), null);
  assert.match(validarSerieCampo("sn-1", [{ id: "a", serie: "SN-1" }]), /número de série/);
  assert.equal(validarSerieCampo("SN-1", [{ id: "a", serie: "SN-1" }], "a"), null);
});

test("presença: quem some depois do tempo sai da lista, o próprio usuário nunca entra, e a frase muda com mais de um", () => {
  const mapa = new Map();
  registrarSinal(mapa, "eu", "Eu", "eu", 0);
  registrarSinal(mapa, "b", "Bruno", "eu", 1000);
  assert.deepEqual(presentes(mapa, 2000), ["Bruno"]);
  assert.equal(frasePresenca(["Bruno"]), "Bruno está com este registro aberto agora.");
  assert.match(frasePresenca(["Bruno", "Carla"]), /Outro usuário está visualizando\/editando/);
  assert.equal(frasePresenca([]), null);
  assert.deepEqual(presentes(mapa, 1000 + TTL_PRESENCA_MS + 1), []);
});

test("o tour só começa com 2 ou mais alvos na tela e lembra quem já viu, por usuário e módulo", () => {
  assert.equal(passosVisiveis(TOURS.epi, () => false).length, 0);
  assert.equal(passosVisiveis(TOURS.epi, (a) => a === "empregado").length, 0);
  assert.equal(passosVisiveis(TOURS.epi, () => true).length, 3);
  const arm = memoria();
  assert.equal(jaViuTour(arm, "u1", "epi"), false);
  marcarTourVisto(arm, "u1", "epi");
  assert.equal(jaViuTour(arm, "u1", "epi"), true);
  assert.equal(jaViuTour(arm, "u2", "epi"), false);
  assert.equal(jaViuTour(arm, "u1", "uniforme"), false);
  assert.equal(jaViuTour(null, "u1", "epi"), false);
});

test("a fila offline guarda, reenvia na ordem, para na queda de rede e mantém o que falhou", async () => {
  globalThis.localStorage = memoria();
  const { enfileirar, lerFila, sincronizarFila, ehErroDeRede } = await import("../src/lib/fila-offline.ts");
  assert.equal(enfileirar("t", "um", { n: 1 }), true);
  assert.equal(enfileirar("t", "dois", { n: 2 }), true);
  assert.equal(enfileirar("t", "tres", { n: 3 }), true);
  assert.equal(lerFila().length, 3);
  const enviados = [];
  const r1 = await sincronizarFila(async (i) => { if (i.payload.n === 2) throw new Error("Failed to fetch"); enviados.push(i.payload.n); }, ehErroDeRede);
  assert.deepEqual(enviados, [1], "para na queda de rede e mantém o resto");
  assert.equal(r1.restantes, 2);
  const r2 = await sincronizarFila(async (i) => { if (i.payload.n === 2) throw new Error("Estoque insuficiente"); enviados.push(i.payload.n); }, ehErroDeRede);
  assert.deepEqual(enviados, [1, 3], "erro de regra não trava os outros");
  assert.equal(r2.falhas, 1);
  assert.equal(lerFila().length, 1);
  assert.equal(lerFila()[0].tentativas >= 1, true);
  globalThis.localStorage = { getItem: () => { throw new Error("bloqueado"); }, setItem: () => { throw new Error("bloqueado"); } };
  assert.equal(enfileirar("t", "x", {}), false, "armazenamento bloqueado: avisa que NÃO guardou");
  assert.deepEqual(lerFila(), []);
});

test("o Desfazer fica de 5 a 8 segundos e as exclusões, desligamentos e baixas o usam", () => {
  const t = ler("lib/toast-desfazer.ts");
  const ms = Number(t.match(/DURACAO_DESFAZER_MS = (\d+)/)[1]);
  assert.ok(ms >= 5000 && ms <= 8000, `${ms} ms`);
  assert.match(t, /label: "Desfazer"/);
  assert.match(ler("lib/hooks-gemape.ts"), /avisarComDesfazer\("Registro excluído"/);
  assert.match(ler("components/modules/EmpregadosCadastroModulo.tsx"), /avisarComDesfazer\(`\$\{alvo\.nome\} desligado/);
  const baixa = ler("components/modules/UniformesTermoBaixa.tsx");
  assert.match(baixa, /avisarComDesfazer\("Baixa registrada"/);
  assert.match(baixa, /tipo_movimentacao: "Entrada"/);
});

test("a faixa de rede usa o texto pedido e fica no topo só quando há problema", () => {
  const f = ler("components/layout/RedeEFila.tsx");
  assert.match(f, /Sem conexão — suas alterações serão salvas assim que a rede voltar/);
  assert.match(f, /if \(online && pendentes === 0\) return null;/);
  assert.match(ler("routes/_authenticated/route.tsx"), /<RedeEFila \/>/);
  const entrega = ler("components/modules/EpiEntrega.tsx");
  assert.match(entrega, /navigator\.onLine === false/);
  assert.match(entrega, /enfileirar\("entrega-epi"/);
  assert.match(entrega, /mensagemValidadeVencida\(/);
});

test("o botão trava sozinho durante a ação assíncrona e os hooks vêm antes do retorno antecipado", () => {
  const b = ler("components/ui/button.tsx");
  assert.ok(b.indexOf("React.useState(false)") < b.indexOf("return null;"), "hooks antes do return null");
  assert.match(b, /travado\.current/);
  assert.match(b, /aria-busy/);
});

test("campos críticos validam ao sair e o aviso de edição simultânea está nos cadastros e na cautela", () => {
  const emp = ler("components/modules/EmpregadosCadastroModulo.tsx");
  assert.match(emp, /onBlur=\{\(ev\) => conferirAoSair\(ev\.target, validarCpfCampo/);
  assert.match(emp, /role="alert"/);
  assert.match(ler("components/modules/VeiculosCadastroModulo.tsx"), /validarPlacaCampo\(valor, todos/);
  for (const a of ["components/modules/VeiculosCadastroModulo.tsx", "components/modules/EmpregadosCadastroModulo.tsx", "components/modules/FerramentasTermoResponsabilidade.tsx"]) {
    assert.match(ler(a), /<AvisoEdicaoSimultanea chave=/, a);
  }
});

test("acessibilidade: dígitos tabulares nas tabelas, contraste do texto secundário e link para pular ao conteúdo", () => {
  const css = ler("styles.css");
  assert.match(css, /table, \.tabular-nums, \[data-numerico\] \{ font-variant-numeric: tabular-nums; \}/);
  const l = Number(css.match(/--muted-foreground: oklch\(([\d.]+) /)[1]);
  assert.ok(l <= 0.46, `luminosidade do texto secundário no claro: ${l}`);
  const rota = ler("routes/_authenticated/route.tsx");
  assert.match(rota, /href="#conteudo-principal"/);
  assert.match(rota, /id="conteudo-principal"/);
});

test("o tour de primeiro acesso: balões numerados, Pular tutorial, Esc e alvos marcados na entrega", () => {
  const t = ler("components/layout/TourGuiado.tsx");
  assert.match(t, /Pular tutorial/);
  assert.match(t, /e\.key === "Escape"/);
  assert.match(t, /role="dialog"/);
  const e = ler("components/modules/EpiEntrega.tsx");
  for (const alvo of ["empregado", "add-item", "registrar"]) assert.match(e, new RegExp(`data-tour="${alvo}"`));
  assert.match(ler("components/modules/PaginaModulo.tsx"), /<TourGuiado modulo=\{modulo\} aba=\{abaValida\} \/>/);
});

test("erro de rede: reconhece objeto de erro, e tempo esgotado não vai para a fila (poderia duplicar a gravação)", async () => {
  const { ehErroDeRede } = await import("../src/lib/fila-offline.ts");
  assert.equal(ehErroDeRede({ message: "TypeError: Failed to fetch" }), true);
  assert.equal(ehErroDeRede(new Error("Failed to fetch")), true);
  assert.equal(ehErroDeRede(new Error("Request timed out")), false);
  assert.equal(ehErroDeRede(new Error("Estoque insuficiente")), false);
});

test("números soltos na mensagem não viram erro de permissão nem de servidor", () => {
  assert.equal(mensagemHumana(new Error("Quantidade 503 excede o saldo disponível")), "Quantidade 503 excede o saldo disponível");
  assert.equal(mensagemHumana(new Error("Código 403 já usado nesta caixa")), "Código 403 já usado nesta caixa");
  assert.match(mensagemHumana(new Error("HTTP 503 Service Unavailable")), /problema ao concluir/);
  assert.match(mensagemHumana(new Error("status: 403")), /não tem permissão/);
});

test("o tour rola até o alvo só ao mudar de passo, e a validação ao sair descarta resposta atrasada", () => {
  const t = ler("components/layout/TourGuiado.tsx");
  assert.equal((t.match(/scrollIntoView/g) ?? []).length, 1);
  assert.doesNotMatch(t.slice(t.indexOf("const medir"), t.indexOf("useLayoutEffect")), /scrollIntoView/);
  assert.match(ler("components/modules/EmpregadosCadastroModulo.tsx"), /if \(campo\.value === valor\) definir/);
  assert.match(ler("lib/toast-desfazer.ts"), /if \(usado\) return;/);
});
