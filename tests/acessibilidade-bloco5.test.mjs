import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const le = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("prefers-reduced-motion desliga animações e transições de todo o sistema", () => {
  const css = le("src/styles.css");
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[^}]*:not\(\.animate-spin, \.animate-pulse\)::after \{[^}]*animation-duration: 0\.01ms !important[^}]*transition-duration: 0\.01ms !important/);
});

test("área de toque de 44 px em caixas de marcar, interruptores e opções (ponteiro grosso)", () => {
  const css = le("src/styles.css");
  assert.match(css, /@media \(pointer: coarse\) \{[^@]*\[role="checkbox"\]::after[^}]*min-width: 44px;[^}]*min-height: 44px/);
});

test("botões e campos do celular têm pelo menos 44 px (h-11)", () => {
  assert.match(le("src/components/ui/button.tsx"), /sm: "h-8 rounded-md px-3 text-xs max-sm:h-11"/);
  assert.match(le("src/components/ui/select.tsx"), /h-9 max-sm:h-11/);
  assert.match(le("src/routes/_authenticated/route.tsx"), /max-sm:\[&_button\]:h-11/);
});

test("cores de estado (sucesso/info) com texto branco chegam a 4,5:1", () => {
  const css = le("src/styles.css");
  const claro = css.split(".dark {")[0];
  assert.match(claro, /--success: oklch\(0\.52 /);
  assert.match(claro, /--info: oklch\(0\.52 /);
  // Na coluna 0: fora de @layer, senão a utilidade text-primary do Tailwind (camada posterior) vence.
  assert.match(css, /\n\.dark \.text-primary \{\s*color: oklch\(0\.8 /);
  assert.match(css, /:not\(\.animate-spin, \.animate-pulse\)/);
});
