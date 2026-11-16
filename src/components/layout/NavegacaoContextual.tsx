import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useDonoDosAtalhos } from "@/components/inicio/atalhosPessoais";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAccess } from "@/lib/access-context";
import { TODAS } from "@/lib/empresa-context";
import { useEmpregados, useItens, useVeiculos } from "@/lib/hooks-gemape";
import { areaDaRota } from "@/lib/inicio";
import {
  chavePagina, empurrarPagina, guardarRolagem, lerSessao, paginaAnterior, recuarPara, registrarNaSessao, rotularTopo, vizinhosNaLista, type Pagina, type RegistroSessao,
} from "@/lib/navegacao-contextual";

const armazenamento = (): Storage | undefined => { try { return globalThis.sessionStorage; } catch { return undefined; } };
const EVENTO = "gemape-nav-mudou";

// Rota atual: o caminho e os parâmetros que são texto. O objeto de busca só muda de identidade quando o texto muda (serve de dependência de efeito).
function useRota() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const buscaTexto = useRouterState({ select: (s) => JSON.stringify(s.location.search ?? {}) });
  const search = useMemo(() => {
    const bruto = JSON.parse(buscaTexto) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(bruto).filter(([, v]) => typeof v === "string")) as Record<string, string>;
  }, [buscaTexto]);
  return { pathname, buscaTexto, search };
}

// Nome da tela atual quando ela é atalho de um cartão: "Cartão › Tela". Fora dos cartões, null (o título da aba cobre).
function useRotuloDoCartao(pathname: string, buscaTexto: string): string | null {
  const { isAdmin, podeVerCaminho } = useAccess();
  const area = areaDaRota(pathname, JSON.parse(buscaTexto) as Record<string, unknown>, isAdmin, podeVerCaminho);
  return area ? `${area.cartao.titulo} › ${area.atual.titulo}` : null;
}

// Pedido de rolagem do botão Voltar: vale só para a próxima tela aberta (e por poucos segundos). Se a navegação for barrada ou redirecionada, não fica nada pendente.
let rolagemPendente: { chave: string; y: number; ate: number } | null = null;

// Pilha de telas (para o "Voltar para onde eu estava") e rolagem de cada uma. Não desenha nada; o botão lê a pilha.
export function PilhaDeNavegacao() {
  const dono = useDonoDosAtalhos();
  const { pathname, buscaTexto, search } = useRota();
  const doCartao = useRotuloDoCartao(pathname, buscaTexto);
  const chave = chavePagina(pathname, search);
  const chaveRef = useRef(chave);
  const ultima = useRef(0);
  const chegouEm = useRef(0);
  // Fora dos cartões o nome vem do título da aba, que o roteador troca um instante depois de abrir a tela: lê com um pequeno atraso para não pegar o da tela anterior.
  const [tituloDaAba, setTituloDaAba] = useState("");
  useEffect(() => {
    setTituloDaAba("");
    if (doCartao) return;
    const t = window.setTimeout(() => setTituloDaAba(document.title.split("|")[0]?.trim() ?? ""), 120);
    return () => window.clearTimeout(t);
  }, [chave, doCartao]);
  const rotulo = doCartao ?? (tituloDaAba || "tela anterior");

  // Entrou numa tela (ou o nome dela melhorou): entra no topo da pilha.
  useEffect(() => {
    if (!dono) return;
    empurrarPagina(armazenamento(), dono, { rotulo, url: pathname, ...(Object.keys(search).length ? { search } : {}) });
    window.dispatchEvent(new Event(EVENTO));
  }, [dono, chave, rotulo, pathname, search]);

  // Chegou pelo botão Voltar: devolve a rolagem em que a tela estava. Todo pedido é consumido na primeira tela aberta depois dele.
  useEffect(() => {
    chaveRef.current = chave;
    chegouEm.current = Date.now();
    ultima.current = 0;
    const pedido = rolagemPendente;
    rolagemPendente = null;
    if (!pedido || pedido.chave !== chave || Date.now() > pedido.ate) return;
    // O conteúdo chega depois (dados lidos de forma assíncrona): tenta de novo até a página ficar alta o bastante, e desiste se a pessoa rolar.
    let desistiu = false;
    const parar = () => { desistiu = true; };
    window.addEventListener("wheel", parar, { passive: true, once: true });
    window.addEventListener("touchstart", parar, { passive: true, once: true });
    const tentativas = [0, 120, 300, 700, 1400].map((ms) => window.setTimeout(() => {
      if (!desistiu && Math.abs(window.scrollY - pedido.y) > 2) window.scrollTo({ top: pedido.y, behavior: "instant" as ScrollBehavior });
    }, ms));
    return () => { tentativas.forEach(window.clearTimeout); window.removeEventListener("wheel", parar); window.removeEventListener("touchstart", parar); };
  }, [chave]);

  useEffect(() => {
    if (!dono) return;
    let quadro = 0;
    const aoRolar = () => {
      // logo depois de chegar, a rolagem volta ao topo sozinha: não é a rolagem que a pessoa deixou
      if (Date.now() - chegouEm.current < 400) return;
      ultima.current = window.scrollY;
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(() => guardarRolagem(armazenamento(), dono, chaveRef.current, ultima.current));
    };
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => { window.removeEventListener("scroll", aoRolar); cancelAnimationFrame(quadro); };
  }, [dono]);
  return null;
}

