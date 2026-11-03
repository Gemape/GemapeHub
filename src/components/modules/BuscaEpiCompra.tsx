import { useMemo, useState } from "react";

import { pedeTamanho } from "@/components/SeletorTamanho";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { opcoesTamanhoEntrada } from "@/lib/estoque-tamanho";
import type { Item } from "@/lib/hooks-gemape";
import { combinaBusca, type ParametrosBase } from "@/lib/parametros-base";

// Escolha do EPI da compra (decisão 351): depois de escolher a empresa, uma busca por palavra-chave (código, descrição, tamanho ou CA) filtra a lista; cada EPI aparece como código + descrição +
// tamanho, uma linha por tamanho autorizado (EPI sem tamanho, uma linha só). Escolher a linha já define o EPI e o tamanho da compra.
export type OpcaoEpiCompra = { chave: string; itemId: string; tamanho: string; codigo: string; descricao: string; rotuloTamanho: string; ca: string };

export function opcoesDeEpi(itens: Item[], parametros: ParametrosBase): OpcaoEpiCompra[] {
  return itens.flatMap((i) => {
    const base = { itemId: i.id, codigo: i.codigo_sku, descricao: i.nome, ca: i.ca ?? "" };
    if (!pedeTamanho(parametros, "epi", i)) return [{ ...base, chave: i.id, tamanho: "", rotuloTamanho: "—" }];
    const tamanhos = opcoesTamanhoEntrada(parametros, "epi", i);
    // Sem nenhum tamanho autorizado a linha continua na lista, para a pessoa ver o EPI; o registro da compra pede o tamanho.
    return tamanhos.length
      ? tamanhos.map((t) => ({ ...base, chave: `${i.id}|${t.valor}`, tamanho: t.valor, rotuloTamanho: t.rotulo }))
      : [{ ...base, chave: i.id, tamanho: "", rotuloTamanho: "sem tamanho autorizado" }];
  });
}

export function BuscaEpiCompra({
  itens,
  parametros,
  itemId,
  tamanho,
  aoEscolher,
  empresaEscolhida,
}: {
  itens: Item[];
  parametros: ParametrosBase;
  itemId: string;
  tamanho: string;
  aoEscolher: (opcao: OpcaoEpiCompra) => void;
  empresaEscolhida: boolean;
}) {
  const [busca, setBusca] = useState("");
  const opcoes = useMemo(() => opcoesDeEpi(itens, parametros), [itens, parametros]);
  const filtradas = opcoes.filter((o) => combinaBusca(busca, o.codigo, o.descricao, o.rotuloTamanho, o.ca));
  return (
    <div className="space-y-1.5 sm:col-span-2">
      <Label htmlFor="busca_epi">EPI</Label>
      {/* Enter na busca não pode enviar o formulário da compra. */}
      <Input id="busca_epi" type="search" placeholder="Buscar por código, descrição ou tamanho" value={busca} onChange={(e) => setBusca(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }} />
      <ul aria-label="EPIs da empresa" className="max-h-44 overflow-y-auto rounded-md border">
        {filtradas.length === 0 && <li className="px-3 py-3 text-sm text-muted-foreground">{!empresaEscolhida ? "Escolha a empresa para ver os EPIs dela." : opcoes.length === 0 ? "Esta empresa não tem EPI cadastrado." : "Nenhum EPI encontrado para a busca."}</li>}
        {filtradas.map((o) => {
          const escolhida = o.itemId === itemId && o.tamanho === tamanho;
          return (
            <li key={o.chave}>
              <button
                type="button"
                aria-pressed={escolhida}
                onClick={() => aoEscolher(o)}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted ${escolhida ? "bg-primary/10 font-medium" : ""}`}
              >
                <span className="font-mono text-xs">{o.codigo}</span>
                <span>·</span>
                <span className="flex-1 truncate">{o.descricao}</span>
                <span>·</span>
                <span className="whitespace-nowrap text-muted-foreground">{o.rotuloTamanho}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
