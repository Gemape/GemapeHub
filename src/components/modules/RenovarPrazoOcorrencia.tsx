import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { renovarPrazoTratativa, type OcorrenciaVeiculo } from "@/lib/ocorrencias-veiculo";
import { lerPermissoes, usuarioAtivo } from "@/lib/permissoes-demo";
import { hojeBrasilia } from "@/lib/checklist-veiculo";
import { formatarData } from "@/lib/gemape";
import { dataLimiteSugerida, lerPrazosOcorrencias } from "@/lib/prazo-ocorrencias";
import { SENHA_DEMONSTRACAO, autorizarRenovacao, supervisoresEfetivos } from "@/lib/supervisores-ocorrencias";

// Renovar o prazo da tratativa (decisões 309, 315 e 316): o supervisor valida, sempre com a senha de login dele. Quem está renovando escolhe o supervisor na lista (o próprio
// nome já vem escolhido quando é supervisor) e digita a senha. A renovação vale para o passo em que a ocorrência está (iniciar ou finalizar a
// tratativa) e define a nova data limite, sugerida como hoje mais os dias do prazo.
export function RenovarPrazoOcorrencia({ ocorrencia, onFechar }: { ocorrencia: OcorrenciaVeiculo | null; onFechar: () => void }) {
  const usuarios = lerPermissoes(localStorage).usuarios;
  const quem = usuarioAtivo(localStorage);
  const supervisores = supervisoresEfetivos(usuarios);
  // Quem renova e já é supervisor tem o próprio nome escolhido, mas ainda digita a senha.
  const proprio = supervisores.some((s) => s.id === quem.id) ? quem.id : "";
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const supervisorId = escolhido ?? proprio;
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const passo = ocorrencia?.status === "Aberta" ? "iniciar" : "finalizar";
  const dias = lerPrazosOcorrencias()[passo];
  // Data limite da renovação: sugere hoje mais os dias do prazo; quem renova pode escolher outra (decisão 316).
  const hoje = hojeBrasilia();
  const [dataEscolhida, setData] = useState<string | null>(null);
  const ate = dataEscolhida ?? dataLimiteSugerida(hoje, dias);

  function fechar() {
    setEscolhido(null);
    setData(null);
    setSenha("");
    setErro("");
    onFechar();
  }

  function renovar(e: React.FormEvent) {
    e.preventDefault();
    if (!ocorrencia) return;
    try {
      const autorizou = autorizarRenovacao({ supervisorId, senha }, supervisores);
      renovarPrazoTratativa(ocorrencia.id, { autorizadoPorId: autorizou.id, autorizadoPorNome: autorizou.nome, registradoPorNome: quem.nome, ate });
      toast.success(`Prazo renovado: a tratativa pode ${passo === "iniciar" ? "começar" : "terminar"} até ${formatarData(ate)}.`);
      fechar();
    } catch (falha) {
      // A senha errada não vaza pelo texto do erro e o campo é limpo para digitar de novo.
      setErro(falha instanceof Error ? falha.message : "Não foi possível renovar o prazo.");
      setSenha("");
    }
  }

  return (
    <Dialog open={!!ocorrencia} onOpenChange={(a) => { if (!a) fechar(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Renovar prazo da tratativa</DialogTitle>
          <DialogDescription>
            {ocorrencia?.codigo}: escolha até quando a tratativa pode {passo === "iniciar" ? "ser iniciada" : "ser finalizada"}. A renovação precisa da validação de um supervisor.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={renovar} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="renovar_data">Nova data da tratativa</Label>
            <Input id="renovar_data" type="date" min={hoje} value={ate} onChange={(e) => { setData(e.target.value); setErro(""); }} />
            <p className="text-xs text-muted-foreground">Prazo para {passo === "iniciar" ? "iniciar" : "finalizar"} a tratativa até esta data. Sugerida: hoje mais {dias} dia(s), conforme os Parâmetros Específicos.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="renovar_supervisor">Supervisor que autoriza</Label>
            <Select value={supervisorId} onValueChange={(v) => { setEscolhido(v); setErro(""); }}>
              <SelectTrigger id="renovar_supervisor"><SelectValue placeholder="Selecione o supervisor" /></SelectTrigger>
              <SelectContent>{supervisores.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
            </Select>
            {supervisores.length === 0 && <p className="text-xs text-destructive">Nenhum supervisor habilitado. Habilite em Parâmetros &gt; Veículos &gt; Parâmetros Específicos.</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="renovar_senha">Senha de login do supervisor</Label>
            <Input id="renovar_senha" type="password" autoComplete="off" autoFocus={!!proprio} value={senha} onChange={(e) => { setSenha(e.target.value); setErro(""); }} />
            {import.meta.env.VITE_DEMO_MODE !== "false" && <p className="text-xs text-muted-foreground">Na demonstração, a senha de login de todos os usuários é &quot;{SENHA_DEMONSTRACAO}&quot;.</p>}
          </div>
          {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={fechar}>Cancelar</Button>
            <Button type="submit" disabled={supervisores.length === 0 || !supervisorId || !senha || !ate}>Validar e renovar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
