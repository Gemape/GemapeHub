import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
const existe = (c) => existsSync(new URL(`../src/${c}`, import.meta.url));
const nuvem = existe("components/CloudSky.tsx") ? ler("components/CloudSky.tsx") : "";
const inicio = ler("routes/_authenticated/inicio.tsx");

test("o componente Cloud Sky (Originkit) está no projeto como veio, com o preset do pedido", () => {
  assert.ok(nuvem, "src/components/CloudSky.tsx");
  assert.match(nuvem, /^\/\/ Cloud Sky — Originkit/);
  assert.match(nuvem, /export default function CloudSky\(props: Record<string, unknown>\)/);
  assert.match(nuvem, /__originkitPresetProps/);
  assert.match(nuvem, /"cirrus": 100/);
  assert.match(nuvem, /"wind": 300/);
  assert.match(nuvem, /const FRAG_SRC = `/);
  assert.match(nuvem, /canvas\.getContext\("webgl"/);
});

test("revisão do componente: só desenha num canvas, sem rede, execução de código nem armazenamento", () => {
  assert.doesNotMatch(nuvem, /fetch\(|XMLHttpRequest|WebSocket|eval\(|new Function|document\.write|localStorage|sessionStorage|innerHTML|import\(/);
  assert.deepEqual([...nuvem.matchAll(/^import .* from "([^"]+)"/gm)].map((m) => m[1]), ["react", "react"]);
});

test("a tela inicial usa o céu como fundo, atrás dos cartões, sem atrapalhar o clique nem o leitor de tela", () => {
  assert.match(inicio, /import CloudSky from "@\/components\/CloudSky"/);
  assert.match(inicio, /<CloudSky /);
  assert.match(inicio, /aria-hidden="true"/);
  assert.match(inicio, /fixed inset-0/);
  assert.match(inicio, /-z-10/);
  // o componente traz largura/altura mínimas de 1200x800: na tela inicial o fundo acompanha a janela
  assert.match(inicio, /style=\{\{ width: "100%", height: "100%", minWidth: 0, minHeight: 0 \}\}/);
});

test("o fundo fica fora do contêiner com espaçamento (a margem do space-y encolhia o fundo e deixava uma faixa)", () => {
  const fundo = inicio.indexOf('className="fixed inset-0 -z-10"');
  const conteiner = inicio.indexOf('className="space-y-8"');
  assert.ok(fundo > 0 && conteiner > fundo, "o fundo vem antes e fora do div space-y-8");
  assert.ok(inicio.indexOf("</div>", fundo) < conteiner, "o div do fundo fecha antes do contêiner");
});

test("o céu é desenhado em resolução menor e o navegador amplia: o shader é pesado em placas de vídeo fracas", () => {
  assert.match(inicio, /ESCALA_DO_CEU/);
  assert.match(inicio, /width=\{tamanho\.w\} height=\{tamanho\.h\}/);
  assert.match(inicio, /addEventListener\("resize"/);
});

test("quem pede menos movimento recebe o céu parado, como o resto do sistema (decisão 114)", () => {
  assert.match(inicio, /prefers-reduced-motion: reduce/);
  assert.match(inicio, /speed=\{0\}/);
  assert.match(inicio, /pointer=\{\{ wind: 0, parallax: 0/);
});

test("o texto da tela fica legível sobre o céu: título e grupos em painéis claros", () => {
  assert.match(inicio, /bg-card\/\d+/);
  assert.match(inicio, /backdrop-blur/);
});

test("o céu usa o tom lavanda da faixa dos cartões (a página inteira na cor do layout), não o azul forte do padrão", () => {
  assert.match(inicio, /const CORES_DO_CEU = \{ background: "#E8E4F5"/);
  assert.match(inicio, /baseColor: "#F6F4FC"/);
  assert.match(inicio, /accentColor: "#FFFFFF"/);
  assert.equal([...inicio.matchAll(/\{\.\.\.CORES_DO_CEU\}/g)].length, 2, "nas duas versões (com e sem movimento)");
  assert.doesNotMatch(inicio, /#0075FF/i);
});

test("a faixa dos cartões e o fundo da página partem do mesmo tom", () => {
  assert.match(inicio, /bg-primary\/10/);
});
