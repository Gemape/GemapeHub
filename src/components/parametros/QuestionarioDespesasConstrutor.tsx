import { ArrowDown, ArrowUp, GripHorizontal, Lock, Pencil, Plus, Trash2, X } from "lucide-react";
import { useBlocker } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { EyebrowDoCard } from "@/components/layout/EyebrowDoCard";
import { iconeDoTipo } from "@/components/modules/icones-viagens";
import { PerguntaDialog, type ModoPergunta } from "@/components/parametros/PerguntaDialog";
import { SecaoDialog, type DadosSecao } from "@/components/parametros/SecaoDialog";
import { DialogHabilitarEmpregadosViagens } from "@/components/parametros/HabilitarEmpregadosViagens";
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
  DESTINO_ENCERRAR, DESTINO_PROXIMA_SECAO, OPCAO_QUALQUER, aceitaDestinoPorOpcao, ramificacaoDaPergunta, conferirOrdem, destinoPergunta, destinosDoTipo, gravarDestino, idDoDestino, limparPendencias, pendencias, semDestinosDaOpcao,
} from "@/lib/questionario-destinos";
import { gravarSecao, inicioDaProximaSecao, secoesDoTipo } from "@/lib/questionario-secoes";
import {
  AREAS_VIAGEM, ID_HABILITADOS, ID_TECNICO_RESPONSAVEL, ID_TIPO_DESPESA, TIPOS_PERGUNTA, perguntaTravada, aceitaCondicao, criarRascunho, dadosIlegiveis, estadoPadrao, excluirPergunta, gravarEstado, gravarQuestionario, habilitadosAtivos, habilitadosDaPergunta, lerEstado, moverId,
  proximoCodigoPergunta, publicarRascunho, questionarioDoTipo, salvarPergunta, tiposDeDespesa, tiposRemovidos, type AreaViagem, type Estado, type Habilitado, type Pergunta, type Regra,
  numerosNaTela,
} from "@/lib/questionario-despesas";

