import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { buscarAtalhos, caminhoDoCard, type GrupoInicio, type ResultadoBusca } from "@/lib/inicio";

// Busca rápida da tela inicial: digita o nome de qualquer função de qualquer módulo e vai direto a ela, sem abrir os cartões.
// Setas escolhem, Enter abre, Esc limpa; a tecla "/" leva o cursor ao campo de qualquer lugar da tela.
export function BuscaRapida({ grupos }: { grupos: readonly GrupoInicio[] }) {
  const navigate = useNavigate();
  const [termo, setTermo] = useState("");
  const [aberta, setAberta] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const campo = useRef<HTMLInputElement>(null);
  const raiz = useRef<HTMLDivElement>(null);
  const idLista = useId();
  const resultados = useMemo(() => buscarAtalhos(grupos, termo), [grupos, termo]);
  const mostrar = aberta && termo.trim().length > 0;

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target instanceof HTMLElement ? e.target : null;
      const digitando = !!alvo && (alvo.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName));
      if (e.key === "/" && !digitando && !document.querySelector('[role="dialog"]') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        campo.current?.focus();
      }
    };
    const fora = (e: PointerEvent) => {
      if (raiz.current && e.target instanceof Node && !raiz.current.contains(e.target)) setAberta(false);
    };
    document.addEventListener("keydown", tecla);
    document.addEventListener("pointerdown", fora);
    return () => {
      document.removeEventListener("keydown", tecla);
      document.removeEventListener("pointerdown", fora);
    };
  }, []);

  const abrir = (r: ResultadoBusca) => {
    setAberta(false);
    setTermo("");
    void navigate({ to: r.url, ...(r.search ? { search: r.search } : {}) } as never);
  };

  const aoTeclar = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && resultados.length) {
      e.preventDefault();
      setAberta(true);
      setAtivo((a) => (a + 1) % resultados.length);
    } else if (e.key === "ArrowUp" && resultados.length) {
      e.preventDefault();
      setAtivo((a) => (a - 1 + resultados.length) % resultados.length);
    } else if (e.key === "Enter") {
      const r = mostrar ? resultados[ativo] : undefined;
      if (r) {
        e.preventDefault();
        abrir(r);
      }
    } else if (e.key === "Escape") {
      if (termo) setTermo("");
      else campo.current?.blur();
      setAberta(false);
    }
  };

  return (
    <div ref={raiz} className="relative z-30 mx-auto w-full max-w-xl">
      <div className="glass flex items-center gap-2 rounded-full px-4 py-2 shadow-sm transition-shadow focus-within:shadow-md focus-within:ring-2 focus-within:ring-primary/40">
        <Search className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <input
          ref={campo}
          type="search"
          role="combobox"
          aria-expanded={mostrar}
          aria-controls={idLista}
          aria-activedescendant={mostrar && resultados[ativo] ? `${idLista}-${ativo}` : undefined}
          aria-label="Buscar função em qualquer módulo"
          placeholder="Buscar função em qualquer módulo…  ( / )"
          autoComplete="off"
          value={termo}
          onChange={(e) => {
            setTermo(e.target.value);
            setAtivo(0);
            setAberta(true);
          }}
          onFocus={() => setAberta(true)}
          onKeyDown={aoTeclar}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
        />
        {termo && (
          <button type="button" aria-label="Limpar busca" onClick={() => { setTermo(""); campo.current?.focus(); }} className="rounded-full p-0.5 text-muted-foreground hover:text-foreground">
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
      {mostrar && (
        <ul id={idLista} role="listbox" aria-label="Resultados da busca" className="glass-strong absolute inset-x-0 top-full mt-2 max-h-80 overflow-auto rounded-2xl border py-1 shadow-xl animate-in fade-in-0 slide-in-from-top-1 duration-150">
          {resultados.length === 0 && <li className="px-4 py-3 text-sm text-muted-foreground" role="option" aria-selected="false">Nada encontrado para “{termo.trim()}”.</li>}
          {resultados.map((r, i) => (
            <li key={`${r.cartao}/${r.titulo}/${r.url}/${JSON.stringify(r.search ?? {})}`} id={`${idLista}-${i}`} role="option" aria-selected={i === ativo}>
              <button
                type="button"
                onMouseEnter={() => setAtivo(i)}
                onClick={() => abrir(r)}
                className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm ${i === ativo ? "bg-primary/10" : ""}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{r.titulo}</span>
                  <span className="block truncate text-xs text-muted-foreground">{r.secao ? caminhoDoCard(r.cartao, r.secao) : r.cartao}</span>
                </span>
                <ArrowRight className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
