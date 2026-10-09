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

test("Parâmetros > Veículos usa AcoesLinha com Clonar, Editar e Excluir; clone gera código e copia placa, RENAVAM e quilometragem (dec 138)", () => {
  const fonte = ler("VeiculosCadastroModulo");
  assert.match(fonte, /<AcoesLinha[\s\S]*?onClonar=[\s\S]*?onEditar=[\s\S]*?onExcluir=/);
  assert.match(fonte, /const base = editando \?\? origem/);
  assert.match(fonte, /defaultValue=\{base \? formatarPlaca\(base\.placa\) : ""\}/);
  assert.match(fonte, /id="renavam" name="renavam" defaultValue=\{base\?\.renavam \?\? ""\}/);
  assert.match(fonte, /defaultValue=\{base\?\.quilometragem_atual \?\? 0\}/);
  assert.match(fonte, /!editando\?\.codigo_sku/);
});

test("Endereçamento usa AcoesLinha mantendo o Clonar atual; Portadores é só histórico, sem ações", () => {
  const fonte = ler("EnderecamentoModulo");
  assert.match(fonte, /<AcoesLinha[\s\S]*?onClonar=[\s\S]*?onEditar=[\s\S]*?onExcluir=/);
  assert.match(fonte, /setOrigemClone\(""\); setClonando\(produto\)/);
  assert.doesNotMatch(ler("PortadoresCaixaModulo"), /AcoesLinha/);
});

test("Caixas recarrega os itens a cada abertura do formulário, inclusive ao clonar a mesma caixa (revisão)", () => {
  const src = readFileSync(new URL("../src/components/modules/CaixasFerramentasModulo.tsx", import.meta.url), "utf8");
  assert.match(src, /\[base, itensCarregados, abertura\]/);
  assert.equal((src.match(/setAbertura\(\(n\) => n \+ 1\)/g) ?? []).length, 3);
});
