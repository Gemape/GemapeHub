import { ArrowDown, ArrowUp, Copy, GripHorizontal, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AcoesLinha } from "@/components/parametros/AcoesLinha";
import { PerguntaDialog, type ModoPergunta } from "@/components/parametros/PerguntaDialog";
import { PerguntaPrevia } from "@/components/parametros/PerguntaPrevia";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAccess } from "@/lib/access-context";
import { TODAS } from "@/lib/empresa-context";
import { empregadoAtivo } from "@/lib/empregados";
import { useEmpregados } from "@/lib/hooks-gemape";
import {
  ID_TIPO_DESPESA, TIPOS_PERGUNTA, aceitaCondicao, clonarPergunta, dadosIlegiveis, excluirPergunta, gravarQuestionario, gravarRegra, habilitadosAtivos, lerEstado, moverId,
  proximoCodigoPergunta, questionarioDoTipo, salvarPergunta, tiposDeDespesa, tiposRemovidos, type Estado, type Pergunta, type Regra,
} from "@/lib/questionario-despesas";

// Parâmetros > Veículos > Questionário de Despesas: um questionário para cada tipo de despesa, montado com perguntas do banco.
export function QuestionarioDespesasConstrutor() {
  const { canWrite } = useAccess();
  const [estado, setEstado] = useState<Estado>(lerEstado);
  const tipos = tiposDeDespesa(estado);
  const [tipo, setTipo] = useState(() => tipos[0] ?? "");
  const tipoAtual = tipos.includes(tipo) ? tipo : (tipos[0] ?? "");
  const [ativo, setAtivo] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [dialogo, setDialogo] = useState<{ modo: ModoPergunta; inicial: Pergunta | null } | null>(null);
  const { data: empregados = [], isSuccess: empregadosLidos } = useEmpregados(TODAS);
  const idsAtivos = useMemo(() => new Set(empregados.filter((e) => empregadoAtivo(e)).map((e) => e.id)), [empregados]);

  const ids = questionarioDoTipo(estado, tipoAtual);
  const porId = new Map(estado.perguntas.map((p) => [p.id, p]));
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
  const gravarIds = (novos: string[]) => executar(() => gravarQuestionario(estado, tipoAtual, novos));

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
        <h1 className="text-xl font-semibold">Questionário de Despesas</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link to="/questionario-despesas" search={{ tipo: tipoAtual }}><Play className="mr-1 h-4 w-4" />Abrir formulário</Link></Button>
          {canWrite && (
            <Button onClick={() => setDialogo({ modo: "novo", inicial: null })}><Plus className="mr-1 h-4 w-4" />Cadastrar pergunta</Button>
          )}
        </div>
      </div>

      {dadosIlegiveis() && (
        <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">
          As perguntas salvas neste navegador estão ilegíveis. A tela mostra o padrão e nada será gravado por cima; limpe os dados do site para recomeçar.
        </p>
      )}

      <div className="space-y-2 rounded-lg border-t-8 border-primary bg-white p-4 shadow-sm dark:bg-card">
        <Label htmlFor="tipo-despesa">Questionário do tipo de despesa</Label>
        <Select value={tipoAtual} onValueChange={(v) => { setTipo(v); setAtivo(null); }}>
          <SelectTrigger id="tipo-despesa" aria-label="Tipo de despesa"><SelectValue /></SelectTrigger>
          <SelectContent>{tipos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Todo questionário começa pela pergunta de tipos de despesa. Arraste pela alça ⋮⋮ para reordenar as demais.
        </p>
      </div>

      {ids.map((id) => {
        const p = porId.get(id);
        if (!p) return null;
        const fixa = id === ID_TIPO_DESPESA;
        const aberto = ativo === id;
        return (
          <div
            key={id}
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
              <PerguntaPrevia pergunta={p} habilitadosVisiveis={p.habilitados && empregadosLidos ? habilitadosAtivos(p.habilitados, idsAtivos) : undefined} />
            </div>
            {aberto && canWrite && !fixa && (
              <CondicaoPergunta
                estado={estado}
                ids={ids}
                id={id}
                regra={estado.regras[tipoAtual]?.[id] ?? null}
                onMudar={(r) => executar(() => gravarRegra(estado, tipoAtual, id, r))}
              />
            )}
            {aberto && canWrite && (
              <div className="mt-4 flex items-center justify-end gap-1 border-t pt-3">
                <Button variant="ghost" size="icon" aria-label="Editar pergunta" onClick={() => setDialogo({ modo: "editar", inicial: p })}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" aria-label="Clonar pergunta" onClick={() => setDialogo({ modo: "clonar", inicial: clonarPergunta(estado, p.id) })}><Copy className="h-4 w-4" /></Button>
                {!fixa && (
                  <>
                    <Button variant="ghost" size="icon" aria-label="Mover para cima" disabled={ids.indexOf(id) <= 1} onClick={() => gravarIds(trocar(ids, id, -1))}><ArrowUp className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" aria-label="Mover para baixo" disabled={ids.indexOf(id) === ids.length - 1} onClick={() => gravarIds(trocar(ids, id, 1))}><ArrowDown className="h-4 w-4" /></Button>
                  </>
                )}
                {!fixa && (
                  <Button variant="ghost" size="icon" aria-label="Remover do questionário" title="Remover deste questionário" onClick={() => gravarIds(ids.filter((x) => x !== id && x !== ID_TIPO_DESPESA))}><Trash2 className="h-4 w-4" /></Button>
                )}
                <div className="mx-2 h-6 w-px bg-border" />
                <Label htmlFor={`obrigatoria-${id}`} className="text-sm">Obrigatória</Label>
                <Switch id={`obrigatoria-${id}`} checked={p.obrigatoria} onCheckedChange={(v) => executar(() => salvarPergunta(estado, { ...p, obrigatoria: v }))} />
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

      <div className="space-y-2 pt-4">
        <h2 className="text-lg font-semibold">Banco de perguntas</h2>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Nº</TableHead><TableHead>Título</TableHead><TableHead>Tipo</TableHead><TableHead>Obrigatória</TableHead><TableHead /></TableRow>
          </TableHeader>
          <TableBody>
            {estado.perguntas.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.codigo}</TableCell>
                <TableCell>{p.titulo}</TableCell>
                <TableCell>{TIPOS_PERGUNTA.find((t) => t.valor === p.tipo)?.rotulo}</TableCell>
                <TableCell>{p.obrigatoria ? "Sim" : "Não"}</TableCell>
                <TableCell>
                  <AcoesLinha
                    rotulo={`pergunta ${p.codigo}`}
                    onClonar={() => setDialogo({ modo: "clonar", inicial: clonarPergunta(estado, p.id) })}
                    onEditar={() => setDialogo({ modo: "editar", inicial: p })}
                    {...(p.sistema ? {} : { onExcluir: () => excluir(p) })}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
