// Endereço pelo CEP (ViaCEP, serviço público): só o CEP sai do navegador. Qualquer falha (sem rede, CEP inexistente) devolve null e o formulário segue como estava.
export type EnderecoDoCep = { rua: string; bairro: string; cidade: string; estado: string };

const cache = new Map<string, EnderecoDoCep | null>();

export async function buscarCep(cep: string, busca: typeof fetch = fetch): Promise<EnderecoDoCep | null> {
  const d = cep.replace(/\D/g, "");
  if (d.length !== 8) return null;
  if (cache.has(d)) return cache.get(d) ?? null;
  try {
    const r = await busca(`https://viacep.com.br/ws/${d}/json/`, { signal: AbortSignal.timeout(4000) });
    const j = (await r.json()) as { erro?: unknown; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
    const achou = r.ok && !j.erro;
    const e = achou ? { rua: j.logradouro ?? "", bairro: j.bairro ?? "", cidade: j.localidade ?? "", estado: j.uf ?? "" } : null;
    cache.set(d, e);
    return e;
  } catch {
    return null;
  }
}

// Preenche rua, bairro, cidade e estado do formulário que ainda estão vazios (nunca sobrescreve o que a pessoa digitou). Devolve o que preencheu.
export function preencherEndereco(form: HTMLFormElement | null | undefined, e: EnderecoDoCep): string[] {
  const feitos: string[] = [];
  for (const nome of ["rua", "bairro", "cidade", "estado"] as const) {
    const campo = form?.elements.namedItem(nome);
    if (campo && "value" in campo && !String(campo.value).trim() && e[nome]) {
      (campo as { value: string }).value = e[nome];
      if (campo.value !== e[nome]) continue; // lista (estado) sem essa opção: não conta como preenchido
      (campo as unknown as EventTarget).dispatchEvent(new Event("input", { bubbles: true }));
      feitos.push(nome);
    }
  }
  return feitos;
}
