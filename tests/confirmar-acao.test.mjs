import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");

// Arquivos já migrados do confirm() do navegador para a janela do sistema; cresce a cada lote do Bloco 4a.
const MIGRADOS = [
  "components/modules/ItensModulo.tsx",
  // Lote 2: cadastros de itens e pessoas
  "components/modules/CadastroEpi.tsx",
  "components/modules/CadastroProduto.tsx",
  "components/modules/CadastroUniforme.tsx",
  "components/modules/EmpregadosCadastroModulo.tsx",
  "components/modules/VeiculosCadastroModulo.tsx",
  "components/modules/CaixasFerramentasModulo.tsx",
  "components/modules/EnderecamentoModulo.tsx",
  "routes/_authenticated/cadastros/fornecedores.tsx",
  "routes/_authenticated/cadastros/clientes.tsx",
  "routes/_authenticated/cadastros/equipamentos.tsx",
  // Lote 3: registros operacionais
  "components/modules/OcorrenciasModulo.tsx",
  "components/modules/ManutencaoVeiculoModulo.tsx",
  "components/modules/AbastecimentoVeiculoModulo.tsx",
  "components/modules/EpiComprasModulo.tsx",
  "components/modules/UniformesComprasModulo.tsx",
  "components/modules/ImportarNfeXml.tsx",
];

test("a janela de confirmação existe, está no layout e cita o item no título da exclusão", () => {
  const janela = ler("components/ConfirmarAcao.tsx");
  assert.match(janela, /titulo: `Excluir \$\{nome\}\?`/);
  assert.match(janela, /destrutivo: true/);
  assert.match(janela, /<AlertDialogCancel>Cancelar<\/AlertDialogCancel>/);
  assert.match(janela, /window\.confirm/, "sem a janela montada, cai no confirm() em vez de passar sem perguntar");
  assert.match(ler("routes/_authenticated/route.tsx"), /<ConfirmarAcaoHost \/>/);
});

test("arquivos migrados não usam mais o confirm() do navegador", () => {
  for (const f of MIGRADOS) {
    const src = ler(f);
    assert.doesNotMatch(src, /(?<![\w.])confirm\(/, f);
    assert.match(src, /confirmar(Exclusao)?\(/, f);
  }
});
