import { ArrowDown, ArrowUp, GripHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { iconeDoTipo } from "@/components/modules/icones-viagens";
import { PerguntaDialog, type ModoPergunta } from "@/components/parametros/PerguntaDialog";
import { SecaoDialog, type DadosSecao } from "@/components/parametros/SecaoDialog";
import { PerguntaPrevia } from "@/components/parametros/PerguntaPrevia";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAccess } from "@/lib/access-context";
import { TODAS } from "@/lib/empresa-context";
import { empregadoAtivo } from "@/lib/empregados";
import { useEmpregados } from "@/lib/hooks-gemape";
import {
  DESTINO_ENCERRAR, DESTINO_PROXIMA_SECAO, aceitaDestino, conferirOrdem, destinoPergunta, destinosDoTipo, gravarDestino, idDoDestino, pendencias,
} from "@/lib/questionario-destinos";
import { criarQuestionario, gravarSecao, secoesDoTipo } from "@/lib/questionario-secoes";
import {
  ID_TIPO_DESPESA, TIPOS_PERGUNTA, aceitaCondicao, dadosIlegiveis, excluirPergunta, gravarQuestionario, gravarRegra, habilitadosAtivos, habilitadosDaPergunta, lerEstado, moverId,
  proximoCodigoPergunta, questionarioDoTipo, salvarPergunta, tiposDeDespesa, tiposRemovidos, type Estado, type Pergunta, type Regra,
} from "@/lib/questionario-despesas";

