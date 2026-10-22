import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
const arquivo = new URL("../src/assets/logo-gemape-site.png", import.meta.url);
const css = ler("styles.css");
const layout = ler("routes/_authenticated/route.tsx");

test("a nova logomarca está no projeto como PNG com transparência (RGBA), recortada e leve", () => {
  assert.ok(existsSync(arquivo), "src/assets/logo-gemape-site.png");
  const png = readFileSync(arquivo);
  assert.equal(png.subarray(1, 4).toString(), "PNG");
  assert.equal(png[25], 6, "tipo de cor RGBA (com transparência)");
  assert.ok(png.length < 200_000, `${png.length} bytes`);
});

test("a proporção do CSS é a da imagem", () => {
  const png = readFileSync(arquivo);
  const w = png.readUInt32BE(16);
  const h = png.readUInt32BE(20);
  const m = css.match(/@utility logo-marca-site \{[\s\S]*?aspect-ratio: (\d+) \/ (\d+)/);
  assert.ok(m, "utilitário logo-marca-site com aspect-ratio");
  assert.ok(Math.abs(Number(m[1]) / Number(m[2]) - w / h) < 0.02, `${m[1]}/${m[2]} x ${w}/${h}`);
});

test("a logo na cor do site (azul da marca, não branca), animada com entrada, varredura de brilho e halo", () => {
  const bloco = css.match(/@utility logo-marca-site \{[\s\S]*?\n\}\n/)?.[0] ?? "";
  assert.ok(bloco, "bloco do utilitário");
  assert.match(bloco, /var\(--primary\)|var\(--color-primary\)/);
  assert.doesNotMatch(bloco, /oklch\(1 0 0\) 0%/);
  assert.match(bloco, /logo-entrada/);
  assert.match(bloco, /logo-varredura/);
  assert.match(bloco, /logo-halo-site/);
  assert.match(css, /@keyframes logo-halo-site/);
});

test("quem reduz movimento recebe a logo parada, no tom do site (decisão 114)", () => {
  const bloco = css.match(/@utility logo-marca-site \{[\s\S]*?\n\}\n/)?.[0] ?? "";
  assert.match(bloco, /@media \(prefers-reduced-motion: reduce\) \{[^}]*animation: none/);
});

test("o topo troca a logo antiga pela nova, em máscara, e continua levando à tela inicial", () => {
  assert.match(layout, /import logoSite from "@\/assets\/logo-gemape-site\.png"/);
  assert.match(layout, /<Link to="\/inicio"[^>]*aria-label="GEMAPE, tela inicial"/s);
  assert.match(layout, /className="logo-marca-site[^"]*"/);
  assert.match(layout, /maskImage: `url\(\$\{logoSite\}\)`/);
  assert.match(layout, /role="img"/);
  assert.doesNotMatch(layout, /logo-relatorio-viagens\.png/);
});
