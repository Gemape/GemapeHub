import { Copy, GripHorizontal, MoreVertical, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAccess } from "@/lib/access-context";
import {
  atualizarPergunta, duplicarPergunta, excluirPergunta, lerQuestionario, moverPergunta, mudarTipo, novaPergunta,
  salvarQuestionario, TIPOS_COM_OPCOES, TIPOS_PERGUNTA, validarQuestionario,
  type Pergunta, type Questionario, type TipoPergunta,
} from "@/lib/questionario-despesas";

// Parâmetros > Veículos > Questionário de Despesas: lista vertical de cards. Clicar abre o card para editar.
export function QuestionarioDespesasConstrutor() {
  const { canWrite } = useAccess();
  const [salvo, setSalvo] = useState<Questionario>(lerQuestionario);
  const [rascunho, setRascunho] = useState<Questionario>(salvo);
  const [ativo, setAtivo] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const alterado = JSON.stringify(rascunho) !== JSON.stringify(salvo);

  const mudar = (perguntas: Pergunta[]) => setRascunho({ ...rascunho, perguntas });

  function adicionar() {
    const nova = novaPergunta();
    mudar([...rascunho.perguntas, nova]);
    setAtivo(nova.id);
  }

  function gravar() {
    try {
      const gravado = salvarQuestionario(rascunho);
      setSalvo(gravado);
      setRascunho(gravado);
      toast.success("Questionário salvo.");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar o questionário.");
    }
  }

  const problemas = validarQuestionario(rascunho);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Questionário de Despesas</h1>
        {canWrite && (
          <div className="flex gap-2">
            <Button variant="outline" disabled={!alterado} onClick={() => { setRascunho(salvo); setAtivo(null); }}>Descartar alterações</Button>
            <Button disabled={!alterado} onClick={gravar}>Salvar questionário</Button>
          </div>
        )}
      </div>

      <div className="space-y-1 rounded-lg border-t-8 border-primary bg-white p-4 shadow-sm dark:bg-card">
        <Label htmlFor="titulo-questionario" className="sr-only">Título do questionário</Label>
        <Input
          id="titulo-questionario"
          name="titulo-questionario"
          capitalizar="texto"
          className="h-auto border-0 border-b border-transparent px-0 text-2xl shadow-none focus-visible:border-muted-foreground focus-visible:ring-0"
          value={rascunho.titulo}
          disabled={!canWrite}
          onChange={(e) => setRascunho({ ...rascunho, titulo: e.target.value })}
        />
        <p className="text-sm text-muted-foreground">Arraste pela alça ⋮⋮ para reordenar. As perguntas aparecem assim para quem preencher.</p>
      </div>

      {rascunho.perguntas.length === 0 && (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhuma pergunta ainda. Use o botão abaixo para adicionar a primeira.</p>
      )}

      {rascunho.perguntas.map((pergunta) => (
        <CartaoPergunta
          key={pergunta.id}
          pergunta={pergunta}
          ativo={ativo === pergunta.id}
          editavel={canWrite}
          onAtivar={() => setAtivo(pergunta.id)}
          onMudar={(p) => mudar(atualizarPergunta(rascunho.perguntas, p))}
          onDuplicar={() => mudar(duplicarPergunta(rascunho.perguntas, pergunta.id))}
          onExcluir={() => { mudar(excluirPergunta(rascunho.perguntas, pergunta.id)); setAtivo(null); }}
          onComecarArrasto={() => setArrastando(pergunta.id)}
          onSoltarAqui={() => { if (arrastando) mudar(moverPergunta(rascunho.perguntas, arrastando, pergunta.id)); setArrastando(null); }}
        />
      ))}

      {canWrite && (
        <Button variant="outline" onClick={adicionar}><Plus className="mr-1 h-4 w-4" />Adicionar pergunta</Button>
      )}
      {alterado && problemas.length > 0 && (
        <p role="alert" className="text-sm text-destructive">{problemas[0]}</p>
      )}
    </div>
  );
}