// Montagem do Questionário de Despesas, dentro da mesma tela do formulário (dec 173): um questionário para cada tipo de despesa,
// montado com as perguntas cadastradas. O banco de perguntas não tem tela própria: o que sobra fora do questionário se adiciona pelo seletor.
export function QuestionarioDespesasConstrutor({ tipoInicial }: { tipoInicial?: string | undefined }) {
  const { canWrite } = useAccess();
  // Tudo que se muda fica num rascunho; só o botão Salvar Formulário grava de verdade (e Viagens passa a usar).
  const [rascunho, setRascunho] = useState(() => criarRascunho());
  const [estado, setEstado] = useState<Estado>(() => lerEstado(rascunho));
  const [alterado, setAlterado] = useState(false);
  const tipos = tiposDeDespesa(estado);
  const [tipo, setTipo] = useState(() => (tipoInicial && tipos.includes(tipoInicial) ? tipoInicial : (tipos[0] ?? "")));
  const tipoAtual = tipos.includes(tipo) ? tipo : (tipos[0] ?? "");
  const [ativo, setAtivo] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [dialogo, setDialogo] = useState<{ modo: ModoPergunta; inicial: Pergunta | null } | null>(null);
  // Janela de seção: `inicio` null = criar questionário novo (com nome); senão a seção que começa naquela pergunta.
  const [dialogoSecao, setDialogoSecao] = useState<{ inicio: string | null; inicial: DadosSecao } | null>(null);
  // Janela dos empregados habilitados (decisão 336): o link do card das perguntas de habilitados abre o preenchimento sem sair do formulário.
  const [habilitando, setHabilitando] = useState(false);
  const { data: empregados = [], isSuccess: empregadosLidos } = useEmpregados(TODAS);
  const idsAtivos = useMemo(() => new Set(empregados.filter((e) => empregadoAtivo(e)).map((e) => e.id)), [empregados]);

  const habilitadosPrevia = (p: Pergunta) => {
    const lista = habilitadosDaPergunta(estado, p);
    return lista && empregadosLidos ? habilitadosAtivos(lista, idsAtivos) : (lista ?? undefined);
  };

  const ids = questionarioDoTipo(estado, tipoAtual);
  // O número ao lado da pergunta é a posição dela na tela (01, 02, ...), não o código fixo.
  const numeros = numerosNaTela(ids, [ID_TIPO_DESPESA]);
  const numeroDe = (id: string) => numeros.get(id) ?? "";
  const porId = new Map(estado.perguntas.map((p) => [p.id, p]));
  const acoesRequeridas = pendencias(estado, tipoAtual);
  const secoes = secoesDoTipo(estado, tipoAtual);
  const abrirSecao = (inicio: string) => {
    const atual = secoes.find((x) => x.inicio === inicio);
    setDialogoSecao({ inicio, inicial: { titulo: atual?.titulo ?? "", subtitulo: atual?.subtitulo ?? "" } });
  };
  function salvarSecao(d: DadosSecao) {
    if (!dialogoSecao) return;
    const inicio = dialogoSecao.inicio;
    if (inicio === null) return;
    if (executar(() => gravarSecao(estado, tipoAtual, inicio, d, rascunho), "Seção salva.")) setDialogoSecao(null);
  }

  function executar(acao: () => Estado, mensagem?: string): boolean {
    try {
      setEstado(acao());
      setAlterado(true);
      if (mensagem) toast.success(mensagem);
      return true;
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar.");
      return false;
    }
  }
  // Salvar Formulário: publica o rascunho. Descartar volta ao que já estava salvo.
  function salvarFormulario() {
    try {
      publicarRascunho(rascunho);
      setAlterado(false);
      toast.success("Formulário salvo.");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar o formulário.");
    }
  }
  function descartar() {
    if (!confirm("Descartar as alterações que ainda não foram salvas?")) return;
    const novo = criarRascunho();
    setRascunho(novo);
    setEstado(lerEstado(novo));
    setAtivo(null);
    setAlterado(false);
  }
  // Restaurar configurações iniciais: volta as perguntas e os questionários de todos os cards ao padrão, no rascunho (só vale ao Salvar Formulário).
  function restaurarIniciais() {
    if (!confirm("Restaurar as configurações iniciais do formulário? Perguntas, opções, questionários e cards criados por você voltam ao padrão (as respostas já registradas não mudam). Nada vale até clicar em Salvar Formulário.")) return;
    if (executar(() => gravarEstado(estadoPadrao(), rascunho), "Configurações iniciais restauradas. Clique em Salvar Formulário para valer.")) setAtivo(null);
  }
  useEffect(() => {
    if (!alterado) return;
    const avisar = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [alterado]);
  // Sair para outra tela do sistema também descarta o rascunho: pergunta antes, como o aviso de fechar a aba.
  useBlocker({
    shouldBlockFn: () => !confirm("Há alterações do formulário que ainda não foram salvas. Sair e perdê-las?"),
    disabled: !alterado,
    enableBeforeUnload: false,
  });
  const gravarIds = (novos: string[]) => executar(() => { conferirOrdem(estado, tipoAtual, novos); return gravarQuestionario(estado, tipoAtual, novos, rascunho); });

  // Sobe ou desce uma pergunta (alternativa ao arrastar, para quem usa teclado); a de tipos de despesa fica de fora.
  const trocar = (lista: string[], id: string, passo: -1 | 1): string[] => {
    const de = lista.indexOf(id);
    const para = de + passo;
    if (de < 0 || para < 1 || para >= lista.length) return lista;
    const copia = [...lista];
    [copia[de], copia[para]] = [copia[para] as string, copia[de] as string];
    return copia.filter((x) => x !== ID_TIPO_DESPESA);
  };

  // Excluir uma resposta (decisão 299): sai da pergunta e leva as ramificações dela, em todos os questionários, para não sobrar ação requerida.
  function excluirOpcao(p: Pergunta, opcao: string) {
    // Condições "se/então" que dependem desta resposta somem junto (limparRegras): o aviso diz quantas perguntas passam a aparecer sempre.
    const condicoes = Object.values(estado.regras).reduce((n, porPergunta) => n + Object.values(porPergunta).filter((r) => r.origem === p.id && r.valor === opcao).length, 0);
    const aviso = condicoes ? ` ${condicoes} condição(ões) que dependem dessa resposta também serão removidas.` : "";
    if (!confirm(`Excluir a resposta "${opcao}" da pergunta ${numeroDe(p.id)}?${aviso}`)) return;
    // As ramificações saem junto, de todos os questionários (inclusive de um que já não tem a pergunta), e só se grava tudo de uma vez: se a pergunta não aceitar a
    // exclusão (ex.: era a última resposta), nada muda.
    executar(() => salvarPergunta(semDestinosDaOpcao(estado, p.id, opcao), { ...p, opcoes: p.opcoes.filter((o) => o !== opcao) }, rascunho), "Resposta excluída.");
  }
  // Ramificação de uma resposta: continuar na próxima pergunta (sem destino), ir para a próxima seção, encerrar ou ir a uma pergunta mais adiante.
  const mudarDestino = (p: Pergunta, opcao: string, valor: string) =>
    executar(() => gravarDestino(estado, tipoAtual, p.id, opcao, valor === SEM_DESTINO ? null : valor, rascunho), "Ramificação salva.");

  function excluir(p: Pergunta) {
    const usos = Object.values(estado.questionarios).filter((l) => l.includes(p.id)).length;
    if (!confirm(`Excluir a pergunta ${numeroDe(p.id)} (${p.titulo})?${usos ? ` Ela sai de ${usos} questionário${usos === 1 ? "" : "s"}.` : ""}`)) return;
    executar(() => excluirPergunta(estado, p.id, rascunho), "Pergunta excluída.");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <header>
        <EyebrowDoCard fallback="Parâmetros" />
        <h1 className="text-xl font-semibold">Configuração Formulário de Despesas</h1>
        <p className="mt-1 text-sm text-muted-foreground">Monta o formulário de despesas de viagem: escolha o tipo de despesa e defina as perguntas que o técnico responde.</p>
      </header>

      <section className="space-y-2" aria-labelledby="escolher-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="escolher-card" className="text-sm font-medium">1. Escolha o card de Viagens que terá este questionário</h2>
          {canWrite && (
            <Button variant="ghost" size="sm" onClick={() => { const q = porId.get(ID_TIPO_DESPESA); if (q) setDialogo({ modo: "editar", inicial: q }); }}><Pencil className="mr-1 h-4 w-4" />Novo questionário</Button>
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
        <p className="text-xs text-muted-foreground">Toda pergunta pode ramificar: por resposta, quando tem opções escritas, ou depois da pergunta, para qualquer resposta. A pergunta de tipos de despesa é a escolha do card acima: cada tipo tem o seu próprio questionário.</p>
      </section>

      {dadosIlegiveis() && (
        <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">
          As perguntas salvas neste navegador estão ilegíveis. A tela mostra o padrão e nada será gravado por cima; limpe os dados do site para recomeçar.
        </p>
      )}

      {acoesRequeridas.length > 0 && (
        <div role="alert" className="space-y-1 rounded-md border border-destructive p-3 text-sm text-destructive">
          <p className="font-medium">Ação requerida: o questionário "{tipoAtual}" não é publicado até corrigir as ramificações antigas abaixo.</p>
          <ul className="list-disc pl-5">
            {acoesRequeridas.map((a) => <li key={`${a.perguntaId}-${a.opcao}`}>Pergunta {numeroDe(a.perguntaId)}, opção "{a.opcao}": {a.motivo}</li>)}
          </ul>
          {canWrite && (
            <Button type="button" variant="outline" size="sm" onClick={() => executar(() => limparPendencias(estado, tipoAtual, rascunho), "Ramificações com problema removidas. Clique em Salvar Formulário para valer.")}>
              Remover as ramificações com problema
            </Button>
          )}
        </div>
      )}

      {ids.map((id) => {
        const p = porId.get(id);
        if (!p) return null;
        const fixa = id === ID_TIPO_DESPESA;
        const travada = perguntaTravada(id);
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
                  {!fixa && <Button variant="ghost" size="icon" aria-label="Remover seção" title="Remover a seção (as perguntas ficam na seção anterior)" onClick={() => executar(() => gravarSecao(estado, tipoAtual, id, null, rascunho), "Seção removida.")}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                </div>
              )}
            </div>
          )}
          {!fixa && (
          <div
            data-cartao
            role="group"
            aria-label={`Pergunta ${numeroDe(id)}: ${p.titulo}`}
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
                <span className="mr-2 text-xs text-muted-foreground">{numeroDe(id)}</span>{p.titulo}{p.obrigatoria && <span className="text-destructive"> *</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                {TIPOS_PERGUNTA.find((t) => t.valor === p.tipo)?.rotulo}{fixa ? " · pergunta inicial de todo questionário" : ""}
              </p>
              {estado.regras[tipoAtual]?.[id] && <p className="text-xs font-medium text-primary">{textoRegra(estado, estado.regras[tipoAtual][id] as Regra)}</p>}
              {!fixa && !canWrite && Object.keys(destinosDoTipo(estado, tipoAtual)[id] ?? {}).length > 0 && (
                <ul className="text-xs font-medium text-primary">
                  {Object.entries(destinosDoTipo(estado, tipoAtual)[id] ?? {}).map(([opcao, d]) => <li key={opcao}>{opcao === OPCAO_QUALQUER ? "Depois desta pergunta" : `"${opcao}"`}: {textoDestino(estado, d, numeroDe)}</li>)}
                </ul>
              )}
              {fixa ? (
                <Select value={tipoAtual} onValueChange={(v) => { if (v) { setTipo(v); setAtivo(null); } }}>
                  <SelectTrigger aria-label="Tipo de despesa" onClick={(e) => e.stopPropagation()}><SelectValue /></SelectTrigger>
                  <SelectContent>{tipos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              ) : canWrite && !travada && aceitaCondicao(p) ? (
                <OpcoesDaPergunta
                  pergunta={p}
                  destinos={destinosDoTipo(estado, tipoAtual)[id] ?? {}}
                  ramifica={ramificacaoDaPergunta(p) === "por-resposta"}
                  seguintes={ids.slice(ids.indexOf(id) + 1).filter((x) => x !== ID_TIPO_DESPESA).map((x) => ({ id: x, rotulo: `Ir para a pergunta ${numeroDe(x)} (${porId.get(x)?.titulo ?? x})` }))}
                  temProximaSecao={inicioDaProximaSecao(estado, tipoAtual, id) !== null}
                  onDestino={(opcao, valor) => mudarDestino(p, opcao, valor)}
                  onExcluir={(opcao) => excluirOpcao(p, opcao)}
                />
              ) : (
                <PerguntaPrevia pergunta={p} habilitadosVisiveis={habilitadosPrevia(p)} />
              )}
              {canWrite && !fixa && (travada || ramificacaoDaPergunta(p) === "depois-da-pergunta" || destinosDoTipo(estado, tipoAtual)[id]?.[OPCAO_QUALQUER] !== undefined) && (
                <DestinoDaPergunta
                  atual={destinosDoTipo(estado, tipoAtual)[id]?.[OPCAO_QUALQUER] ?? SEM_DESTINO}
                  seguintes={ids.slice(ids.indexOf(id) + 1).filter((x) => x !== ID_TIPO_DESPESA).map((x) => ({ id: x, rotulo: `Ir para a pergunta ${numeroDe(x)} (${porId.get(x)?.titulo ?? x})` }))}
                  temProximaSecao={inicioDaProximaSecao(estado, tipoAtual, id) !== null}
                  onDestino={(valor) => mudarDestino(p, OPCAO_QUALQUER, valor)}
                />
              )}
              {(id === ID_HABILITADOS || id === ID_TECNICO_RESPONSAVEL) && (
                <p className="text-xs text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                  Quem fica habilitado se escolhe em <button type="button" className="font-medium text-primary underline underline-offset-2" onClick={() => setHabilitando(true)}>Parâmetros &gt; Viagens &gt; Parâmetros Específicos</button>.
                </p>
              )}
              {canWrite && !fixa && !travada && aceitaCondicao(p) && (
                <AdicionarOpcao onAdicionar={(texto) => executar(() => salvarPergunta(estado, { ...p, opcoes: [...p.opcoes, texto] }, rascunho), "Opção adicionada.")} />
              )}
            </div>
            {aberto && canWrite && (
              <div className="mt-4 flex flex-wrap items-center justify-end gap-1 border-t pt-3">
                {travada ? (
                  <span className="mr-auto flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" />Pergunta travada: não precisa de edição</span>
                ) : (
                  <Button variant="ghost" size="sm" aria-label="Editar pergunta" onClick={() => setDialogo({ modo: "editar", inicial: p })}><Pencil className="mr-1 h-4 w-4" />Editar</Button>
                )}
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
                <Switch id={`obrigatoria-${id}`} checked={p.obrigatoria} disabled={travada} onCheckedChange={(v) => executar(() => salvarPergunta(estado, { ...p, obrigatoria: v }, rascunho))} />
              </div>
            )}
          </div>
          )}
          </div>
        );
      })}

      {canWrite && (
        <div>
          <button
            type="button"
            onClick={() => setDialogo({ modo: "novo", inicial: null })}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/50 bg-white/60 p-5 text-sm font-medium text-primary transition hover:border-primary hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary dark:bg-card"
          >
            <Plus className="h-5 w-5" />Adicionar ao questionário
          </button>
        </div>
      )}

      {canWrite && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <p className="mr-auto text-sm text-muted-foreground" role="status">{alterado ? "Há alterações que ainda não foram salvas." : "Tudo salvo."}</p>
          {alterado && <Button type="button" variant="ghost" onClick={descartar}>Descartar alterações</Button>}
          <Button type="button" variant="outline" disabled={dadosIlegiveis()} onClick={restaurarIniciais}>Restaurar configurações iniciais</Button>
          <Button type="button" disabled={!alterado || dadosIlegiveis()} onClick={salvarFormulario}>Salvar Formulário</Button>
        </div>
      )}

      <SecaoDialog
        aberto={dialogoSecao !== null}
        titulo="Seção"
        comNome={false}
        inicial={dialogoSecao?.inicial ?? { titulo: "", subtitulo: "" }}
        onSalvar={salvarSecao}
        onFechar={() => setDialogoSecao(null)}
      />

      <DialogHabilitarEmpregadosViagens
        aberto={habilitando}
        onAbrirMudou={setHabilitando}
        carregarDoQuestionario={() => estado.perguntas.find((q) => q.id === ID_HABILITADOS)?.habilitados ?? []}
        aoSalvar={(habilitados) => {
          // Já foi gravada de verdade; a lista do rascunho acompanha para o Salvar Formulário não desfazer o que acabou de ser salvo.
          // Se o rascunho não aceitar a pergunta, o erro não pode subir: a janela mostraria "não foi possível salvar" para algo que já foi gravado.
          try {
            const q04 = estado.perguntas.find((q) => q.id === ID_HABILITADOS);
            if (q04) setEstado(salvarPergunta(estado, { ...q04, habilitados }, rascunho));
          } catch (erro) {
            toast.error(erro instanceof Error ? `Habilitados salvos, mas o rascunho não acompanhou: ${erro.message}` : "Habilitados salvos, mas o rascunho não acompanhou.");
          }
        }}
      />

      <PerguntaDialog
        aberto={dialogo !== null}
        modo={dialogo?.modo ?? "novo"}
        inicial={dialogo?.inicial ?? null}
        estado={estado}
        codigoNovo={proximoCodigoPergunta(estado, rascunho)}
        numero={dialogo?.inicial ? numeroDe(dialogo.inicial.id) : String(numeros.size + 1).padStart(2, "0")}
        onFechar={() => setDialogo(null)}
        onSalvar={(p) => {
          const perdem = p.id === ID_TIPO_DESPESA ? tiposRemovidos(estado, p.opcoes.map((o) => o.trim())) : [];
          if (perdem.length && !confirm(`Remover ${perdem.length === 1 ? "o tipo" : "os tipos"} ${perdem.join(", ")} apaga ${perdem.length === 1 ? "o questionário dele" : "os questionários deles"}. Continuar?`)) return;
          const nova = dialogo?.modo === "novo" && p.id !== ID_TIPO_DESPESA;
          const gravar = () => {
            const salvo = salvarPergunta(estado, p, rascunho);
            if (!nova) return salvo;
            const atuais = questionarioDoTipo(salvo, tipoAtual).filter((x) => x !== ID_TIPO_DESPESA);
            return gravarQuestionario(salvo, tipoAtual, [...atuais, p.id], rascunho);
          };
          if (executar(gravar, nova ? "Pergunta criada e adicionada ao questionário." : "Pergunta salva.")) setDialogo(null);
        }}
      />
    </div>
  );
}

