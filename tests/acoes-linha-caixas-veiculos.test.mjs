import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ler = (nome) => readFileSync(`src/components/modules/${nome}.tsx`, "utf8");

test("Caixas > Cadastro usa AcoesLinha com Clonar, Editar e Excluir; clone limpa o número e não herda portador", () => {
  const fonte = ler("CaixasFerramentasModulo");
  assert.match(fonte, /<AcoesLinha[\s\S]*?onClonar=[\s\S]*?onEditar=[\s\S]*?onExcluir=/);
  assert.match(fonte, /const base = editando \?\? modelo/);
  assert.match(fonte, /function abrirClone[\s\S]*?setEditando\(null\);[\s\S]*?setModelo\(c\);[\s\S]*?setNumero\(null\)/);
  assert.match(fonte, /nomePortador\(editando\.id\)/);
});

test("Parâmetros > Veículos usa AcoesLinha com Clonar, Editar e Excluir; clone gera código e deixa placa e RENAVAM em branco", () => {
  const fonte = ler("VeiculosCadastroModulo");
  assert.match(fonte, /<AcoesLinha[\s\S]*?onClonar=[\s\S]*?onEditar=[\s\S]*?onExcluir=/);
  assert.match(fonte, /const base = editando \?\? origem/);
  assert.match(fonte, /defaultValue=\{editando \? formatarPlaca\(editando\.placa\) : ""\}/);
  assert.match(fonte, /id="renavam" name="renavam" defaultValue=\{editando\?\.renavam \?\? ""\}/);
  assert.match(fonte, /defaultValue=\{editando\?\.quilometragem_atual \?\? 0\}/);
  assert.match(fonte, /!editando\?\.codigo_sku/);
});

test("Endereçamento usa AcoesLinha mantendo o Clonar atual; Portadores é só histórico, sem ações", () => {
  const fonte = ler("EnderecamentoModulo");
  assert.match(fonte, /<AcoesLinha[\s\S]*?onClonar=[\s\S]*?onEditar=[\s\S]*?onExcluir=/);
  assert.match(fonte, /setOrigemClone\(""\); setClonando\(produto\)/);
  assert.doesNotMatch(ler("PortadoresCaixaModulo"), /AcoesLinha/);
});