function CartaoPergunta({
  pergunta, ativo, editavel, onAtivar, onMudar, onDuplicar, onExcluir, onComecarArrasto, onSoltarAqui,
}: {
  pergunta: Pergunta;
  ativo: boolean;
  editavel: boolean;
  onAtivar: () => void;
  onMudar: (p: Pergunta) => void;
  onDuplicar: () => void;
  onExcluir: () => void;
  onComecarArrasto: () => void;
  onSoltarAqui: () => void;
}) {
  const [comDescricao, setComDescricao] = useState(pergunta.descricao !== "");
  const rotuloTipo = TIPOS_PERGUNTA.find((t) => t.valor === pergunta.tipo)?.rotulo ?? "";

  return (
    <div
      data-cartao
      role="group"
      aria-label={`Pergunta: ${pergunta.titulo || "sem enunciado"}`}
      onClick={onAtivar}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); onSoltarAqui(); }}
      className={`rounded-lg bg-white p-4 dark:bg-card ${
        ativo ? "border-l-8 border-l-primary shadow-lg" : "border-l-8 border-l-transparent shadow-sm"
      }`}
    >
      {editavel && (
        <div
          draggable
          aria-label="Arrastar para reordenar"
          title="Arrastar para reordenar"
          onDragStart={(e) => {
            const cartao = e.currentTarget.closest("[data-cartao]");
            if (cartao) e.dataTransfer.setDragImage(cartao, 16, 16);
            e.dataTransfer.effectAllowed = "move";
            onComecarArrasto();
          }}
          className="mx-auto mb-2 flex w-12 cursor-grab justify-center text-muted-foreground"
        >
          <GripHorizontal className="h-4 w-4" />
        </div>
      )}

      {!ativo ? (
        <div className="space-y-1">
          <p className="font-medium">{pergunta.titulo || <span className="text-muted-foreground">Pergunta sem enunciado</span>}{pergunta.obrigatoria && <span className="text-destructive"> *</span>}</p>
          {pergunta.descricao && <p className="text-sm text-muted-foreground">{pergunta.descricao}</p>}
          <Previa pergunta={pergunta} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="min-w-0 flex-[7]">
              <Label htmlFor={`enunciado-${pergunta.id}`} className="sr-only">Enunciado</Label>
              <Input
                id={`enunciado-${pergunta.id}`}
                name={`enunciado-${pergunta.id}`}
                capitalizar="texto"
                placeholder="Pergunta"
                className="h-auto rounded-none border-0 border-b bg-muted/40 px-2 py-2 shadow-none focus-visible:border-b-2 focus-visible:border-primary focus-visible:ring-0"
                value={pergunta.titulo}
                disabled={!editavel}
                onChange={(e) => onMudar({ ...pergunta, titulo: e.target.value })}
              />
            </div>
            <div className="min-w-[10rem] flex-[3]">
              <Select value={pergunta.tipo} disabled={!editavel} onValueChange={(v) => onMudar(mudarTipo(pergunta, v as TipoPergunta))}>
                <SelectTrigger aria-label="Tipo de pergunta"><SelectValue>{rotuloTipo}</SelectValue></SelectTrigger>
                <SelectContent>
                  {TIPOS_PERGUNTA.map((t) => <SelectItem key={t.valor} value={t.valor}>{t.rotulo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {comDescricao && (
            <Input
              name={`descricao-${pergunta.id}`}
              capitalizar="texto"
              placeholder="Descrição (opcional)"
              aria-label="Descrição da pergunta"
              value={pergunta.descricao}
              disabled={!editavel}
              onChange={(e) => onMudar({ ...pergunta, descricao: e.target.value })}
            />
          )}

          <Area pergunta={pergunta} editavel={editavel} onMudar={onMudar} />

          {editavel && (
            <div className="flex items-center justify-end gap-1 border-t pt-3">
              <Button variant="ghost" size="icon" aria-label="Duplicar pergunta" onClick={onDuplicar}><Copy className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" aria-label="Excluir pergunta" onClick={onExcluir}><Trash2 className="h-4 w-4" /></Button>
              <div className="mx-2 h-6 w-px bg-border" />
              <Label htmlFor={`obrigatoria-${pergunta.id}`} className="text-sm">Obrigatória</Label>
              <Switch id={`obrigatoria-${pergunta.id}`} checked={pergunta.obrigatoria} onCheckedChange={(v) => onMudar({ ...pergunta, obrigatoria: v })} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Mais configurações"><MoreVertical className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => { if (comDescricao) onMudar({ ...pergunta, descricao: "" }); setComDescricao(!comDescricao); }}>
                    {comDescricao ? "Ocultar descrição" : "Mostrar descrição"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Parte central do card ativo: muda conforme o tipo escolhido.
function Area({ pergunta, editavel, onMudar }: { pergunta: Pergunta; editavel: boolean; onMudar: (p: Pergunta) => void }) {
  if (TIPOS_COM_OPCOES.includes(pergunta.tipo)) {
    const marca = pergunta.tipo === "multipla" ? "○" : pergunta.tipo === "caixas" ? "☐" : null;
    return (
      <div className="space-y-2">
        {pergunta.opcoes.map((opcao, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-5 text-center text-muted-foreground">{marca ?? i + 1 + "."}</span>
            <Input
              name={`opcao-${pergunta.id}-${i}`}
              capitalizar="texto"
              aria-label={`Opção ${i + 1}`}
              className="h-8 rounded-none border-0 border-b shadow-none focus-visible:ring-0"
              value={opcao}
              disabled={!editavel}
              onChange={(e) => onMudar({ ...pergunta, opcoes: pergunta.opcoes.map((o, j) => (j === i ? e.target.value : o)) })}
            />
            {editavel && pergunta.opcoes.length > 1 && (
              <Button variant="ghost" size="icon" aria-label={`Remover opção ${i + 1}`} onClick={() => onMudar({ ...pergunta, opcoes: pergunta.opcoes.filter((_, j) => j !== i) })}><X className="h-4 w-4" /></Button>
            )}
          </div>
        ))}
        {editavel && (
          <Button variant="link" className="px-0" onClick={() => onMudar({ ...pergunta, opcoes: [...pergunta.opcoes, `Opção ${pergunta.opcoes.length + 1}`] })}>Adicionar opção</Button>
        )}
      </div>
    );
  }
  if (pergunta.tipo === "escala") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span>De 1 até</span>
        <Select value={String(pergunta.escalaMax)} disabled={!editavel} onValueChange={(v) => onMudar({ ...pergunta, escalaMax: Number(v) })}>
          <SelectTrigger aria-label="Valor máximo da escala" className="w-20"><SelectValue /></SelectTrigger>
          <SelectContent>{Array.from({ length: 9 }, (_, i) => i + 2).map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    );
  }
  return <Previa pergunta={pergunta} />;
}

// Como a pergunta aparece para quem responde.
function Previa({ pergunta }: { pergunta: Pergunta }) {
  if (TIPOS_COM_OPCOES.includes(pergunta.tipo) && pergunta.tipo !== "lista") {
    return <ul className="space-y-1 text-sm">{pergunta.opcoes.map((o, i) => <li key={i}>{pergunta.tipo === "multipla" ? "○" : "☐"} {o}</li>)}</ul>;
  }
  if (pergunta.tipo === "lista") return <p className="text-sm text-muted-foreground">Lista suspensa: {pergunta.opcoes.join(", ")}</p>;
  if (pergunta.tipo === "escala") return <p className="text-sm text-muted-foreground">Escala de 1 a {pergunta.escalaMax}</p>;
  const texto = pergunta.tipo === "paragrafo" ? "Texto de resposta longa" : pergunta.tipo === "data" ? "Data (dd/mm/aaaa)" : "Texto de resposta curta";
  return <p className="border-b border-dashed pb-1 text-sm text-muted-foreground">{texto}</p>;
}
