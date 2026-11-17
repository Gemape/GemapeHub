import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ALERTAS, CANAIS, emailValido, slackValido, whatsappValido, type Canal, type Frequencia } from "@/lib/configuracoes-demo";
import { Bloco, Linha } from "./Campos";
import { useConfig } from "./useConfig";

type Destino = Exclude<Canal, "app">;
const CAMPOS: Record<Destino, { rotulo: string; ajuda: string; placeholder: string; tipo: string; valido: (t: string) => boolean; erro: string }> = {
  email: { rotulo: "E-mail que recebe os alertas", ajuda: "Pode ser um endereço da equipe, como compras@empresa.com.br", placeholder: "alertas@empresa.com.br", tipo: "email", valido: emailValido, erro: "Digite um e-mail válido" },
  whatsapp: { rotulo: "Número do WhatsApp", ajuda: "Com DDD, ex.: (11) 91234-5678", placeholder: "(11) 91234-5678", tipo: "tel", valido: whatsappValido, erro: "Digite um número com DDD (10 a 13 dígitos)" },
  slack: { rotulo: "Slack: webhook ou canal", ajuda: "Endereço https://hooks.slack.com/... ou um canal, como #alertas", placeholder: "#alertas-patrimonio", tipo: "text", valido: slackValido, erro: "Use um webhook https://hooks.slack.com/... ou um canal começando com #" },
};

// Lista de destinos de um canal: cada item tem Editar e Remover, e Incluir acrescenta outro. Só grava valor válido e sem repetição.
function CampoDestino({ canal, salvos, aoMudar }: { canal: Destino; salvos: string[]; aoMudar: (lista: string[], acao: string) => void }) {
  const c = CAMPOS[canal];
  // editando: posição do item em edição, "novo" para inclusão, null para nenhum
  const [editando, setEditando] = useState<number | "novo" | null>(null);
  const [texto, setTexto] = useState("");
  const valor = texto.trim();
  const invalido = valor !== "" && !c.valido(valor);
  const repetido = valor !== "" && salvos.some((s, i) => i !== editando && s.toLowerCase() === valor.toLowerCase());
  const abrir = (quem: number | "novo", inicial: string) => { setEditando(quem); setTexto(inicial); };
  const salvar = () => {
    if (!valor || invalido || repetido) return void toast.error(repetido ? "Esse destino já está na lista" : c.erro);
    const lista = editando === "novo" ? [...salvos, valor] : salvos.map((s, i) => (i === editando ? valor : s));
    aoMudar(lista, editando === "novo" ? `incluído ${valor}` : `alterado para ${valor}`);
    setEditando(null);
    toast.success("Destino salvo");
  };
  const campo = (
    <div className="space-y-1">
      <div className="flex gap-2">
        <Input id={`destino-${canal}`} type={c.tipo} autoComplete="off" autoFocus placeholder={c.placeholder} value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => e.key === "Enter" && salvar()} aria-invalid={invalido || repetido} className="h-8 w-64 text-xs" />
        <Button type="button" size="sm" className="h-8 px-3 text-xs" disabled={!valor || valor === salvos[editando as number]} onClick={salvar}>Salvar</Button>
        <Button type="button" size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => setEditando(null)}>Cancelar</Button>
      </div>
      {(invalido || repetido) && <p role="alert" className="text-xs text-destructive">{repetido ? "Esse destino já está na lista" : c.erro}</p>}
    </div>
  );
  return (
    <div className="space-y-2">
      <div>
        <label htmlFor={`destino-${canal}`} className="text-sm font-medium">{c.rotulo}</label>
        <p className="text-[11px] text-muted-foreground">{salvos.length ? `${salvos.length} cadastrado${salvos.length > 1 ? "s" : ""}` : "Nenhum destino cadastrado"}</p>
      </div>
      <div className="space-y-1.5">
        {salvos.map((s, i) =>
          editando === i ? <div key={s}>{campo}</div> : (
            <div key={s} className="flex items-center gap-2">
              <span className="max-w-64 truncate rounded-md border bg-muted/40 px-2.5 py-1 text-xs" title={s}>{s}</span>
              <Button type="button" size="icon" title="Editar" aria-label={`Editar ${s}`} className="size-7 rounded-md" onClick={() => abrir(i, s)}>
                <Pencil className="size-3" />
              </Button>
              <Button type="button" size="icon" title="Remover" aria-label={`Remover ${s}`} className="size-7 rounded-md" onClick={() => { aoMudar(salvos.filter((_, j) => j !== i), `removido ${s}`); setEditando(null); toast.success("Destino removido"); }}>
                <Trash2 className="size-3" />
              </Button>
            </div>
          ),
        )}
        {editando === "novo" ? campo : (
          <Button type="button" size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={() => abrir("novo", "")}>
            <Plus className="size-3" /> Incluir
          </Button>
        )}
      </div>
    </div>
  );
}

