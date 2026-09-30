import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  abrirDocumento,
  assinarDocumento,
  documentoAberto,
  fecharDocumento,
  nomeArquivoDocumento,
} from "../src/lib/visualizador-documento.ts";

const html = `<html><body><h1>Termo</h1><script>window.print();</script></body></html>`;

test("abrir um termo guarda o HTML sem alterar nada e avisa a tela", () => {
  let avisos = 0;
  const cancelar = assinarDocumento(() => avisos++);
  abrirDocumento({ titulo: "Termo de Entrega de EPI", html, arquivo: "termo.html" });
  assert.deepEqual(documentoAberto(), {
    titulo: "Termo de Entrega de EPI",
    html,
    arquivo: "termo.html",
  });
  fecharDocumento();
  assert.equal(documentoAberto(), null);
  assert.equal(avisos, 2);
  cancelar();
  abrirDocumento({ titulo: "Outro", html, arquivo: "outro.html" });
  assert.equal(avisos, 2);
  fecharDocumento();
});

test("o arquivo baixado tem nome sem acentos, espaços ou símbolos", () => {
  assert.equal(
    nomeArquivoDocumento("Termo de Entrega de EPI", "Ana Conceição / Souza", "2026-09-30"),
    "termo-de-entrega-de-epi-ana-conceicao-souza-2026-09-30.html",
  );
  assert.equal(
    nomeArquivoDocumento("Termo de Vistoria", "", "2026-09-30"),
    "termo-de-vistoria-2026-09-30.html",
  );
  assert.equal(nomeArquivoDocumento("Ficha de EPI", null), "ficha-de-epi.html");
});

const termos = [
  "EpiTermoEntrega",
  "EpiFichaEpiAvulsa",
  "UniformesTermoEntrega",
  "UniformesTermoBaixa",
  "FerramentasTermoResponsabilidade",
  "FerramentasTermoEncerramento",
  "FerramentasTermoVistoria",
];

test("os 7 termos abrem na própria tela, sem depender de aba nova", () => {
  for (const nome of termos) {
    const fonte = readFileSync(
      new URL(`../src/components/modules/${nome}.tsx`, import.meta.url),
      "utf8",
    );
    assert.equal(fonte.includes("window.open("), false, `${nome} ainda abre aba nova`);
    assert.ok(fonte.includes("abrirDocumento("), `${nome} não usa o visualizador`);
  }
});