const textoDestino = (e: Estado, destino: string, numeroDe: (id: string) => string): string => {
  if (destino === DESTINO_ENCERRAR) return "encerra o formulário";
  if (destino === DESTINO_PROXIMA_SECAO) return "vai para a próxima seção";
  const alvo = idDoDestino(destino);
  const p = e.perguntas.find((x) => x.id === alvo);
  return p ? `vai para a pergunta ${numeroDe(p.id) || p.codigo} (${p.titulo})` : "pergunta removida (ação requerida)";
};

const textoRegra = (e: Estado, r: Regra): string => {
  const origem = e.perguntas.find((p) => p.id === r.origem);
  return `Aparece só se "${origem?.titulo ?? "?"}" ${r.operador === "igual" ? "for" : "não for"} "${r.valor}"`;
};

const SEM_DESTINO = "__proxima";

// Todas as respostas da pergunta (decisão 299), como no editor de formulários: cada uma com o seu destino (continuar, próxima seção, encerrar ou uma pergunta mais
// adiante) e o botão de excluir. Pergunta que aceita mais de uma resposta não ramifica: só mostra as respostas e o excluir.
function OpcoesDaPergunta({ pergunta, destinos, ramifica, seguintes, temProximaSecao, onDestino, onExcluir }: {
  pergunta: Pergunta;
  destinos: Record<string, string>;
  ramifica: boolean;
  seguintes: { id: string; rotulo: string }[];
  temProximaSecao: boolean;
  onDestino: (opcao: string, valor: string) => boolean;
  onExcluir: (opcao: string) => void;
}) {
  const marcador = pergunta.tipo === "caixas" ? "☐" : pergunta.tipo === "lista" ? "▾" : "○";
  return (
    <ul className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
      {pergunta.opcoes.length === 0 && <li className="text-sm text-muted-foreground">Nenhuma resposta cadastrada ainda.</li>}
      {pergunta.opcoes.map((opcao) => {
        const atual = destinos[opcao] ?? SEM_DESTINO;
        return (
          <li key={opcao} className="flex flex-wrap items-center gap-2 text-sm">
            <span aria-hidden="true" className="w-4 text-center text-muted-foreground">{marcador}</span>
            <span className="min-w-0 flex-1 break-words">{opcao}</span>
            {ramifica && (
              <Select value={atual} onValueChange={(v) => { if (v) onDestino(opcao, v); }}>
                <SelectTrigger aria-label={`Ramificação da resposta ${opcao}`} className="h-8 w-full sm:w-72"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <ItensDeDestino atual={atual} seguintes={seguintes} temProximaSecao={temProximaSecao} />
                </SelectContent>
              </Select>
            )}
            <Button type="button" variant="ghost" size="icon" aria-label={`Excluir a resposta ${opcao}`} title="Excluir esta resposta" onClick={() => onExcluir(opcao)}>
              <X className="h-4 w-4" />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

// As escolhas de destino de uma ramificação (por resposta ou para qualquer resposta), com o destino órfão (pergunta que saiu do questionário ou seção que não existe mais) visível.
function ItensDeDestino({ atual, seguintes, temProximaSecao }: { atual: string; seguintes: { id: string; rotulo: string }[]; temProximaSecao: boolean }) {
  const alvo = idDoDestino(atual);
  const orfao = alvo !== null ? !seguintes.some((x) => x.id === alvo) : atual === DESTINO_PROXIMA_SECAO && !temProximaSecao;
  return (
    <>
      <SelectItem value={SEM_DESTINO}>Continuar para a próxima pergunta</SelectItem>
      {temProximaSecao && <SelectItem value={DESTINO_PROXIMA_SECAO}>Ir para a próxima seção</SelectItem>}
      <SelectItem value={DESTINO_ENCERRAR}>Encerrar o formulário</SelectItem>
      {seguintes.map((x) => <SelectItem key={x.id} value={destinoPergunta(x.id)}>{x.rotulo}</SelectItem>)}
      {orfao && <SelectItem value={atual} disabled>{alvo !== null ? "Pergunta que saiu do questionário (ação requerida)" : "Próxima seção que não existe mais (ação requerida)"}</SelectItem>}
    </>
  );
}

// Ramificação das perguntas que não ramificam por resposta (texto, data, hora, valor, imagem, listas de clientes, municípios ou empregados e as de várias marcações):
// o destino vale depois da pergunta, seja qual for a resposta (decisão 311).
function DestinoDaPergunta({ atual, seguintes, temProximaSecao, onDestino }: { atual: string; seguintes: { id: string; rotulo: string }[]; temProximaSecao: boolean; onDestino: (valor: string) => boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm" onClick={(e) => e.stopPropagation()}>
      <span className="text-xs font-medium text-muted-foreground">Depois desta pergunta</span>
      <Select value={atual} onValueChange={(v) => { if (v) onDestino(v); }}>
        <SelectTrigger aria-label="Ramificação depois desta pergunta" className="h-8 w-full sm:w-72"><SelectValue /></SelectTrigger>
        <SelectContent>
          <ItensDeDestino atual={atual} seguintes={seguintes} temProximaSecao={temProximaSecao} />
        </SelectContent>
      </Select>
    </div>
  );
}

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
