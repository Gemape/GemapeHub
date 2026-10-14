import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TODAS } from "@/lib/empresa-context";
import { empregadoAtivo } from "@/lib/empregados";
import { useEmpregados } from "@/lib/hooks-gemape";
import {
  AREAS_VIAGEM, FORMATOS_CURTA, TIPOS_PERGUNTA, novaPergunta, regraArquivos, validarPergunta,
  type AreaViagem, type Estado, type FormatoCurta, type Pergunta, type TipoPergunta,
} from "@/lib/questionario-despesas";

export type ModoPergunta = "novo" | "editar" | "clonar";

// Cadastrar pergunta: primeiro se escolhe o tipo, depois se preenchem os campos daquele tipo.
export function PerguntaDialog({
  aberto, modo, inicial, estado, codigoNovo, onSalvar, onFechar,
}: {
  aberto: boolean;
  modo: ModoPergunta;
  inicial: Pergunta | null;
  estado: Estado;
  codigoNovo: string;
  onSalvar: (p: Pergunta) => void;
  onFechar: () => void;
}) {
  const [pergunta, setPergunta] = useState<Pergunta | null>(null);
  const [erro, setErro] = useState("");
  useEffect(() => {
    if (aberto) { setPergunta(modo === "novo" ? null : inicial); setErro(""); }
  }, [aberto, modo, inicial]);

  const titulo = modo === "editar" ? "Editar pergunta" : modo === "clonar" ? "Clonar pergunta" : "Cadastrar pergunta";

  function escolherTipo(tipo: TipoPergunta) {
    setPergunta(novaPergunta(tipo, codigoNovo));
  }

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!pergunta) return;
    const erros = validarPergunta({ ...pergunta, titulo: pergunta.titulo.trim(), opcoes: pergunta.opcoes.map((o) => o.trim()) }, estado.perguntas);
    if (erros[0]) { setErro(erros[0]); return; }
    onSalvar(pergunta);
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => { if (!v) onFechar(); }}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            {pergunta ? `Pergunta ${pergunta.codigo}` : "Qual tipo de pergunta você quer cadastrar?"}
          </DialogDescription>
        </DialogHeader>

        {!pergunta ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {TIPOS_PERGUNTA.map((t) => (
              <Button key={t.valor} type="button" variant="outline" className="h-auto flex-col items-start whitespace-normal py-2 text-left" onClick={() => escolherTipo(t.valor)}>
                <span className="font-medium">{t.rotulo}</span>
                <span className="text-xs font-normal text-muted-foreground">{t.ajuda}</span>
              </Button>
            ))}
          </div>
        ) : (
          <form onSubmit={enviar} className="space-y-4">
            <p className="text-sm text-muted-foreground">Tipo: {TIPOS_PERGUNTA.find((t) => t.valor === pergunta.tipo)?.rotulo}</p>
            <div className="space-y-1">
              <Label htmlFor="enunciado-questao">Título da pergunta</Label>
              <Input id="enunciado-questao" name="enunciado-questao" capitalizar="texto" value={pergunta.titulo} onChange={(e) => setPergunta({ ...pergunta, titulo: e.target.value })} autoFocus />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="obrigatoria-pergunta" checked={pergunta.obrigatoria} onCheckedChange={(v) => setPergunta({ ...pergunta, obrigatoria: v })} />
              <Label htmlFor="obrigatoria-pergunta">Resposta obrigatória</Label>
            </div>
            <CamposDoTipo pergunta={pergunta} onMudar={setPergunta} />
            {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onFechar}>Cancelar</Button>
              {modo === "novo" && <Button type="button" variant="ghost" onClick={() => { setPergunta(null); setErro(""); }}>Trocar o tipo</Button>}
              <Button type="submit">Salvar pergunta</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CamposDoTipo({ pergunta, onMudar }: { pergunta: Pergunta; onMudar: (p: Pergunta) => void }) {
  if (pergunta.habilitados) return <Habilitados pergunta={pergunta} onMudar={onMudar} />;
  if (pergunta.fonte === "municipios") {
    return <p className="rounded-md bg-muted/50 p-2 text-sm">As opções são os municípios da UF escolhida na pergunta anterior, com busca por palavra-chave.</p>;
  }
  if (pergunta.tipo === "curta") {
    return (
      <div className="space-y-1">
        <Label>Formato aceito na resposta</Label>
        <Select value={pergunta.formato} onValueChange={(v) => onMudar({ ...pergunta, formato: v as FormatoCurta })}>
          <SelectTrigger aria-label="Formato aceito"><SelectValue /></SelectTrigger>
          <SelectContent>{FORMATOS_CURTA.map((f) => <SelectItem key={f.valor} value={f.valor}>{f.rotulo}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    );
  }
  if (pergunta.tipo === "upload") {
    const regra = regraArquivos(pergunta);
    return (
      <p className="rounded-md bg-muted/50 p-2 text-sm">
        Aceita até {regra.maximo} imagens{regra.minimo ? " e exige ao menos 1 (as outras são opcionais)" : ""}. As imagens são reduzidas antes de ir para o armazenamento do sistema.
      </p>
    );
  }
  if (pergunta.tipo === "data" || pergunta.tipo === "hora" || pergunta.tipo === "paragrafo") return null;
  return <Opcoes pergunta={pergunta} onMudar={onMudar} />;
}

// Título e opções de resposta (pai e filho); a caixa de seleção ainda define se aceita mais de uma resposta.
function Opcoes({ pergunta, onMudar }: { pergunta: Pergunta; onMudar: (p: Pergunta) => void }) {
  const deClientes = pergunta.fonte === "clientes";
  return (
    <div className="space-y-3">
      {pergunta.tipo === "caixas" && (
        <div className="flex items-center gap-2">
          <Switch id="multiplas-pergunta" checked={pergunta.multiplas} onCheckedChange={(v) => onMudar({ ...pergunta, multiplas: v })} />
          <Label htmlFor="multiplas-pergunta">Permitir marcar mais de uma opção</Label>
        </div>
      )}
      {pergunta.tipo === "lista" && (
        <div className="flex items-center gap-2">
          <Switch id="fonte-clientes" checked={deClientes} onCheckedChange={(v) => onMudar({ ...pergunta, fonte: v ? "clientes" : "propria", opcoes: v ? [] : [""] })} />
          <Label htmlFor="fonte-clientes">Usar os clientes de Parâmetros &gt; Clientes como opções</Label>
        </div>
      )}
      {!deClientes && (
        <div className="space-y-2">
          <Label>Opções de resposta</Label>
          {pergunta.opcoes.map((opcao, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 text-center text-muted-foreground">{pergunta.tipo === "lista" ? `${i + 1}.` : pergunta.tipo === "multipla" ? "○" : "☐"}</span>
              <Input
                name={`opcao-${i}`}
                capitalizar="texto"
                aria-label={`Opção ${i + 1}`}
                value={opcao}
                onChange={(e) => onMudar({ ...pergunta, opcoes: pergunta.opcoes.map((o, j) => (j === i ? e.target.value : o)) })}
              />
              {pergunta.opcoes.length > 1 && (
                <Button type="button" variant="ghost" size="icon" aria-label={`Remover opção ${i + 1}`} onClick={() => onMudar({ ...pergunta, opcoes: pergunta.opcoes.filter((_, j) => j !== i) })}><X className="h-4 w-4" /></Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => onMudar({ ...pergunta, opcoes: [...pergunta.opcoes, ""] })}><Plus className="mr-1 h-4 w-4" />Adicionar opção</Button>
        </div>
      )}
    </div>
  );
}

// Empregados habilitados ao questionário de viagem, cada um com a sua área. Quem fica inativo no cadastro sai da lista.
function Habilitados({ pergunta, onMudar }: { pergunta: Pergunta; onMudar: (p: Pergunta) => void }) {
  const lista = pergunta.habilitados ?? [];
  const { data: empregados = [] } = useEmpregados(TODAS);
  const [busca, setBusca] = useState("");
  const jaIncluidos = new Set(lista.map((h) => h.empregadoId));
  const termo = busca.trim().toLocaleLowerCase("pt-BR");
  const achados = termo
    ? empregados.filter((e) => empregadoAtivo(e) && !jaIncluidos.has(e.id) && e.nome.toLocaleLowerCase("pt-BR").includes(termo)).slice(0, 8)
    : [];
  const mudar = (habilitados: typeof lista) => onMudar({ ...pergunta, habilitados });

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="busca-empregado">Buscar empregado pelo nome completo</Label>
        <Input id="busca-empregado" name="busca-empregado" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite parte do nome" />
        {achados.map((e) => (
          <Button key={e.id} type="button" variant="outline" size="sm" className="mr-1 mt-1" onClick={() => { mudar([...lista, { empregadoId: e.id, nome: e.nome, area: "Oficina" }]); setBusca(""); }}>
            <Plus className="mr-1 h-3 w-3" />{e.nome}
          </Button>
        ))}
        {termo && achados.length === 0 && <p className="text-xs text-muted-foreground">Nenhum empregado ativo encontrado.</p>}
      </div>
      <div className="space-y-2">
        <Label>Habilitados e área</Label>
        {lista.length === 0 && <p className="text-sm text-muted-foreground">Nenhum empregado habilitado.</p>}
        {lista.map((h, i) => (
          <div key={`${h.empregadoId ?? "sem"}-${h.nome}`} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm">{h.nome}{h.empregadoId === null && <span className="text-xs text-muted-foreground"> (sem vínculo com o cadastro)</span>}</span>
            <Select value={h.area} onValueChange={(v) => mudar(lista.map((x, j) => (j === i ? { ...x, area: v as AreaViagem } : x)))}>
              <SelectTrigger aria-label={`Área de ${h.nome}`} className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{AREAS_VIAGEM.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
            <Button type="button" variant="ghost" size="icon" aria-label={`Remover ${h.nome}`} onClick={() => mudar(lista.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
