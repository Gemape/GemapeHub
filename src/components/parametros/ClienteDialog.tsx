import { useEffect, useRef } from "react";
import { ehExemplo } from "@/lib/dados-teste/exemplo-id";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { salvarCliente, type Cliente, type ClienteDados } from "@/lib/clientes-demo";
import { capitalizarNomePessoa, capitalizarTexto, formatarTelefone } from "@/lib/formatacao-cadastral";
import { aoDigitarMascarado } from "@/lib/mascaras";
import { useErrosCampos } from "@/lib/use-erros-campos";
import { ErroCampo } from "@/components/ErroCampo";
import { validarCnpjCampo, validarCpfSimples, validarEmailCampo, validarTelefoneCampo } from "@/lib/validacao-campos";

// Janela de cadastro de cliente, usada em Parâmetros > Clientes e dentro do Formulário de Despesas.
// `base` preenche os campos (edição ou clonagem); `editando` mantém o cadastro existente ao salvar.
export function ClienteDialog({ aberto, onAberto, editando, modelo, codigoPrevisto, onSalvo }: {
  aberto: boolean;
  onAberto: (aberto: boolean) => void;
  editando: Cliente | null;
  modelo: Cliente | null;
  codigoPrevisto: string;
  onSalvo: (cliente: Cliente) => void;
}) {
  const base = editando ?? modelo;
  const { erro, campo, idErro } = useErrosCampos(`${aberto}-${editando?.id ?? modelo?.id ?? ""}`);
  // A janela fecha com animação: um segundo clique em Salvar nesse intervalo gravaria o cliente de novo.
  const trava = useRef(false);
  useEffect(() => {
    if (aberto) trava.current = false;
  }, [aberto]);

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    // A janela fica dentro de outro <form> no formulário de despesas; o envio não pode subir até ele.
    evento.stopPropagation();
    if (trava.current) return;
    const formulario = new FormData(evento.currentTarget);
    const texto = (nome: string) => String(formulario.get(nome) ?? "").trim();
    const valores: ClienteDados = {
      nome: capitalizarNomePessoa(texto("nome")),
      cpf: texto("cpf"),
      cnpj: texto("cnpj"),
      endereco: capitalizarTexto(texto("endereco")),
      contato: capitalizarNomePessoa(texto("contato")),
      telefone: texto("telefone"),
      telefone2: texto("telefone2"),
      email: texto("email"),
      observacao: capitalizarTexto(texto("observacao")),
    };
    try {
      const salvo = salvarCliente(editando ? { ...valores, id: editando.id } : valores);
      trava.current = true;
      onAberto(false);
      toast.success("Cliente salvo");
      onSalvo(salvo);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar o cliente.");
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={onAberto}>
      <DialogContent telaCheia className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar cliente" : modelo && !ehExemplo(modelo) ? "Clonar cliente" : "Novo cliente"}</DialogTitle>
          <DialogDescription>Só o nome é obrigatório.</DialogDescription>
        </DialogHeader>
        <form key={editando?.id ?? (modelo ? `clone-${modelo.id}` : "novo")} onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="codigo">Código do cliente</Label><Input id="codigo" readOnly tabIndex={-1} className="bg-muted font-mono" value={codigoPrevisto} /><p className="text-xs text-muted-foreground">Gerado automaticamente.</p></div>
          <div className="hidden sm:block" />
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="nome">Nome do cliente</Label><Input id="nome" name="nome" capitalizar="nome" required defaultValue={base?.nome ?? ""} /></div>
          <div className="space-y-1.5"><Label htmlFor="cpf">CPF</Label><Input id="cpf" name="cpf" inputMode="numeric" maxLength={14} placeholder="000.000.000-00" onInput={aoDigitarMascarado("cpf")} {...campo("cpf", validarCpfSimples)} defaultValue={base?.cpf ?? ""} /><ErroCampo id={idErro("cpf")} texto={erro("cpf")} /></div>
          <div className="space-y-1.5"><Label htmlFor="cnpj">CNPJ</Label><Input id="cnpj" name="cnpj" inputMode="numeric" maxLength={18} placeholder="00.000.000/0000-00" onInput={aoDigitarMascarado("cnpj")} {...campo("cnpj", validarCnpjCampo)} defaultValue={base?.cnpj ?? ""} /><ErroCampo id={idErro("cnpj")} texto={erro("cnpj")} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="contato">Contato</Label><Input id="contato" name="contato" capitalizar="nome" defaultValue={base?.contato ?? ""} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="endereco">Endereço</Label><Input id="endereco" name="endereco" capitalizar="texto" defaultValue={base?.endereco ?? ""} /></div>
          <div className="space-y-1.5"><Label htmlFor="telefone">Telefone</Label><Input id="telefone" name="telefone" inputMode="tel" onInput={aoDigitarMascarado("telefone")} {...campo("telefone", validarTelefoneCampo)} defaultValue={formatarTelefone(base?.telefone ?? "")} /><ErroCampo id={idErro("telefone")} texto={erro("telefone")} /></div>
          <div className="space-y-1.5"><Label htmlFor="telefone2">Telefone 2</Label><Input id="telefone2" name="telefone2" inputMode="tel" onInput={aoDigitarMascarado("telefone2")} {...campo("telefone2", validarTelefoneCampo)} defaultValue={formatarTelefone(base?.telefone2 ?? "")} /><ErroCampo id={idErro("telefone2")} texto={erro("telefone2")} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" capitalizar="minusculas" {...campo("email", validarEmailCampo)} defaultValue={base?.email ?? ""} /><ErroCampo id={idErro("email")} texto={erro("email")} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="observacao">Observação</Label><Textarea id="observacao" name="observacao" capitalizar="texto" defaultValue={base?.observacao ?? ""} /></div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onAberto(false)}>Cancelar</Button>
            <Button requiresWrite type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
