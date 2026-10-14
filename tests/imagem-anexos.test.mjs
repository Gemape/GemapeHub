import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { juntarImagens, mensagemDeLimite } from "../src/lib/imagem-economica.ts";
import { MAX_ARQUIVOS } from "../src/lib/questionario-despesas.ts";

const img = (nome) => ({ nome, bytesAntes: 1000, bytesDepois: 100, dataUrl: "data:image/webp;base64,AA" });

test("o limite é de 3 imagens", () => {
  assert.equal(MAX_ARQUIVOS, 3);
});

test("anexar de novo soma às imagens já escolhidas, na ordem", () => {
  const { lista, erro } = juntarImagens([img("a.png")], [img("b.png"), img("c.png")], 3);
  assert.equal(erro, "");
  assert.deepEqual(lista.map((i) => i.nome), ["a.png", "b.png", "c.png"]);
});

test("passou de 3: nada muda e a mensagem diz quantas ainda cabem", () => {
  const atuais = [img("a.png"), img("b.png")];
  const r = juntarImagens(atuais, [img("c.png"), img("d.png")], 3);
  assert.deepEqual(r.lista.map((i) => i.nome), ["a.png", "b.png"]);
  assert.match(r.erro, /Cabem mais 1 imagem \(máximo 3\)/);
  assert.match(mensagemDeLimite(3, 1, 3), /remova uma/);
  assert.match(mensagemDeLimite(0, 4, 3), /Cabem mais 3 imagens/);
  assert.equal(mensagemDeLimite(2, 1, 3), "");
});

test("o campo de anexo soma, bloqueia no limite, deixa remover cada imagem e reduz todas no navegador", () => {
  const form = readFileSync(new URL("../src/components/parametros/QuestionarioFormulario.tsx", import.meta.url), "utf8");
  assert.match(form, /disabled=\{cheio \|\| lendo\}/);
  assert.match(form, /juntarImagens\(imagens, reduzidas, MAX_ARQUIVOS\)/);
  assert.match(form, /aria-label=\{`Remover \$\{i\.nome\}`\}/);
  assert.match(form, /Promise\.all\(escolhidos\.map\(reduzirImagem\)\)/);
});
