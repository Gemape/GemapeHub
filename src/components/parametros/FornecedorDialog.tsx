import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { salvarFornecedor, type Fornecedor, type FornecedorDados } from "@/lib/fornecedores-demo";
import { capitalizarNomePessoa, capitalizarTexto, formatarCep, formatarCnpj, formatarTelefone } from "@/lib/formatacao-cadastral";
import { aoDigitarMascarado } from "@/lib/mascaras";

const camposEndereco = [
  { nome: "rua", rotulo: "Rua/Av." },
  { nome: "numero", rotulo: "Nº" },
  { nome: "bairro", rotulo: "Bairro" },
  { nome: "cep", rotulo: "CEP" },
  { nome: "cidade", rotulo: "Cidade" },
  { nome: "estado", rotulo: "Estado" },
  { nome: "pais", rotulo: "País" },
] as const;
const camposContato = [
  { nome: "inscricao_estadual", rotulo: "Inscrição Estadual" },
  { nome: "telefone", rotulo: "Telefone" },
  { nome: "contato", rotulo: "Contato" },
] as const;

// Janela de cadastro de fornecedor, usada em Cadastros > Fornecedores e dentro do Novo código de fábrica.
// `editando` mantém o cadastro existente ao salvar; `modelo` preenche os campos de um cadastro novo (clonagem).
export function FornecedorDialog({ aberto, onAberto, editando, modelo, codigoPrevisto, onSalvo }: {
  aberto: boolean;
  onAberto: (aberto: boolean) => void;
  editando: Fornecedor | null;
  modelo: Fornecedor | null;
  codigoPrevisto: string;
  onSalvo: (fornecedor: Fornecedor) => void;
}) {
  const base = editando ?? modelo;

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    // A janela pode ficar dentro de outro <form> (Código de fábrica); o envio não pode subir até ele.
    evento.stopPropagation();
    const formulario = new FormData(evento.currentTarget);
    const texto = (nome: string) => String(formulario.get(nome) ?? "").trim();
    const valores: FornecedorDados = {
      razao_social: capitalizarTexto(texto("razao_social")),
      nome_fantasia: capitalizarTexto(texto("nome_fantasia")),
      cnpj: texto("cnpj"),
      rua: capitalizarTexto(texto("rua")),
      numero: texto("numero"),
      bairro: capitalizarTexto(texto("bairro")),
      cep: texto("cep"),
      cidade: capitalizarTexto(texto("cidade")),
      estado: texto("estado"),
      pais: capitalizarTexto(texto("pais")),
      inscricao_estadual: texto("inscricao_estadual"),
      telefone: texto("telefone"),
      contato: capitalizarNomePessoa(texto("contato")),
      observacoes: capitalizarTexto(texto("observacoes")),
      // O campo categoria saiu da tela (decisão 55); o que já estava gravado fica como está.
      categorias: editando?.categorias ?? [],
    };
    try {
      const salvo = salvarFornecedor(editando ? { ...valores, id: editando.id } : valores);
      onAberto(false);
      toast.success("Fornecedor salvo");
      onSalvo(salvo);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar o fornecedor.");
    }
  }

  return (
      <Dialog open={aberto} onOpenChange={onAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar fornecedor" : modelo ? "Clonar fornecedor" : "Novo fornecedor"}</DialogTitle>
            <DialogDescription>Informações cadastrais do fornecedor.</DialogDescription>
          </DialogHeader>
          <form key={editando?.id ?? (modelo ? `clone-${modelo.id}` : "novo")} onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="codigo">Código do fornecedor</Label><Input id="codigo" readOnly tabIndex={-1} className="bg-muted font-mono" value={codigoPrevisto} /><p className="text-xs text-muted-foreground">Gerado automaticamente.</p></div>
            <div className="hidden sm:block" />
            <div className="space-y-1.5"><Label htmlFor="razao_social">Razão Social</Label><Input id="razao_social" name="razao_social" capitalizar="texto" required defaultValue={base?.razao_social ?? ""} /></div>
            <div className="space-y-1.5"><Label htmlFor="nome_fantasia">Nome Fantasia</Label><Input id="nome_fantasia" name="nome_fantasia" capitalizar="texto" defaultValue={base?.nome_fantasia ?? ""} /></div>
            <div className="space-y-1.5"><Label htmlFor="cnpj">CNPJ</Label><Input id="cnpj" name="cnpj" inputMode="numeric" onInput={aoDigitarMascarado("cnpj")} required defaultValue={formatarCnpj(base?.cnpj ?? "")} /></div>
            <h2 className="border-b pb-1 text-sm font-semibold sm:col-span-2">Endereço</h2>
            {camposEndereco.map((campo) => <div key={campo.nome} className="space-y-1.5">
              <Label htmlFor={campo.nome}>{campo.rotulo}</Label>
              <Input id={campo.nome} name={campo.nome} {...(["rua", "bairro", "cidade", "pais"].includes(campo.nome) ? { capitalizar: "texto" as const } : {})} inputMode={campo.nome === "cep" ? "numeric" : undefined} onInput={aoDigitarMascarado(campo.nome)} defaultValue={campo.nome === "cep" ? formatarCep(base?.cep ?? "") : base?.[campo.nome] ?? ""} />
            </div>)}
            <h2 className="border-b pb-1 text-sm font-semibold sm:col-span-2">Contato e informações adicionais</h2>
            {camposContato.map((campo) => <div key={campo.nome} className="space-y-1.5">
              <Label htmlFor={campo.nome}>{campo.rotulo}</Label>
              <Input id={campo.nome} name={campo.nome} {...(campo.nome === "contato" ? { capitalizar: "nome" as const } : {})} inputMode={campo.nome === "telefone" ? "tel" : undefined} onInput={aoDigitarMascarado(campo.nome)} defaultValue={campo.nome === "telefone" ? formatarTelefone(base?.telefone ?? "") : base?.[campo.nome] ?? ""} />
            </div>)}
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="observacoes">Observações</Label><Textarea id="observacoes" name="observacoes" capitalizar="texto" defaultValue={base?.observacoes ?? ""} /></div>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => onAberto(false)}>Cancelar</Button>
              <Button requiresWrite type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
  );
}
