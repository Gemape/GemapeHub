import { SemResultadoBusca } from "@/components/SemResultadoBusca";
import { sugerirNome } from "@/lib/busca-tolerante";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { useAccess } from "@/lib/access-context";
import { buscarRegistros, type AcaoDoRegistro, type ResultadoRegistro } from "@/lib/busca-acoes";
import { useEmpresa } from "@/lib/empresa-context";
import { useEmpregados, useItens } from "@/lib/hooks-gemape";
import { buscarAtalhos, caminhoDoCard, type GrupoInicio, type ResultadoBusca } from "@/lib/inicio";

// Uma linha do resultado: ou uma tela (abre ao clicar) ou um registro com os botões do que se faz com ele.
type Linha = { tipo: "tela"; r: ResultadoBusca } | { tipo: "registro"; r: ResultadoRegistro; acoes: AcaoDoRegistro[] };

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
  const { podeVerCaminho } = useAccess();
  const { empresaId } = useEmpresa();
  const podeEpi = podeVerCaminho("/epi");
  // Empregados e EPIs só são lidos se a pessoa pode abrir o módulo; já ficam em cache para o resto da tela inicial.
  const { data: empregados = [] } = useEmpregados(empresaId, false, podeEpi);
  const { data: epis = [] } = useItens("epi", empresaId, "", podeEpi);
  const bruto = useMemo(() => ({
    registros: podeEpi ? buscarRegistros(termo, { empregados, epis }) : [],
    telas: buscarAtalhos(grupos, termo),
  }), [grupos, termo, empregados, epis, podeEpi]);
  // A permissão é conferida a cada desenho (ela pode mudar com o usuário), sobre o resultado já calculado.
  const resultados: Linha[] = [
    ...bruto.registros.map((r) => ({ tipo: "registro" as const, r, acoes: r.acoes.filter((a) => podeVerCaminho(a.url, a.search)) })).filter((l) => l.acoes.length > 0),
    ...bruto.telas.map((r) => ({ tipo: "tela" as const, r })),
  ];
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

  const ir = (r: { url: string; search?: Record<string, string> | undefined }) => {
    setAberta(false);
    setTermo("");
    void navigate({ to: r.url, ...(r.search ? { search: r.search } : {}) } as never);
  };
  // Enter em um registro faz a primeira ação (ver a ficha, ver o saldo); as outras ficam nos botões.
  const abrir = (l: Linha) => ir(l.tipo === "tela" ? l.r : l.acoes[0]!);

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
          aria-label="Buscar função, empregado ou CA"
          placeholder="Buscar função, empregado ou CA…  ( / )"
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
          {resultados.length === 0 && (
            <li role="option" aria-selected="false">
              <SemResultadoBusca
                termo={termo}
                sugestao={sugerirNome(termo, empregados.map((e) => e.nome))}
                aoSugerir={setTermo}
                {...(podeVerCaminho("/empregados") ? { rotuloCadastro: `Cadastrar “${termo.trim()}”`, aoCadastrar: () => void navigate({ to: "/empregados", search: { novoNome: termo.trim() } }) } : {})}
              />
            </li>
          )}
          {resultados.map((l, i) => (
            <li key={l.tipo === "tela" ? `${l.r.cartao}/${l.r.titulo}/${l.r.url}/${JSON.stringify(l.r.search ?? {})}` : l.r.chave} id={`${idLista}-${i}`} role="option" aria-selected={i === ativo}>
              {l.tipo === "tela" ? (
                <button
                  type="button"
                  onMouseEnter={() => setAtivo(i)}
                  onClick={() => abrir(l)}
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm ${i === ativo ? "bg-primary/10" : ""}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{l.r.titulo}</span>
                    <span className="block truncate text-xs text-muted-foreground">{l.r.secao ? caminhoDoCard(l.r.cartao, l.r.secao) : l.r.cartao}</span>
                  </span>
                  <ArrowRight className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                </button>
              ) : (
                <div onMouseEnter={() => setAtivo(i)} className={`px-4 py-2 text-sm ${i === ativo ? "bg-primary/10" : ""}`}>
                  <span className="block truncate font-medium">{l.r.titulo} <span className="text-xs font-normal text-muted-foreground">· {l.r.tipo}</span></span>
                  <span className="block truncate text-xs text-muted-foreground">{l.r.detalhe}</span>
                  <span className="mt-1.5 flex flex-wrap gap-1.5">
                    {l.acoes.map((a) => (
                      <button key={a.rotulo} type="button" onClick={() => ir(a)} className="rounded-full border bg-card px-2.5 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        {a.rotulo}
                      </button>
                    ))}
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
