import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { juntarImagens } from "../src/lib/imagem-economica.ts";
import { MAX_ARQUIVOS } from "../src/lib/questionario-despesas.ts";

const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
const form = ler("components/parametros/QuestionarioFormulario.tsx");

test("o campo do comprovante tem o botão Tirar foto com a câmera traseira", () => {
  assert.match(form, /<input[^>]*type="file"[^>]*accept="image\/\*"[^>]*capture="environment"|<input[^>]*capture="environment"[^>]*accept="image\/\*"/s);
  assert.match(form, /Tirar foto/);
});

test("o escolher arquivos continua igual: vários arquivos, sem capture", () => {
  const entradaAntiga = form.match(/<Input\s[^>]*?type="file"[\s\S]*?\/>\s*\n/);
  assert.ok(entradaAntiga, "entrada de arquivos existente");
  assert.match(entradaAntiga[0], /multiple/);
  assert.match(entradaAntiga[0], /accept="image\/\*"/);
  assert.doesNotMatch(entradaAntiga[0], /capture/);
  assert.match(entradaAntiga[0], /disabled=\{cheio \|\| lendo\}/);
});

test("foto da câmera e arquivos escolhidos passam pelo mesmo caminho: mesma compressão, limite e validação", () => {
  // um único ponto reduz as imagens e aplica o limite
  assert.equal(form.match(/escolhidos\.map\(reduzirImagem\)|\.map\(reduzirImagem\)/g)?.length, 1);
  assert.equal(form.match(/juntarImagens\(imagens, reduzidas, MAX_ARQUIVOS\)/g)?.length, 1);
  assert.equal(form.match(/mensagemDeLimite\(imagens\.length, /g)?.length, 1);
  // os dois campos chamam esse ponto
  assert.match(form, /async function adicionarImagens\(escolhidos: File\[\]\)/);
  assert.match(form, /adicionarImagens\(escolhidos\)/);
  assert.match(form, /adicionarImagens\(\[pendente\]\)/);
});

test("o botão da câmera trava no limite de 3 e durante a leitura", () => {
  assert.equal(MAX_ARQUIVOS, 3);
  const botao = form.match(/<Button[^>]*>\s*Tirar foto/s);
  assert.ok(botao, "botão Tirar foto");
  assert.match(botao[0], /disabled=\{cheio \|\| lendo\}/);
});

test("limite de 3 e foto da câmera: a 4ª não entra e nada muda", () => {
  const img = (nome) => ({ nome, bytesAntes: 1, bytesDepois: 1, dataUrl: "data:image/webp;base64,AA" });
  const r = juntarImagens([img("a"), img("b"), img("c")], [img("camera.jpg")], MAX_ARQUIVOS);
  assert.equal(r.lista.length, 3);
  assert.match(r.erro, /remova uma/);
});

test("prévia antes de confirmar, com opção de descartar e tirar outra", () => {
  assert.match(form, /URL\.createObjectURL\(pendente\)/);
  assert.match(form, /URL\.revokeObjectURL/);
  assert.match(form, /Usar foto/);
  assert.match(form, /Descartar e tirar outra/);
  assert.match(form, /alt="Prévia da foto tirada"/);
});

test("a obrigatoriedade de ao menos 1 imagem e o texto de contagem continuam", () => {
  assert.match(form, /ao menos 1 obrigatória/);
  assert.match(form, /todas são reduzidas no navegador antes do envio/);
});

test("a câmera fica no comprovante da despesa e no anexo de fotos das ocorrências e dos check lists (BotaoAnexarFotos); os outros módulos não têm", () => {
  // O anexo de fotos (ocorrências e check lists de veículos e equipamentos) ganhou o Tirar foto por pedido: uma câmera só, no componente compartilhado.
  assert.equal(ler("components/modules/FotosOcorrencia.tsx").match(/capture="environment"/g)?.length, 1);
  for (const arq of [
    "components/modules/OcorrenciasVeiculoModulo.tsx",
    "components/modules/ChecklistVeiculoModulo.tsx",
    "components/modules/MovimentacoesModulo.tsx",
    "components/modules/OcorrenciasModulo.tsx",
    "integrations/supabase/demo-client.ts",
  ]) assert.doesNotMatch(ler(arq), /capture="environment"/, arq);
  assert.equal(form.match(/capture="environment"/g)?.length, 1);
});

test("revisão: a prévia só fecha se a foto entrou na fila (não perde a foto no erro de limite)", () => {
  assert.match(form, /async function adicionarImagens\(escolhidos: File\[\]\): Promise<boolean>/);
  assert.match(form, /if \(await adicionarImagens\(\[pendente\]\)\) setPendente\(null\)/);
});

test("revisão: foto da câmera ganha nome único (no iOS toda captura se chama image.jpg)", () => {
  assert.match(form, /new File\(\[tirada\], `foto-\$\{Date\.now\(\)\}\./);
});

test("revisão: a URL da prévia é criada e liberada num efeito, não durante a renderização", () => {
  assert.doesNotMatch(form, /useMemo\(\(\) => \(pendente \? URL\.createObjectURL/);
  assert.match(form, /useEffect\(\(\) => \{[\s\S]{0,200}URL\.createObjectURL\(pendente\)[\s\S]{0,200}URL\.revokeObjectURL/);
});
