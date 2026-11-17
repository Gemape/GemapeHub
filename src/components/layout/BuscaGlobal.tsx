import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useAccess } from "@/lib/access-context";
import { buscarGlobal, MIN_BUSCA, type DestinoBusca, type GrupoBusca } from "@/lib/busca-global";
import { useEmpresa } from "@/lib/empresa-context";
import { useEmpregados, useItens, useVeiculos } from "@/lib/hooks-gemape";

// Atalho de teclado: Ctrl+K (ou ⌘K no Mac). A tecla "/" da tela inicial segue sendo da busca rápida dela.
const ehAtalho = (e: KeyboardEvent) => (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k";

// Busca global do cabeçalho de todas as telas: abre pelo ícone ou por Ctrl+K, fecha com Esc. Acha empregado (nome, matrícula), veículo (placa, marca, modelo)
// e item de EPI, uniforme e ferramenta (nome, código, CA), agrupados por módulo, e leva direto à tela do item.
export function BuscaGlobal() {
  const [aberta, setAberta] = useState(false);
  const abertaRef = useRef(false);
  abertaRef.current = aberta;
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (!ehAtalho(e)) return;
      // Com outra janela aberta (um cadastro, por exemplo) o atalho não empilha uma segunda por cima; a própria busca aberta fecha.
      if (!abertaRef.current && document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      setAberta((a) => !a);
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, []);
  return (
    <>
      <Button type="button" variant="outline" size="icon" onClick={() => setAberta(true)} aria-label="Buscar em todo o sistema (Ctrl+K)" title="Buscar em todo o sistema (Ctrl+K)" aria-keyshortcuts="Control+K Meta+K" className="size-8 shrink-0">
        <Search className="size-4" aria-hidden="true" />
      </Button>
      <Dialog open={aberta} onOpenChange={setAberta}>
        <DialogContent className="top-[12%] max-w-xl translate-y-0 gap-2 p-3 sm:rounded-2xl" semBotaoFechar>
          <DialogTitle className="sr-only">Buscar em todo o sistema</DialogTitle>
          <DialogDescription className="sr-only">Digite um nome, código, matrícula ou placa. Setas escolhem, Enter abre, Esc fecha.</DialogDescription>
          {/* Os dados só são lidos com a janela aberta: não pesam em toda tela. */}
          {aberta && <PainelBusca aoEscolher={() => setAberta(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function PainelBusca({ aoEscolher }: { aoEscolher: () => void }) {
  const navigate = useNavigate();
  const { podeVerCaminho } = useAccess();
  const { empresaId } = useEmpresa();
  const [termo, setTermo] = useState("");
  const [ativo, setAtivo] = useState(0);
  const idLista = useId();
  // Cada módulo só é lido se a pessoa pode abrir a tela de destino.
  const podeEmpregado = podeVerCaminho("/epi", { aba: "historico" });
  const podeVeiculo = podeVerCaminho("/veiculos", { aba: "frota" });
  const podeEpi = podeVerCaminho("/epi", { aba: "estoque" });
  const podeUniforme = podeVerCaminho("/uniformes", { aba: "estoque" });
  const podeFerramenta = podeVerCaminho("/ferramentas", { aba: "estoque" });
  const empregados = useEmpregados(empresaId, false, podeEmpregado);
  const veiculos = useVeiculos(empresaId, podeVeiculo);
  const epis = useItens("epi", empresaId, "", podeEpi);
  const uniformes = useItens("uniforme", empresaId, "", podeUniforme);
  const ferramentas = useItens("ferramenta", empresaId, "", podeFerramenta);
  const carregando = [[podeEmpregado, empregados], [podeVeiculo, veiculos], [podeEpi, epis], [podeUniforme, uniformes], [podeFerramenta, ferramentas]].some(([pode, q]) => pode && (q as { isLoading: boolean }).isLoading);

  const grupos: GrupoBusca[] = useMemo(() => buscarGlobal(termo, {
    ...(podeEmpregado ? { empregados: empregados.data ?? [] } : {}),
    ...(podeVeiculo ? { veiculos: veiculos.data ?? [] } : {}),
    ...(podeEpi ? { epis: epis.data ?? [] } : {}),
    ...(podeUniforme ? { uniformes: uniformes.data ?? [] } : {}),
    ...(podeFerramenta ? { ferramentas: ferramentas.data ?? [] } : {}),
  }), [termo, podeEmpregado, podeVeiculo, podeEpi, podeUniforme, podeFerramenta, empregados.data, veiculos.data, epis.data, uniformes.data, ferramentas.data]);
  const planos = grupos.flatMap((g) => g.itens);
  const indiceAtivo = Math.min(ativo, Math.max(planos.length - 1, 0));
  const digitou = termo.trim().length >= MIN_BUSCA;

  const ir = (d: DestinoBusca) => {
    aoEscolher();
    void navigate({ to: d.url, search: d.search } as never);
  };
  const aoTeclar = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && planos.length) { e.preventDefault(); setAtivo((indiceAtivo + 1) % planos.length); }
    else if (e.key === "ArrowUp" && planos.length) { e.preventDefault(); setAtivo((indiceAtivo - 1 + planos.length) % planos.length); }
    else if (e.key === "Enter" && planos[indiceAtivo]) { e.preventDefault(); ir(planos[indiceAtivo]!.destino); }
  };

  let posicao = -1;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center gap-2 rounded-full border bg-background/60 px-4 py-2 focus-within:ring-2 focus-within:ring-primary/40">
        <Search className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <input
          type="search"
          role="combobox"
          aria-expanded={digitou}
          aria-controls={idLista}
          aria-activedescendant={digitou && planos[indiceAtivo] ? `${idLista}-${indiceAtivo}` : undefined}
          aria-label="Buscar por nome, código, matrícula ou placa"
          placeholder="Nome, código, matrícula ou placa…"
          autoComplete="off"
          value={termo}
          onChange={(e) => { setTermo(e.target.value); setAtivo(0); }}
          onKeyDown={aoTeclar}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
        />
        <kbd className="hidden shrink-0 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">Esc</kbd>
      </div>
      <div id={idLista} role="listbox" aria-label="Resultados da busca" className="max-h-[60vh] min-h-0 overflow-y-auto">
        {!digitou && <p className="px-3 py-4 text-sm text-muted-foreground">Digite pelo menos {MIN_BUSCA} letras de um nome, código, matrícula ou placa.</p>}
        {digitou && carregando && planos.length === 0 && <p role="status" className="px-3 py-4 text-sm text-muted-foreground">Carregando dados…</p>}
        {digitou && !carregando && planos.length === 0 && <p role="status" className="px-3 py-4 text-sm text-muted-foreground">Nada encontrado para “{termo.trim()}”. Confira a grafia ou a empresa escolhida no cabeçalho.</p>}
        {grupos.map((g) => (
          <div key={g.modulo} role="group" aria-label={g.modulo} className="py-1">
            <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-primary/80">{g.modulo}</p>
            {g.itens.map((r) => {
              posicao += 1;
              const i = posicao;
              return (
                <button
                  key={r.chave}
                  type="button"
                  id={`${idLista}-${i}`}
                  role="option"
                  aria-selected={i === indiceAtivo}
                  onMouseEnter={() => setAtivo(i)}
                  onClick={() => ir(r.destino)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${i === indiceAtivo ? "bg-primary/10" : ""}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{r.titulo}</span>
                    <span className="block truncate text-xs text-muted-foreground">{r.detalhe}</span>
                  </span>
                  <ArrowRight className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
