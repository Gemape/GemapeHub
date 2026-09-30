import test from "node:test";
import assert from "node:assert/strict";
import { demoSupabase } from "../src/integrations/supabase/demo-client.ts";
import { lerHistoricoEpiEmpregado } from "../src/lib/historico-epi-empregado.ts";

const mov = (extra) => ({
  modulo: "epi",
  tipo_movimentacao: "Saida",
  quantidade: 1,
  motivo_baixa: null,
  ...extra,
});

test("a ficha lê o histórico inteiro do empregado, não só as últimas movimentações", async () => {
  const empresa = crypto.randomUUID();
  const outraEmpresa = crypto.randomUUID();
  const item = crypto.randomUUID();
  await demoSupabase
    .from("epis")
    .insert({ id: item, empresa_id: empresa, nome: "Luva", estoque_atual: 5000 });
  await demoSupabase.from("movimentacoes").insert([
    mov({
      item_id: item,
      empresa_id: empresa,
      empregado_id: "ana",
      data_movimentacao: "2020-01-01",
    }),
    mov({
      item_id: item,
      empresa_id: empresa,
      empregado_id: "ana",
      data_movimentacao: "2026-09-29",
      tipo_movimentacao: "Devolucao",
    }),
    // Mesma pessoa em outra empresa: fica fora da ficha desta empresa.
    mov({
      item_id: item,
      empresa_id: outraEmpresa,
      empregado_id: "ana",
      data_movimentacao: "2026-09-28",
    }),
  ]);
  // Muitas movimentações mais novas de outras pessoas empurram a entrega antiga para fora da janela.
  await demoSupabase
    .from("movimentacoes")
    .insert(
      Array.from({ length: 1001 }, () =>
        mov({
          item_id: item,
          empresa_id: empresa,
          empregado_id: "outra",
          data_movimentacao: "2026-09-30",
        }),
      ),
    );

  const historico = await lerHistoricoEpiEmpregado(demoSupabase, {
    empregadoId: "ana",
    empresaId: empresa,
  });
  assert.deepEqual(
    historico.map((m) => [m.data_movimentacao, m.tipo_movimentacao]),
    [
      ["2026-09-29", "Devolucao"],
      ["2020-01-01", "Saida"],
    ],
  );
});

test("a ficha avisa quando não consegue ler o histórico", async () => {
  const falha = {
    from: () => ({
      select: () => {
        const consulta = {
          eq: () => consulta,
          then: (ok) => ok({ data: null, error: { message: "sem conexão" } }),
        };
        return consulta;
      },
    }),
  };
  await assert.rejects(
    lerHistoricoEpiEmpregado(falha, { empregadoId: "ana", empresaId: "x" }),
    /sem conexão/,
  );
});
