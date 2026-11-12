import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, MessageCircleQuestion, Send } from "lucide-react";
import { useMemo, useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAccess } from "@/lib/access-context";
import { responderConsulta, type LinkConsulta } from "@/lib/consulta-rapida";
import { hojeLocal } from "@/lib/empregados";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import type { MovimentacaoEpi } from "@/lib/entrega-epi";
import { useEmpregados, useItens } from "@/lib/hooks-gemape";
import { buscarAtalhos, gruposDoInicio } from "@/lib/inicio";
import { lerTodas } from "@/lib/ler-todas";

type Mensagem = { de: "voce" | "sistema"; texto: string; links?: readonly LinkConsulta[] };

const EXEMPLOS = ["Quem está com a furadeira 04?", "Quais EPIs vencem essa semana?"];

// Campo de pergunta no canto da tela: o gestor ou o almoxarife escreve em linguagem natural e recebe a resposta com o link direto da tela.
export function ConsultaRapida() {
  const [aberto, setAberto] = useState(false);
  const [conversa, setConversa] = useState<Mensagem[]>([]);
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button type="button" aria-label="Consulta rápida" className="fixed bottom-4 right-4 z-40 grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 print:hidden">
          <MessageCircleQuestion className="size-6" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="flex max-h-[70vh] w-[min(22rem,calc(100vw-2rem))] flex-col gap-2 p-3">
        {/* O painel só existe com o balão aberto: os dados são lidos depois do primeiro clique, não em toda tela. */}
        <PainelConsulta conversa={conversa} setConversa={setConversa} fechar={() => setAberto(false)} />
      </PopoverContent>
    </Popover>
  );
}

function PainelConsulta({ conversa, setConversa, fechar }: { conversa: Mensagem[]; setConversa: React.Dispatch<React.SetStateAction<Mensagem[]>>; fechar: () => void }) {
  const [texto, setTexto] = useState("");
  const { isAdmin, podeVerCaminho } = useAccess();
  const { empresaId } = useEmpresa();
  // Cada módulo só é lido se o usuário pode abrir a tela dele, e dentro da empresa escolhida no cabeçalho.
  const podeFerr = podeVerCaminho("/ferramentas");
  const podeEpi = podeVerCaminho("/epi");
  const podeUni = podeVerCaminho("/uniformes");
  const ferramentas = useItens("ferramenta", empresaId, "", podeFerr);
  const epis = useItens("epi", empresaId, "", podeEpi);
  const uniformes = useItens("uniforme", empresaId, "", podeUni);
  const empregados = useEmpregados(empresaId);
  const movimentos = useQuery({
    queryKey: ["consulta-rapida-movimentos-ferramenta", empresaId],
    enabled: podeFerr,
    staleTime: 30_000,
    queryFn: () => lerTodas<MovimentacaoEpi>(() => {
      const q = supabase.from("movimentacoes").select("*").eq("modulo", "ferramenta");
      return empresaId !== TODAS ? q.eq("empresa_id", empresaId) : q;
    }, (q) => q.order("id")),
  });
  const grupos = useMemo(() => gruposDoInicio(isAdmin, podeVerCaminho), [isAdmin, podeVerCaminho]);
  const carregando = (podeFerr && (ferramentas.isLoading || movimentos.isLoading)) || (podeEpi && epis.isLoading) || (podeUni && uniformes.isLoading) || empregados.isLoading;

  function perguntar(e: React.FormEvent) {
    e.preventDefault();
    const pergunta = texto.trim();
    if (!pergunta || carregando) return;
    const resposta = responderConsulta(pergunta, {
      hoje: hojeLocal(),
      ferramentas: podeFerr ? ferramentas.data ?? [] : [],
      movimentosFerramenta: podeFerr ? movimentos.data ?? [] : [],
      epis: podeEpi ? epis.data ?? [] : [],
      uniformes: podeUni ? uniformes.data ?? [] : [],
      empregados: empregados.data ?? [],
    });
    // Sem regra para a pergunta: oferece as telas cujo nome combina com as palavras dela (só as que o usuário pode abrir).
    const telas = resposta ? [] : buscarAtalhos(grupos, pergunta, 4);
    const sistema: Mensagem = resposta
      ? { de: "sistema", texto: resposta.texto, links: resposta.links.filter((l) => podeVerCaminho(l.url, l.search)) }
      : telas.length
        ? { de: "sistema", texto: "Não entendi a pergunta, mas estas telas podem ajudar:", links: telas.map((t) => ({ rotulo: t.titulo, url: t.url, ...(t.search ? { search: t.search } : {}) })) }
        : { de: "sistema", texto: "Não entendi. Tente, por exemplo: “Quem está com a furadeira 04?” ou “Quais EPIs vencem essa semana?”." };
    const sua: Mensagem = { de: "voce", texto: pergunta };
    setConversa((c) => [...c, sua, sistema].slice(-12));
    setTexto("");
  }

  return (
    <>
      <p className="text-sm font-semibold">Consulta rápida</p>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto text-sm" aria-live="polite">
        {conversa.length === 0 && (
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Pergunte em linguagem natural e vá direto ao registro:</p>
            {EXEMPLOS.map((x) => <button key={x} type="button" onClick={() => setTexto(x)} className="block text-left text-primary hover:underline">{x}</button>)}
          </div>
        )}
        {conversa.map((m, i) => (
          <div key={i} className={m.de === "voce" ? "ml-8 rounded-lg bg-primary/10 px-3 py-1.5" : "mr-4 rounded-lg bg-muted px-3 py-1.5"}>
            <p className="whitespace-pre-line">{m.texto}</p>
            {m.links?.map((l) => (
              <Link key={`${l.url}${l.rotulo}`} to={l.url as never} {...(l.search ? { search: l.search as never } : {})} onClick={fechar} className="mt-1 flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                {l.rotulo} <ArrowRight className="size-3" aria-hidden="true" />
              </Link>
            ))}
          </div>
        ))}
      </div>
      <form onSubmit={perguntar} className="flex gap-2">
        <input value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Sua pergunta" placeholder={carregando ? "Carregando dados…" : "Escreva sua pergunta…"} maxLength={200} className="min-w-0 flex-1 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring" />
        <button type="submit" aria-label="Enviar pergunta" disabled={carregando || !texto.trim()} className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground disabled:opacity-50"><Send className="size-4" aria-hidden="true" /></button>
      </form>
    </>
  );
}
