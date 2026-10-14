import { CalendarDays, ChevronDown, Clock } from "lucide-react";

import { listarClientes } from "@/lib/clientes-demo";
import { FORMATOS_CURTA, MAX_ARQUIVOS, type Pergunta } from "@/lib/questionario-despesas";

const campo = "flex items-center justify-between rounded-md border border-dashed px-3 py-1.5 text-sm text-muted-foreground";

// Como a pergunta aparece para quem responde (campos só de demonstração, sem digitação).
export function PerguntaPrevia({ pergunta, habilitadosVisiveis }: { pergunta: Pergunta; habilitadosVisiveis?: Pergunta["habilitados"] | undefined }) {
  const { tipo } = pergunta;
  if (pergunta.habilitados) {
    const lista = habilitadosVisiveis ?? pergunta.habilitados;
    return (
      <ul className="space-y-1 text-sm">
        {lista.length === 0 && <li className="text-muted-foreground">Nenhum empregado habilitado ainda.</li>}
        {lista.map((h) => <li key={`${h.empregadoId ?? "sem"}-${h.nome}`}>☐ {h.nome} <span className="text-muted-foreground">· {h.area}</span></li>)}
      </ul>
    );
  }
  if (tipo === "multipla") return <ul className="space-y-1 text-sm">{pergunta.opcoes.map((o, i) => <li key={i}>○ {o}</li>)}</ul>;
  if (tipo === "caixas") {
    return (
      <div className="space-y-1">
        <ul className="space-y-1 text-sm">{pergunta.opcoes.map((o, i) => <li key={i}>☐ {o}</li>)}</ul>
        <p className="text-xs text-muted-foreground">{pergunta.multiplas ? "Aceita mais de uma resposta" : "Aceita apenas uma resposta"}</p>
      </div>
    );
  }
  if (tipo === "lista") {
    const detalhe = pergunta.fonte === "clientes"
      ? `Opções de Parâmetros > Clientes (${listarClientes().length} cadastrados)`
      : pergunta.fonte === "municipios"
        ? "Municípios da UF escolhida na pergunta anterior, com busca por palavra-chave"
        : `${pergunta.opcoes.length} opções`;
    return (
      <div className="space-y-1">
        <div className={campo}><span>Selecione</span><ChevronDown className="h-4 w-4" /></div>
        <p className="text-xs text-muted-foreground">{detalhe}</p>
      </div>
    );
  }
  if (tipo === "curta") {
    const dica = { livre: "Texto de resposta curta", moeda: "R$ 0,00", inteiro: "0", decimal2: "0,00" }[pergunta.formato];
    return (
      <div className="space-y-1">
        <div className={campo}>{dica}</div>
        <p className="text-xs text-muted-foreground">Formato: {FORMATOS_CURTA.find((f) => f.valor === pergunta.formato)?.rotulo}</p>
      </div>
    );
  }
  if (tipo === "data") return <div className={campo}><span>dd/mm/aaaa</span><CalendarDays className="h-4 w-4" /></div>;
  if (tipo === "hora") return <div className={campo}><span>hh:mm</span><Clock className="h-4 w-4" /></div>;
  if (tipo === "paragrafo") {
    return (
      <div className="space-y-2 pt-1">
        <p className="text-sm text-muted-foreground">Texto de resposta longa</p>
        {[0, 1, 2].map((i) => <div key={i} className="border-b border-dashed" />)}
      </div>
    );
  }
  return (
    <p className={campo}>
      Até {MAX_ARQUIVOS} imagens{pergunta.obrigatoria ? ", ao menos 1 obrigatória" : ""}. As imagens são reduzidas antes de guardar.
    </p>
  );
}