export function Notificacoes() {
  const { config, mudar } = useConfig();
  const n = config.notificacoes;
  const marcar = (alerta: string, canal: Canal, valor: boolean) =>
    mudar((c) => ({ ...c, notificacoes: { ...c.notificacoes, alertas: { ...c.notificacoes.alertas, [alerta]: { ...c.notificacoes.alertas[alerta]!, [canal]: valor } } } }));
  const canaisAtivos = (canal: Canal) => ALERTAS.filter((a) => n.alertas[a.id]?.[canal]).length;

  return (
    <div className="space-y-4">
      <Bloco titulo="Preferências de alerta" descricao="Escolha o que notificar e por qual canal. WhatsApp e Slack dependem de conexão, que não existe neste teste.">
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/60 text-left">
                <th className="px-3 py-2.5 font-semibold">Alerta</th>
                {CANAIS.map((c) => <th key={c.id} className="px-3 py-2.5 text-center font-semibold">{c.nome}</th>)}
              </tr>
            </thead>
            <tbody>
              {ALERTAS.map((a) => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="px-3 py-2">{a.nome}</td>
                  {CANAIS.map((c) => (
                    <td key={c.id} className="px-3 py-2 text-center">
                      <Checkbox aria-label={`${a.nome} por ${c.nome}`} checked={!!n.alertas[a.id]?.[c.id]} onCheckedChange={(v) => marcar(a.id, c.id, v === true)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/40 text-xs text-muted-foreground">
                <td className="px-3 py-2">Alertas ligados</td>
                {CANAIS.map((c) => <td key={c.id} className="px-3 py-2 text-center">{canaisAtivos(c.id)} de {ALERTAS.length}</td>)}
              </tr>
            </tfoot>
          </table>
        </div>
      </Bloco>

      <Bloco titulo="Alertas imediatos" descricao="Avisa assim que o alerta acontece. Para cada canal com alerta ligado, informe aonde enviar.">
        <Linha rotulo="Enviar alertas imediatos" ajuda="Desligado: só o resumo abaixo é enviado" htmlFor="email-imediato">
          <Switch id="email-imediato" checked={n.emailAlertaImediato} onCheckedChange={(v) => mudar((c) => ({ ...c, notificacoes: { ...c.notificacoes, emailAlertaImediato: v } }))} />
        </Linha>
        {n.emailAlertaImediato && (["email", "whatsapp", "slack"] as const).filter((c) => canaisAtivos(c) > 0).map((c) => (
          <CampoDestino key={c} canal={c} salvos={n.destinos[c]} aoMudar={(lista, acao) => mudar((x) => ({ ...x, notificacoes: { ...x.notificacoes, destinos: { ...x.notificacoes.destinos, [c]: lista } } }), "Destino de alerta alterado", `${CANAIS.find((k) => k.id === c)?.nome}: ${acao}`)} />
        ))}
        {n.emailAlertaImediato && (["email", "whatsapp", "slack"] as const).every((c) => canaisAtivos(c) === 0) && (
          <p className="text-xs text-muted-foreground">Marque E-mail, WhatsApp ou Slack em algum alerta, na tabela acima, para informar o destino.</p>
        )}
      </Bloco>

      <Bloco titulo="Resumo por e-mail">
        <Linha rotulo="Resumo dos alertas" ajuda="Um e-mail só, juntando o que aconteceu no período" htmlFor="resumo">
          <Select value={n.resumo} onValueChange={(v) => mudar((c) => ({ ...c, notificacoes: { ...c.notificacoes, resumo: v as Frequencia } }))}>
            <SelectTrigger id="resumo" className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="diario">Diário</SelectItem><SelectItem value="semanal">Semanal</SelectItem><SelectItem value="mensal">Mensal</SelectItem></SelectContent>
          </Select>
        </Linha>
      </Bloco>

      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={() => toast.success(`Simulação: notificação de teste enviada em ${CANAIS.filter((c) => canaisAtivos(c.id) > 0).map((c) => c.nome).join(", ") || "nenhum canal"}`)}>
          Enviar notificação de teste
        </Button>
      </div>
    </div>
  );
}
