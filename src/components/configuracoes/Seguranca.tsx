import { useState } from "react";
import { confirmarTexto } from "@/components/ConfirmarAcao";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { OPCOES_SENHA_MIN, emailValido, problemasDaSenha, type Config } from "@/lib/configuracoes-demo";
import { Bloco, Linha } from "./Campos";
import { BloquearUsuario } from "./BloquearUsuario";
import { useConfig } from "./useConfig";

const INATIVIDADE = [5, 15, 30, 60, 120, 480];
const TROCA = [0, 30, 60, 90, 180, 365];
const SESSOES = [
  { id: "s1", onde: "Chrome · Windows · São Paulo", quando: "agora (esta sessão)" },
  { id: "s2", onde: "Safari · iPhone · Campinas", quando: "há 2 horas" },
  { id: "s3", onde: "Edge · Windows · Escritório", quando: "ontem" },
];

export function Seguranca() {
  const { config, mudar } = useConfig();
  const s = config.seguranca;
  const [teste, setTeste] = useState("");
  const [emailRec, setEmailRec] = useState<string | null>(null);
  const [sessoes, setSessoes] = useState(SESSOES);
  const trocar = (parte: Partial<Config["seguranca"]>, detalhe: string) => mudar((c) => ({ ...c, seguranca: { ...c.seguranca, ...parte } }), "Configuração de segurança alterada", detalhe);
  const problemas = teste ? problemasDaSenha(teste, s) : [];

  return (
    <div className="space-y-4">
      <Bloco titulo="Autenticação" descricao="Simulado: nenhum provedor é conectado neste teste.">
        <Linha rotulo="Autenticação em dois fatores (2FA)" ajuda="Pede um código do aplicativo autenticador além da senha" htmlFor="doisfatores">
          <Switch id="doisfatores" checked={s.doisFatores} onCheckedChange={(v) => trocar({ doisFatores: v }, `2FA ${v ? "ativado" : "desativado"}`)} />
        </Linha>
        <Linha rotulo="Entrar com Google" htmlFor="google">
          <Switch id="google" checked={s.google} onCheckedChange={(v) => trocar({ google: v }, `Login Google ${v ? "ativado" : "desativado"}`)} />
        </Linha>
        <Linha rotulo="Entrar com Microsoft" htmlFor="microsoft">
          <Switch id="microsoft" checked={s.microsoft} onCheckedChange={(v) => trocar({ microsoft: v }, `Login Microsoft ${v ? "ativado" : "desativado"}`)} />
        </Linha>
        <Linha rotulo="Login único (SSO)" ajuda="Para empresas com provedor de identidade próprio" htmlFor="sso">
          <Switch id="sso" checked={s.sso} onCheckedChange={(v) => trocar({ sso: v }, `SSO ${v ? "ativado" : "desativado"}`)} />
        </Linha>
      </Bloco>

      <Bloco titulo="Política de senhas">
        <Linha rotulo="Tamanho mínimo" htmlFor="senha-min">
          <Select value={String(s.senhaMin)} onValueChange={(v) => trocar({ senhaMin: Number(v) }, `Tamanho mínimo da senha: ${v}`)}>
            <SelectTrigger id="senha-min" className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>{OPCOES_SENHA_MIN.map((n) => <SelectItem key={n} value={String(n)}>{n} caracteres</SelectItem>)}</SelectContent>
          </Select>
        </Linha>
        <Linha rotulo="Exigir número" htmlFor="exige-numero">
          <Switch id="exige-numero" checked={s.exigeNumero} onCheckedChange={(v) => trocar({ exigeNumero: v }, `Senha com número: ${v ? "exigido" : "opcional"}`)} />
        </Linha>
        <Linha rotulo="Exigir símbolo" htmlFor="exige-simbolo">
          <Switch id="exige-simbolo" checked={s.exigeSimbolo} onCheckedChange={(v) => trocar({ exigeSimbolo: v }, `Senha com símbolo: ${v ? "exigido" : "opcional"}`)} />
        </Linha>
        <Linha rotulo="Troca periódica" htmlFor="troca">
          <Select value={String(s.trocaDias)} onValueChange={(v) => trocar({ trocaDias: Number(v) }, `Troca de senha: ${v === "0" ? "nunca" : `a cada ${v} dias`}`)}>
            <SelectTrigger id="troca" className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>{TROCA.map((d) => <SelectItem key={d} value={String(d)}>{d === 0 ? "Nunca" : `A cada ${d} dias`}</SelectItem>)}</SelectContent>
          </Select>
        </Linha>
        <div className="rounded-lg border bg-muted/30 p-3">
          <label htmlFor="testar-senha" className="text-sm font-medium">Testar uma senha</label>
          <Input id="testar-senha" type="text" autoComplete="off" placeholder="Digite uma senha de exemplo" value={teste} onChange={(e) => setTeste(e.target.value)} className="mt-1.5" />
          {teste && (
            <p role="status" className={`mt-1.5 text-xs ${problemas.length ? "text-destructive" : "text-emerald-700"}`}>
              {problemas.length ? `Não atende: ${problemas.join("; ")}.` : "Atende à política."}
            </p>
          )}
        </div>
      </Bloco>

      <Bloco titulo="Recuperação de senha" descricao="E-mail que recebe o link quando alguém pede para recuperar a senha. Simulado: nenhum e-mail é enviado.">
        <Linha rotulo="E-mail de recuperação" ajuda={s.emailRecuperacao ? `Salvo: ${s.emailRecuperacao}` : "Ainda não informado"} htmlFor="email-recuperacao">
          <div className="flex gap-2">
            <Input
              id="email-recuperacao"
              type="email"
              autoComplete="off"
              placeholder="seguranca@empresa.com.br"
              value={emailRec ?? s.emailRecuperacao}
              onChange={(e) => setEmailRec(e.target.value)}
              className="h-9 w-64"
            />
            <Button
              type="button"
              size="sm"
              disabled={emailRec === null || emailRec === s.emailRecuperacao}
              onClick={() => {
                const novo = (emailRec ?? "").trim();
                if (novo && !emailValido(novo)) return void toast.error("Digite um e-mail válido");
                trocar({ emailRecuperacao: novo }, novo ? `E-mail de recuperação: ${novo}` : "E-mail de recuperação removido");
                setEmailRec(null);
                toast.success(novo ? "E-mail de recuperação salvo" : "E-mail de recuperação removido");
              }}
            >
              Salvar
            </Button>
          </div>
        </Linha>
      </Bloco>

      <Bloco titulo="Desligamento de empregados (offboarding)" descricao="O que acontece com o acesso ao sistema quando o status do empregado muda para Demitido. Neste teste os usuários não estão ligados aos empregados: a regra fica guardada para valer com o banco real.">
        <Linha rotulo="Bloquear o acesso imediatamente ao marcar como Demitido" ajuda="Ativado por padrão" htmlFor="bloquear-demitido">
          <Switch id="bloquear-demitido" checked={s.bloquearAoDemitir} onCheckedChange={(v) => trocar({ bloquearAoDemitir: v }, `Bloqueio imediato ao demitir: ${v ? "ativado" : "desativado"}`)} />
        </Linha>
        <Linha rotulo="Encerrar todas as sessões ativas do usuário no momento do bloqueio" htmlFor="encerrar-sessoes-demitido">
          <Switch id="encerrar-sessoes-demitido" checked={s.encerrarSessoesAoBloquear} disabled={!s.bloquearAoDemitir} onCheckedChange={(v) => trocar({ encerrarSessoesAoBloquear: v }, `Encerrar sessões ao bloquear: ${v ? "ativado" : "desativado"}`)} />
        </Linha>
        <Linha rotulo="Bloquear um usuário agora" ajuda="Escolha quem perde o acesso na hora; dá para liberar de volta" htmlFor="abrir-bloqueio">
          <BloquearUsuario />
        </Linha>
      </Bloco>

      <Bloco titulo="Controle de sessão">
        <Linha rotulo="Tempo máximo de inatividade" ajuda="Depois disso o usuário é deslogado sozinho" htmlFor="inatividade">
          <Select value={String(s.inatividadeMin)} onValueChange={(v) => trocar({ inatividadeMin: Number(v) }, `Inatividade máxima: ${v} min`)}>
            <SelectTrigger id="inatividade" className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>{INATIVIDADE.map((m) => <SelectItem key={m} value={String(m)}>{m < 60 ? `${m} minutos` : `${m / 60} hora(s)`}</SelectItem>)}</SelectContent>
          </Select>
        </Linha>
        <div className="space-y-2">
          <p className="text-sm font-medium">Sessões ativas</p>
          {sessoes.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma outra sessão ativa.</p>}
          <ul className="divide-y rounded-lg border">
            {sessoes.map((x) => <li key={x.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm"><span>{x.onde}</span><span className="text-xs text-muted-foreground">{x.quando}</span></li>)}
          </ul>
          <Button type="button" variant="outline" disabled={sessoes.length === 0} onClick={async () => { if (await confirmarTexto("Encerrar todas as sessões ativas (simulado)?", { rotuloConfirmar: "Encerrar", destrutivo: true })) { setSessoes([]); mudar((c) => c, "Sessões encerradas", "Todas as sessões ativas foram encerradas"); toast.success("Simulação: todas as sessões foram encerradas"); } }}>
            Encerrar todas as sessões
          </Button>
        </div>
      </Bloco>
    </div>
  );
}