// Montagem do Questionário de Despesas, dentro da mesma tela do formulário (dec 173): um questionário para cada tipo de despesa,
// montado com as perguntas cadastradas. O banco de perguntas não tem tela própria: o que sobra fora do questionário se adiciona pelo seletor.
export function QuestionarioDespesasConstrutor({ tipoInicial }: { tipoInicial?: string | undefined }) {
  const { canWrite } = useAccess();
  const [estado, setEstado] = useState<Estado>(lerEstado);
  const tipos = tiposDeDespesa(estado);
  const [tipo, setTipo] = useState(() => (tipoInicial && tipos.includes(tipoInicial) ? tipoInicial : (tipos[0] ?? "")));
  const tipoAtual = tipos.includes(tipo) ? tipo : (tipos[0] ?? "");
  const [ativo, setAtivo] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [dialogo, setDialogo] = useState<{ modo: ModoPergunta; inicial: Pergunta | null } | null>(null);
  // Janela de seção: `inicio` null = criar questionário novo (com nome); senão a seção que começa naquela pergunta.
  const [dialogoSecao, setDialogoSecao] = useState<{ inicio: string | null; inicial: DadosSecao } | null>(null);
  const { data: empregados = [], isSuccess: empregadosLidos } = useEmpregados(TODAS);
  const idsAtivos = useMemo(() => new Set(empregados.filter((e) => empregadoAtivo(e)).map((e) => e.id)), [empregados]);

  const habilitadosPrevia = (p: Pergunta) => {
    const lista = habilitadosDaPergunta(estado, p);
    return lista && empregadosLidos ? habilitadosAtivos(lista, idsAtivos) : (lista ?? undefined);
  };

  const ids = questionarioDoTipo(estado, tipoAtual);
  const porId = new Map(estado.perguntas.map((p) => [p.id, p]));
  const acoesRequeridas = pendencias(estado, tipoAtual);
  const secoes = secoesDoTipo(estado, tipoAtual);
  const abrirSecao = (inicio: string) => {
    const atual = secoes.find((x) => x.inicio === inicio);
    setDialogoSecao({ inicio, inicial: { titulo: atual?.titulo ?? "", subtitulo: atual?.subtitulo ?? "" } });
  };
  function salvarSecao(d: DadosSecao) {
    if (!dialogoSecao) return;
    if (dialogoSecao.inicio === null) {
      const nome = d.nome ?? "";
      if (executar(() => criarQuestionario(estado, nome, d), "Questionário criado.")) { setTipo(nome.trim()); setAtivo(null); setDialogoSecao(null); }
      return;
    }
    const inicio = dialogoSecao.inicio;
    if (executar(() => gravarSecao(estado, tipoAtual, inicio, d), "Seção salva.")) setDialogoSecao(null);
  }
  const foraDoQuestionario = estado.perguntas.filter((p) => !ids.includes(p.id));

  function executar(acao: () => Estado, mensagem?: string): boolean {
    try {
      setEstado(acao());
      if (mensagem) toast.success(mensagem);
      return true;
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar.");
      return false;
    }
  }
  const gravarIds = (novos: string[]) => executar(() => { conferirOrdem(estado, tipoAtual, novos); return gravarQuestionario(estado, tipoAtual, novos); });

  // Sobe ou desce uma pergunta (alternativa ao arrastar, para quem usa teclado); a de tipos de despesa fica de fora.
  const trocar = (lista: string[], id: string, passo: -1 | 1): string[] => {
    const de = lista.indexOf(id);
    const para = de + passo;
    if (de < 0 || para < 1 || para >= lista.length) return lista;
    const copia = [...lista];
    [copia[de], copia[para]] = [copia[para] as string, copia[de] as string];
    return copia.filter((x) => x !== ID_TIPO_DESPESA);
  };

  function excluir(p: Pergunta) {
    const usos = Object.values(estado.questionarios).filter((l) => l.includes(p.id)).length;
    if (!confirm(`Excluir a pergunta ${p.codigo} (${p.titulo})?${usos ? ` Ela sai de ${usos} questionário${usos === 1 ? "" : "s"}.` : ""}`)) return;
    executar(() => excluirPergunta(estado, p.id), "Pergunta excluída.");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Configuração Formulário de Despesas</h1>
        <div className="flex flex-wrap gap-2">
          {canWrite && (
            <Button variant="outline" onClick={() => setDialogoSecao({ inicio: null, inicial: { nome: "", titulo: "", subtitulo: "" } })}><Plus className="mr-1 h-4 w-4" />Criar novo questionário</Button>
          )}
          {canWrite && (
            <Button onClick={() => setDialogo({ modo: "novo", inicial: null })}><Plus className="mr-1 h-4 w-4" />Cadastrar pergunta</Button>
          )}
        </div>
      </div>

      <section className="space-y-2" aria-labelledby="escolher-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="escolher-card" className="text-sm font-medium">1. Escolha o card de Viagens que terá este questionário</h2>
          {canWrite && (
            <Button variant="ghost" size="sm" onClick={() => { const q = porId.get(ID_TIPO_DESPESA); if (q) setDialogo({ modo: "editar", inicial: q }); }}><Pencil className="mr-1 h-4 w-4" />Editar cards</Button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {tipos.map((t) => {
            const Icone = iconeDoTipo(t);
            const escolhido = t === tipoAtual;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={escolhido}
                onClick={() => { setTipo(t); setAtivo(null); }}
                className={`panel flex min-h-20 flex-col items-center justify-center gap-1 p-2 text-center text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${escolhido ? "ring-2 ring-primary" : "opacity-80 hover:opacity-100"}`}
              >
                <Icone className="h-6 w-6 text-primary" aria-hidden="true" />
                <span className="break-words">{t}</span>
              </button>
            );
          })}
        </div>
        <h2 className="pt-2 text-sm font-medium">2. Monte as perguntas de "{tipoAtual}"</h2>
      </section>

      {dadosIlegiveis() && (
        <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">
          As perguntas salvas neste navegador estão ilegíveis. A tela mostra o padrão e nada será gravado por cima; limpe os dados do site para recomeçar.
        </p>
      )}

      {acoesRequeridas.length > 0 && (
        <div role="alert" className="space-y-1 rounded-md border border-destructive p-3 text-sm text-destructive">
          <p className="font-medium">Ação requerida: o questionário "{tipoAtual}" não é publicado até corrigir as ramificações abaixo.</p>
          <ul className="list-disc pl-5">
            {acoesRequeridas.map((a) => <li key={`${a.perguntaId}-${a.opcao}`}>Pergunta {porId.get(a.perguntaId)?.codigo}, opção "{a.opcao}": {a.motivo}</li>)}
          </ul>
        </div>
      )}

      {ids.map((id) => {
        const p = porId.get(id);
        if (!p) return null;
        const fixa = id === ID_TIPO_DESPESA;
        const aberto = ativo === id;
        const secaoAqui = secoes.find((x) => x.inicio === id);
        return (
          <div key={id} className="space-y-4">
          {secaoAqui && (
            <div className="flex items-start justify-between gap-2 rounded-lg border-l-8 border-l-primary bg-primary/5 p-4" data-secao>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Seção {secoes.indexOf(secaoAqui) + 1} · nova página</p>
                <p className={secaoAqui.titulo ? "text-lg font-semibold" : "text-sm italic text-muted-foreground"}>{secaoAqui.titulo || "Sem título (seção oculta)"}</p>
                {secaoAqui.subtitulo && <p className="text-sm text-muted-foreground">{secaoAqui.subtitulo}</p>}
              </div>
              {canWrite && (
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" aria-label="Editar seção" onClick={() => abrirSecao(id)}><Pencil className="h-4 w-4" /></Button>
                  {!fixa && <Button variant="ghost" size="icon" aria-label="Remover seção" title="Remover a seção (as perguntas ficam na seção anterior)" onClick={() => executar(() => gravarSecao(estado, tipoAtual, id, null), "Seção removida.")}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                </div>
              )}
            </div>
          )}
          {!fixa && (
          <div
            data-cartao
            role="group"
            aria-label={`Pergunta ${p.codigo}: ${p.titulo}`}
            tabIndex={0}
            onClick={() => setAtivo(id)}
            onFocus={() => setAtivo(id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); if (arrastando) gravarIds(moverId(ids, arrastando, id).filter((x) => x !== ID_TIPO_DESPESA)); setArrastando(null); }}
            className={`rounded-lg border-l-8 bg-white p-4 transition-all duration-200 dark:bg-card ${aberto ? "border-l-primary shadow-lg" : "border-l-transparent shadow-sm"}`}
          >
            {canWrite && !fixa && (
              <div
                draggable
                role="img"
                aria-label="Arrastar para reordenar"
                title="Arrastar para reordenar"
                onDragStart={(e) => {
                  const cartao = e.currentTarget.closest("[data-cartao]");
                  if (cartao) e.dataTransfer.setDragImage(cartao, 16, 16);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", id);
                  setArrastando(id);
                }}
                onDragEnd={() => setArrastando(null)}
                className="mx-auto mb-2 flex w-12 cursor-grab justify-center text-muted-foreground"
              ><GripHorizontal className="h-4 w-4" /></div>
            )}
            <div className="space-y-2">
              <p className="font-medium">
                <span className="mr-2 text-xs text-muted-foreground">{p.codigo}</span>{p.titulo}{p.obrigatoria && <span className="text-destructive"> *</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                {TIPOS_PERGUNTA.find((t) => t.valor === p.tipo)?.rotulo}{fixa ? " · pergunta inicial de todo questionário" : ""}
              </p>
              {estado.regras[tipoAtual]?.[id] && <p className="text-xs font-medium text-primary">{textoRegra(estado, estado.regras[tipoAtual][id] as Regra)}</p>}
              {!fixa && aceitaDestino(p) && Object.keys(destinosDoTipo(estado, tipoAtual)[id] ?? {}).length > 0 && (
                <ul className="text-xs font-medium text-primary">
                  {Object.entries(destinosDoTipo(estado, tipoAtual)[id] ?? {}).map(([opcao, d]) => <li key={opcao}>"{opcao}": {textoDestino(estado, d)}</li>)}
                </ul>
              )}
              {fixa ? (
                <Select value={tipoAtual} onValueChange={(v) => { if (v) { setTipo(v); setAtivo(null); } }}>
                  <SelectTrigger aria-label="Tipo de despesa" onClick={(e) => e.stopPropagation()}><SelectValue /></SelectTrigger>
                  <SelectContent>{tipos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <PerguntaPrevia pergunta={p} habilitadosVisiveis={habilitadosPrevia(p)} />
              )}
              {canWrite && !fixa && aceitaCondicao(p) && (
                <AdicionarOpcao onAdicionar={(texto) => executar(() => salvarPergunta(estado, { ...p, opcoes: [...p.opcoes, texto] }), "Opção adicionada.")} />
              )}
            </div>
            {aberto && canWrite && !fixa && (
              <details className="mt-4 border-t pt-3" open={temAvancado(estado, tipoAtual, p, id) || undefined} onClick={(e) => e.stopPropagation()}>
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground">Opções avançadas (ramificação e condição)</summary>
                {aceitaDestino(p) && (
                  <RamificacaoPergunta
                    estado={estado}
                    ids={ids}
                    pergunta={p}
                    destinos={destinosDoTipo(estado, tipoAtual)[id] ?? {}}
                    onMudar={(opcao, d) => executar(() => gravarDestino(estado, tipoAtual, id, opcao, d))}
                  />
                )}
                <CondicaoPergunta
                  estado={estado}
                  ids={ids}
                  id={id}
                  regra={estado.regras[tipoAtual]?.[id] ?? null}
                  onMudar={(r) => executar(() => gravarRegra(estado, tipoAtual, id, r))}
                />
              </details>
            )}
            {aberto && canWrite && (
              <div className="mt-4 flex flex-wrap items-center justify-end gap-1 border-t pt-3">
                <Button variant="ghost" size="sm" aria-label="Editar pergunta" onClick={() => setDialogo({ modo: "editar", inicial: p })}><Pencil className="mr-1 h-4 w-4" />Editar</Button>
                {!fixa && (
                  <>
                    <Button variant="ghost" size="icon" aria-label="Mover para cima" disabled={ids.indexOf(id) <= 1} onClick={() => gravarIds(trocar(ids, id, -1))}><ArrowUp className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" aria-label="Mover para baixo" disabled={ids.indexOf(id) === ids.length - 1} onClick={() => gravarIds(trocar(ids, id, 1))}><ArrowDown className="h-4 w-4" /></Button>
                  </>
                )}
                {/* Lixeira: exclui a pergunta; as de sistema não se excluem, então a lixeira só as tira deste questionário. */}
                {!fixa && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Excluir pergunta"
                    title={p.sistema ? "Tirar a pergunta deste questionário" : "Excluir a pergunta de todos os questionários"}
                    onClick={() => (p.sistema ? gravarIds(ids.filter((x) => x !== id && x !== ID_TIPO_DESPESA)) : excluir(p))}
                  ><Trash2 className="h-4 w-4 text-destructive" /></Button>
                )}
                <div className="mx-2 h-6 w-px bg-border" />
                <Label htmlFor={`obrigatoria-${id}`} className="text-sm">Obrigatória</Label>
                <Switch id={`obrigatoria-${id}`} checked={p.obrigatoria} onCheckedChange={(v) => executar(() => salvarPergunta(estado, { ...p, obrigatoria: v }))} />
              </div>
            )}
          </div>
          )}
          </div>
        );
      })}

      {canWrite && foraDoQuestionario.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor="adicionar-pergunta">Adicionar a este questionário</Label>
          <Select value="" onValueChange={(v) => gravarIds([...ids.filter((x) => x !== ID_TIPO_DESPESA), v])}>
            <SelectTrigger id="adicionar-pergunta" aria-label="Adicionar pergunta do banco" className="w-72"><SelectValue placeholder="Escolha uma pergunta do banco" /></SelectTrigger>
            <SelectContent>{foraDoQuestionario.map((p) => <SelectItem key={p.id} value={p.id}>{p.codigo} · {p.titulo}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}

      <SecaoDialog
        aberto={dialogoSecao !== null}
        titulo={dialogoSecao?.inicio === null ? "Criar novo questionário" : "Seção"}
        comNome={dialogoSecao?.inicio === null}
        inicial={dialogoSecao?.inicial ?? { titulo: "", subtitulo: "" }}
        onSalvar={salvarSecao}
        onFechar={() => setDialogoSecao(null)}
      />

      <PerguntaDialog
        aberto={dialogo !== null}
        modo={dialogo?.modo ?? "novo"}
        inicial={dialogo?.inicial ?? null}
        estado={estado}
        codigoNovo={proximoCodigoPergunta(estado)}
        onFechar={() => setDialogo(null)}
        onSalvar={(p) => {
          const perdem = p.id === ID_TIPO_DESPESA ? tiposRemovidos(estado, p.opcoes.map((o) => o.trim())) : [];
          if (perdem.length && !confirm(`Remover ${perdem.length === 1 ? "o tipo" : "os tipos"} ${perdem.join(", ")} apaga ${perdem.length === 1 ? "o questionário dele" : "os questionários deles"}. Continuar?`)) return;
          if (executar(() => salvarPergunta(estado, p), "Pergunta salva.")) setDialogo(null);
        }}
      />
    </div>
  );
}

const textoDestino = (e: Estado, destino: string): string => {
  if (destino === DESTINO_ENCERRAR) return "encerra o formulário";
  if (destino === DESTINO_PROXIMA_SECAO) return "vai para a próxima seção";
  const alvo = idDoDestino(destino);
  const p = e.perguntas.find((x) => x.id === alvo);
  return p ? `vai para a pergunta ${p.codigo} (${p.titulo})` : "pergunta removida (ação requerida)";
};

// Ramificação: para cada opção, a próxima pergunta, encerrar o formulário ou ir direto a outra pergunta do questionário.
function RamificacaoPergunta({
  estado, ids, pergunta, destinos, onMudar,
}: {
  estado: Estado;
  ids: string[];
  pergunta: Pergunta;
  destinos: Record<string, string>;
  onMudar: (opcao: string, destino: string | null) => void;
}) {
  const alvos = ids.filter((x) => x !== ID_TIPO_DESPESA && x !== pergunta.id).map((x) => estado.perguntas.find((p) => p.id === x)).filter((p): p is Pergunta => !!p);
  return (
    <div className="mt-4 space-y-2 border-t pt-3" onClick={(e) => e.stopPropagation()}>
      <p className="text-sm font-medium">Depois de responder, ir para...</p>
      {pergunta.opcoes.map((opcao) => {
        const atual = destinos[opcao] ?? "proxima";
        const alvoAtual = idDoDestino(atual);
        const removida = alvoAtual !== null && !alvos.some((p) => p.id === alvoAtual);
        return (
          <div key={opcao} className="flex flex-wrap items-center gap-2">
            <span className="w-48 truncate text-sm" title={opcao}>{opcao}</span>
            <Select value={atual} onValueChange={(v) => { if (v) onMudar(opcao, v === "proxima" ? null : v); }}>
              <SelectTrigger aria-label={`Destino da opção ${opcao}`} className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="proxima">Segue para a próxima pergunta</SelectItem>
                <SelectItem value={DESTINO_PROXIMA_SECAO}>Ir para a próxima seção</SelectItem>
                <SelectItem value={DESTINO_ENCERRAR}>Encerrar formulário</SelectItem>
                {removida && <SelectItem value={atual}>Pergunta removida (ação requerida)</SelectItem>}
                {alvos.map((p) => <SelectItem key={p.id} value={destinoPergunta(p.id)}>Ir para {p.codigo} · {p.titulo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        );
      })}
    </div>
  );
}

const textoRegra = (e: Estado, r: Regra): string => {
  const origem = e.perguntas.find((p) => p.id === r.origem);
  return `Aparece só se "${origem?.titulo ?? "?"}" ${r.operador === "igual" ? "for" : "não for"} "${r.valor}"`;
};

// Se/então: a pergunta só aparece quando a resposta de uma pergunta anterior (com opções escritas) for ou não for um valor.
function CondicaoPergunta({
  estado, ids, id, regra, onMudar,
}: {
  estado: Estado;
  ids: string[];
  id: string;
  regra: Regra | null;
  onMudar: (r: Regra | null) => void;
}) {
  const anteriores = ids.slice(0, ids.indexOf(id)).map((x) => estado.perguntas.find((p) => p.id === x)).filter((p): p is Pergunta => !!p && aceitaCondicao(p));
  if (anteriores.length === 0 && !regra) return null;
  const origem = anteriores.find((p) => p.id === regra?.origem);
  return (
    <div className="mt-4 space-y-2 border-t pt-3" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2">
        <Switch
          id={`condicao-${id}`}
          checked={regra !== null}
          onCheckedChange={(v) => {
            const primeira = anteriores[0];
            onMudar(v && primeira ? { origem: primeira.id, operador: "igual", valor: primeira.opcoes[0] ?? "" } : null);
          }}
        />
        <Label htmlFor={`condicao-${id}`} className="text-sm">Mostrar esta pergunta só se...</Label>
      </div>
      {regra && (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={regra.origem} onValueChange={(v) => { const o = anteriores.find((p) => p.id === v); onMudar({ origem: v, operador: regra.operador, valor: o?.opcoes[0] ?? "" }); }}>
            <SelectTrigger aria-label="Pergunta de origem" className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>{anteriores.map((p) => <SelectItem key={p.id} value={p.id}>{p.codigo} · {p.titulo}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={regra.operador} onValueChange={(v) => onMudar({ ...regra, operador: v as Regra["operador"] })}>
            <SelectTrigger aria-label="Operador" className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="igual">for</SelectItem><SelectItem value="diferente">não for</SelectItem></SelectContent>
          </Select>
          <Select value={regra.valor} onValueChange={(v) => onMudar({ ...regra, valor: v })}>
            <SelectTrigger aria-label="Valor" className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>{(origem?.opcoes ?? []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

// A ramificação e a condição ficam recolhidas; abrem sozinhas quando a pergunta já tem alguma configurada.
const temAvancado = (e: Estado, tipo: string, p: Pergunta, id: string): boolean =>
  Boolean(e.regras[tipo]?.[id]) || (aceitaDestino(p) && Object.keys(destinosDoTipo(e, tipo)[id] ?? {}).length > 0);

// Adicionar opção direto no card da pergunta: abre um campo, Enter ou Adicionar grava e fecha.
function AdicionarOpcao({ onAdicionar }: { onAdicionar: (texto: string) => boolean }) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const fechar = () => { setAberto(false); setTexto(""); };
  const confirmar = () => { const limpo = texto.trim(); if (limpo && onAdicionar(limpo)) fechar(); };
  if (!aberto) {
    return <Button type="button" variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setAberto(true); }}><Plus className="mr-1 h-4 w-4" />Adicionar opção</Button>;
  }
  return (
    <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <Input
        autoFocus
        capitalizar="texto"
        aria-label="Nova opção"
        placeholder="Nome da nova opção"
        className="w-64"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmar(); } else if (e.key === "Escape") fechar(); }}
      />
      <Button type="button" size="sm" disabled={!texto.trim()} onClick={confirmar}>Adicionar</Button>
      <Button type="button" variant="ghost" size="sm" onClick={fechar}>Cancelar</Button>
    </div>
  );
}