// "← Voltar para Histórico de João Silva": leva à tela de onde a pessoa veio, na aba e na posição da rolagem em que estava.
export function VoltarContextual() {
  const dono = useDonoDosAtalhos();
  const navigate = useNavigate();
  const { pathname, search } = useRota();
  const chave = chavePagina(pathname, search);
  const [anterior, setAnterior] = useState<Pagina | null>(null);
  useEffect(() => {
    const ler = () => setAnterior(dono ? paginaAnterior(armazenamento(), dono, chave) : null);
    ler();
    window.addEventListener(EVENTO, ler);
    return () => window.removeEventListener(EVENTO, ler);
  }, [dono, chave]);
  if (!anterior || pathname === "/inicio") return null;
  const voltar = () => {
    recuarPara(armazenamento(), dono, anterior.chave);
    rolagemPendente = { chave: anterior.chave, y: anterior.rolagem, ate: Date.now() + 5000 };
    void navigate({ to: anterior.url, ...(anterior.search ? { search: anterior.search } : {}) } as never);
  };
  return (
    <Button type="button" variant="ghost" size="sm" onClick={voltar} title={`Voltar para ${anterior.rotulo}`} className="mb-2 h-8 max-w-full justify-start gap-1.5 px-2 text-xs">
      <ArrowLeft className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">Voltar para {anterior.rotulo}</span>
    </Button>
  );
}

