import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { EVENTOS_WEBHOOK, novaChave, urlDeWebhookValida } from "@/lib/configuracoes-demo";
import { Bloco } from "./Campos";
import { useConfig } from "./useConfig";

const dataCurta = (iso: string) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

// Chaves de API e webhooks (fictícios). A chave inteira só aparece na hora de criar; depois fica só o início.
export function Integracoes() {
  const { config, mudar } = useConfig();
  const { tokens, webhooks } = config.integracoes;
  const [nome, setNome] = useState("");
  const [novaVista, setNovaVista] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [evento, setEvento] = useState<string>(EVENTOS_WEBHOOK[0]);

  function criarChave() {
    if (!nome.trim()) return void toast.error("Dê um nome à chave (ex.: Automação n8n)");
    const { chave, prefixo } = novaChave();
    mudar((c) => ({ ...c, integracoes: { ...c.integracoes, tokens: [{ id: `t-${Date.now()}`, nome: nome.trim(), prefixo, criadoEm: new Date().toISOString(), ativo: true }, ...c.integracoes.tokens] } }), "Chave de API criada", nome.trim());
    setNovaVista(chave);
    setNome("");
  }
  function criarWebhook() {
    if (!urlDeWebhookValida(url)) return void toast.error("Use um endereço https:// válido");
    mudar((c) => ({ ...c, integracoes: { ...c.integracoes, webhooks: [{ id: `w-${Date.now()}`, url, evento, ativo: true }, ...c.integracoes.webhooks] } }), "Webhook criado", `${evento} → ${url}`);
    setUrl("");
  }

  return (
    <div className="space-y-4">
      <Bloco titulo="Chaves de API" descricao="Tokens para conectar o sistema a ferramentas externas (n8n, ERPs, automações). As chaves deste teste não autenticam em lugar nenhum.">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input aria-label="Nome da chave" placeholder="Nome da chave (ex.: Automação n8n)" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} />
          <Button type="button" onClick={criarChave}>Gerar chave</Button>
        </div>
        {novaVista && (
          <div role="status" className="space-y-1.5 rounded-lg border border-primary/40 bg-primary/5 p-3">
            <p className="text-xs font-medium">Copie agora: depois desta tela a chave não aparece inteira de novo.</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="break-all rounded bg-background px-2 py-1 text-xs">{novaVista}</code>
              <Button type="button" size="sm" variant="outline" onClick={() => { void navigator.clipboard?.writeText(novaVista); toast.success("Chave copiada"); }}>Copiar</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setNovaVista(null)}>Já copiei</Button>
            </div>
          </div>
        )}
        {tokens.length === 0 ? <p className="text-xs text-muted-foreground">Nenhuma chave criada.</p> : (
          <ul className="divide-y rounded-lg border">
            {tokens.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                <span className="font-medium">{t.nome}</span>
                <code className="text-xs text-muted-foreground">{t.prefixo}</code>
                <span className="text-xs text-muted-foreground">criada em {dataCurta(t.criadoEm)}</span>
                <Badge variant={t.ativo ? "default" : "secondary"} className="ml-auto">{t.ativo ? "Ativa" : "Revogada"}</Badge>
                <Button type="button" size="sm" variant="outline" disabled={!t.ativo} onClick={() => { if (confirm(`Revogar a chave "${t.nome}"?`)) mudar((c) => ({ ...c, integracoes: { ...c.integracoes, tokens: c.integracoes.tokens.map((x) => (x.id === t.id ? { ...x, ativo: false } : x)) } }), "Chave de API revogada", t.nome); }}>Revogar</Button>
              </li>
            ))}
          </ul>
        )}
      </Bloco>

      <Bloco titulo="Webhooks" descricao="O sistema avisa o endereço informado quando o evento acontece.">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input aria-label="Endereço do webhook" type="url" placeholder="https://exemplo.com.br/webhook" value={url} onChange={(e) => setUrl(e.target.value)} className="sm:flex-1" />
          <Select value={evento} onValueChange={setEvento}>
            <SelectTrigger aria-label="Evento do webhook" className="sm:w-52"><SelectValue /></SelectTrigger>
            <SelectContent>{EVENTOS_WEBHOOK.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
          </Select>
          <Button type="button" onClick={criarWebhook}>Adicionar</Button>
        </div>
        {webhooks.length === 0 ? <p className="text-xs text-muted-foreground">Nenhum webhook cadastrado.</p> : (
          <ul className="divide-y rounded-lg border">
            {webhooks.map((w) => (
              <li key={w.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                <div className="min-w-0 flex-1"><p className="truncate font-medium">{w.url}</p><p className="text-xs text-muted-foreground">{w.evento}</p></div>
                <Switch aria-label={`Webhook ${w.url} ativo`} checked={w.ativo} onCheckedChange={(v) => mudar((c) => ({ ...c, integracoes: { ...c.integracoes, webhooks: c.integracoes.webhooks.map((x) => (x.id === w.id ? { ...x, ativo: v } : x)) } }), "Webhook alterado", `${w.evento}: ${v ? "ativado" : "desativado"}`)} />
                <Button type="button" size="sm" variant="ghost" onClick={() => toast.success(`Simulação: evento de teste enviado a ${w.url}`)}>Testar</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => { if (confirm("Excluir este webhook?")) mudar((c) => ({ ...c, integracoes: { ...c.integracoes, webhooks: c.integracoes.webhooks.filter((x) => x.id !== w.id) } }), "Webhook excluído", `${w.evento} → ${w.url}`); }}>Excluir</Button>
              </li>
            ))}
          </ul>
        )}
      </Bloco>
    </div>
  );
}
