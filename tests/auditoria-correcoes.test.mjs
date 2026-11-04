// Regressões das correções da auditoria de 04/11/2026.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");

test("a caixa dupla de empregados não estoura a largura no celular (colunas minmax(0,1fr) e min-w-0)", () => {
  const t = ler("components/parametros/CaixaDuplaEmpregados.tsx");
  assert.match(t, /grid grid-cols-1 gap-3 md:grid-cols-\[minmax\(0,1fr\)_auto_minmax\(0,1fr\)\]/);
  assert.equal((t.match(/panel flex min-h-80 min-w-0 flex-col gap-2 p-3/g) ?? []).length, 2, "as duas colunas podem encolher");
});

test("o cliente do Supabase sem tipos tem uma definição só, com o any justificado", () => {
  const def = ler("lib/cliente-livre.ts");
  assert.match(def, /eslint-disable-next-line @typescript-eslint\/no-explicit-any\nexport type ClienteLivre/);
  for (const arq of ["components/modules/CadastroEpi.tsx", "components/modules/CadastroUniforme.tsx", "lib/itens-estoque-modulo.ts", "lib/relatorios-historico.ts"]) {
    const t = ler(arq);
    assert.match(t, /import type \{ ClienteLivre \} from/, arq);
    assert.doesNotMatch(t, /\{ from: \(tabela: string\) => any \}/, `${arq} não repete o tipo solto`);
  }
});

test("o espaço sem quebra do relatório de manutenção é escrito como \\u00a0, não como caractere invisível", () => {
  const t = ler("lib/manutencao-relatorio-html.ts");
  assert.ok(!t.includes(" "), "nenhum NBSP literal no arquivo");
  assert.match(t, /replace\(\/\\u00a0\/g, " "\)/);
});

test("a API administrativa importa o módulo de segurança com a extensão, para poder ser testada", () => {
  assert.match(ler("server/api.ts"), /from "\.\/security\.ts"/);
});
