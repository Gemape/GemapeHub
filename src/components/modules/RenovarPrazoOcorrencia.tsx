import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { renovarPrazoTratativa, type OcorrenciaVeiculo } from "@/lib/ocorrencias-veiculo";
import { lerPermissoes, usuarioAtivo } from "@/lib/permissoes-demo";
import { lerPrazosOcorrencias } from "@/lib/prazo-ocorrencias";
import { SENHA_DEMONSTRACAO, autorizarRenovacao, supervisoresEfetivos } from "@/lib/supervisores-ocorrencias";

// Renovar o prazo da tratativa (decisão 309): o supervisor valida. Quem já é supervisor renova sem senha; os outros escolhem um supervisor na lista e digitam a senha de
// login dele. A renovação recomeça a contagem do prazo do passo em que a ocorrência está (iniciar ou finalizar a tratativa), a partir de hoje.
export function RenovarPrazoOcorrencia({ ocorrencia, onFechar }: { ocorrencia: OcorrenciaVeiculo | null; onFechar: () => void }) {
  const [supervisorId, setSupervisorId] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const usuarios = lerPermissoes(localStorage).usuarios;
  const quem = usuarioAtivo(localStorage);
  const supervisores = supervisoresEfetivos(usuarios);
  const jaSupervisor = supervisores.some((s) => s.id === quem.id);
  const passo = ocorrencia?.status === "Aberta" ? "iniciar" : "finalizar";
  const dias = lerPrazosOcorrencias()[passo];

  function fechar() {
    setSupervisorId("");
    setSenha("");
    setErro("");
    onFechar();
  }

  function renovar(e: React.FormEvent) {
    e.preventDefault();
    if (!ocorrencia) return;
    try {
      const autorizou = autorizarRenovacao({ usuario: quem, supervisorId, senha }, supervisores);
      renovarPrazoTratativa(ocorrencia.id, { autorizadoPorId: autorizou.id, autorizadoPorNome: autorizou.nome, registradoPorNome: quem.nome });
      toast.success(`Prazo renovado: mais ${dias} dia(s) para ${passo === "iniciar" ? "iniciar" : "finalizar"} a tratativa.`);
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
            {ocorrencia?.codigo}: o prazo para {passo === "iniciar" ? "iniciar" : "finalizar"} a tratativa ({dias} dia(s)) recomeça a contar hoje. A renovação precisa da validação de um supervisor.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={renovar} className="space-y-3">
          {jaSupervisor ? (
            <p className="rounded-md border p-3 text-sm">Você ({quem.nome}) é supervisor e pode renovar o prazo sem digitar a senha.</p>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="renovar_supervisor">Supervisor</Label>
                <Select value={supervisorId} onValueChange={(v) => { setSupervisorId(v); setErro(""); }}>
                  <SelectTrigger id="renovar_supervisor"><SelectValue placeholder="Selecione o supervisor" /></SelectTrigger>
                  <SelectContent>{supervisores.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
                </Select>
                {supervisores.length === 0 && <p className="text-xs text-destructive">Nenhum supervisor habilitado. Habilite em Parâmetros &gt; Veículos &gt; Parâmetros Específicos.</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="renovar_senha">Senha de login do supervisor</Label>
                <Input id="renovar_senha" type="password" autoComplete="off" value={senha} onChange={(e) => { setSenha(e.target.value); setErro(""); }} />
                {import.meta.env.VITE_DEMO_MODE !== "false" && <p className="text-xs text-muted-foreground">Na demonstração, a senha de login de todos os usuários é &quot;{SENHA_DEMONSTRACAO}&quot;.</p>}
              </div>
            </>
          )}
          {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={fechar}>Cancelar</Button>
            <Button type="submit" disabled={!jaSupervisor && (supervisores.length === 0 || !supervisorId || !senha)}>{jaSupervisor ? "Renovar prazo" : "Validar e renovar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