// Registra o registro específico que a tela mostra (ficha de um empregado, de um EPI, um veículo) na linha do tempo da sessão e põe o nome dele no "Voltar para …".
function useRegistrar(tipo: string, nome: string | undefined, pathname: string, search: Record<string, string>) {
  const dono = useDonoDosAtalhos();
  const { buscaTexto } = useRota();
  const base = useRotuloDoCartao(pathname, buscaTexto);
  useEffect(() => {
    if (!dono || !nome) return;
    registrarNaSessao(armazenamento(), dono, { tipo, rotulo: nome, url: pathname, search });
    rotularTopo(armazenamento(), dono, chavePagina(pathname, search), base ? `${base} · ${nome}` : nome);
    window.dispatchEvent(new Event(EVENTO));
  }, [dono, tipo, nome, pathname, search, base]);
}
function RegEmpregado({ id, pathname, search }: { id: string; pathname: string; search: Record<string, string> }) {
  const { data = [] } = useEmpregados(TODAS);
  useRegistrar("Colaborador", data.find((e) => e.id === id)?.nome, pathname, search);
  return null;
}
function RegVeiculo({ id, pathname, search }: { id: string; pathname: string; search: Record<string, string> }) {
  const { data = [] } = useVeiculos(TODAS);
  const v = data.find((x) => x.id === id);
  useRegistrar("Veículo", v ? `Placa ${v.placa}` : undefined, pathname, search);
  return null;
}
function RegFicha({ id, pathname, search }: { id: string; pathname: string; search: Record<string, string> }) {
  const { data = [] } = useItens("epi", TODAS);
  const nome = data.find((x) => x.id === id)?.nome;
  useRegistrar("Ficha", nome ? `Ficha: ${nome}` : undefined, pathname, search);
  return null;
}
export function RegistraRegistroAberto() {
  const { pathname, search } = useRota();
  if (search["empregado"]) return <RegEmpregado id={search["empregado"]} pathname={pathname} search={search} />;
  if (pathname === "/veiculos" && search["veiculo"]) return <RegVeiculo id={search["veiculo"]} pathname={pathname} search={search} />;
  if (search["epi"] && /epi-ficha/.test(pathname)) return <RegFicha id={search["epi"]} pathname={pathname} search={search} />;
  return null;
}

// Relógio do cabeçalho: os últimos 10 registros abertos nesta sessão, um clique para voltar a um deles.
export function LinhaDoTempoSessao() {
  const dono = useDonoDosAtalhos();
  const [itens, setItens] = useState<RegistroSessao[]>([]);
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    const ler = () => setItens(dono ? lerSessao(armazenamento(), dono) : []);
    ler();
    window.addEventListener(EVENTO, ler);
    return () => window.removeEventListener(EVENTO, ler);
  }, [dono]);
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="icon" aria-label="Últimos registros acessados" title="Últimos registros acessados" className="size-8 shrink-0">
          <Clock className="size-4" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Últimos registros acessados</p>
        {itens.length === 0 && <p className="px-2 py-3 text-sm text-muted-foreground">Nada ainda. Abra a ficha de um empregado, de um EPI ou um veículo e ela aparece aqui.</p>}
        <ul className="max-h-80 overflow-y-auto">
          {itens.map((r) => (
            <li key={chavePagina(r.url, r.search)}>
              <Link to={r.url} search={r.search as never} onClick={() => setAberto(false)} className="flex flex-col rounded-md px-2 py-1.5 text-sm hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <span className="truncate font-medium">{r.rotulo}</span>
                <span className="text-xs text-muted-foreground">{r.tipo}</span>
              </Link>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

// "‹ Anterior · 3 de 10 · Próximo ›": percorre os registros da lista em que a ficha foi aberta, sem voltar à tabela. A lista é a que a tela mostra (filtrada e ordenada).
export function SetasEntreRegistros({ ids, atualId, onIr }: { ids: readonly string[]; atualId: string; onIr: (id: string) => void }) {
  const v = vizinhosNaLista(ids.map((id) => ({ id })), atualId);
  if (!v) return null;
  return (
    <nav aria-label="Entre os registros da lista" className="flex items-center gap-1 text-xs">
      <Button type="button" variant="outline" size="sm" className="h-7 gap-1 px-2" disabled={!v.anterior} onClick={() => v.anterior && onIr(v.anterior.id)}>
        <ChevronLeft className="size-3.5" aria-hidden="true" />Anterior
      </Button>
      <span className="px-1 tabular-nums text-muted-foreground" aria-live="polite">{v.posicao} de {v.total}</span>
      <Button type="button" variant="outline" size="sm" className="h-7 gap-1 px-2" disabled={!v.proximo} onClick={() => v.proximo && onIr(v.proximo.id)}>
        Próximo<ChevronRight className="size-3.5" aria-hidden="true" />
      </Button>
    </nav>
  );
}
