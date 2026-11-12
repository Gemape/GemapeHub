import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");

test("termos técnicos têm o (?) com a explicação de quando usar", () => {
  assert.match(ler("components/AjudaTermo.tsx"), /aria-label=\{`O que é: \$\{termo\}`\}/);
  assert.match(ler("components/modules/EpiFichaEpiAvulsa.tsx"), /<AjudaTermo termo="Ficha de EPI Avulsa">/);
  assert.match(ler("components/modules/EpiEntrega.tsx"), /<AjudaTermo termo="Termo de Entrega">/);
  assert.match(ler("components/modules/EstoqueEpiModulo.tsx"), /termo="Estoque mínimo \(ponto de pedido\)"/);
});

test("listas vazias mostram botão de ação no centro, não só uma linha de texto", () => {
  assert.match(ler("components/modules/OcorrenciasModulo.tsx"), /acao="\+ Registrar Primeira Ocorrência" aoAcionar=\{abrirNovo\}/);
  assert.match(ler("components/modules/CadastroEpi.tsx"), /acao="\+ Cadastrar Primeiro EPI"/);
  assert.match(ler("components/EstadoVazio.tsx"), /requiresWrite/);
});

test("a entrega acha o empregado por nome, matrícula ou CPF e mostra o mini-resumo ao lado", () => {
  const entrega = ler("components/modules/EpiEntrega.tsx");
  assert.match(entrega, /<SeletorComBusca/);
  assert.match(entrega, /\$\{e\.matricula \?\? "sem matrícula"\} · \$\{formatarCpf\(e\.cpf\)\}/);
  assert.match(entrega, /<ResumoEmpregado /);
  assert.match(ler("components/modules/ResumoEmpregado.tsx"), /aria-label="Resumo do colaborador"/);
});

test("a consulta rápida fica no layout das telas internas e só lê dados depois de aberta", () => {
  assert.match(ler("routes/_authenticated/route.tsx"), /<ConsultaRapida \/>/);
  assert.match(ler("components/layout/ConsultaRapida.tsx"), /enabled: podeFerr/);
});
