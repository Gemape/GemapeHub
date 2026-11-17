import { useRef, useState } from "react";
import { confirmarTexto } from "@/components/ConfirmarAcao";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { executar, useParametrosBase } from "@/lib/use-parametros-base";

// "Cadastrar padrão" nunca implanta nada de uma vez: a janela lista só o que ainda falta, nada vem marcado, o responsável escolhe
// item a item e confirma antes de gravar (decisão 294). Depois de confirmar, tudo é gravado de uma vez.
export function CadastrarPadraoSelecionado({
  rotulo = "Cadastrar padrão",
  singular,
  plural,
  pendentes,
  cadastrar,
}: {
  rotulo?: string;
  singular: string;
  plural: string;
  pendentes: () => { nome: string; itens?: readonly string[] }[];
  cadastrar: (nomes: string[]) => unknown;
}) {
  useParametrosBase(); // atualiza a lista quando o cadastro muda
  const [aberto, setAberto] = useState(false);
  const [marcados, setMarcados] = useState<string[]>([]);
  const salvando = useRef(false);
  const lista = aberto ? pendentes() : [];

  const alternar = (nome: string, marcar: boolean) => setMarcados((atual) => (marcar ? [...atual, nome] : atual.filter((n) => n !== nome)));

  async function salvar() {
    if (salvando.current || marcados.length === 0) return;
    if (!(await confirmarTexto(`Cadastrar ${marcados.length} ${marcados.length === 1 ? singular : plural} do padrão?`, { rotuloConfirmar: "Cadastrar" }))) return;
    salvando.current = true;
    const ok = executar(() => {
      cadastrar(marcados);
      toast.success(`${marcados.length} ${marcados.length === 1 ? singular : plural} do padrão ${marcados.length === 1 ? "cadastrado" : "cadastrados"}.`);
    });
    if (ok) setAberto(false);
    setTimeout(() => { salvando.current = false; }, 400);
  }

  return (
    <>
      <Button requiresWrite variant="outline" onClick={() => { setMarcados([]); setAberto(true); }}>
        {rotulo}
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{rotulo}</DialogTitle>
            <DialogDescription>
              Estes são os itens do padrão que ainda não estão cadastrados. Marque um a um os que quer cadastrar: nada é cadastrado sem a sua escolha e confirmação.
            </DialogDescription>
          </DialogHeader>
          {lista.length === 0 ? (
            <p className="rounded-md border p-4 text-sm text-muted-foreground">Todos os itens do padrão já estão cadastrados.</p>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{marcados.length} de {lista.length} marcados</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => setMarcados([])} disabled={marcados.length === 0}>
                  Desmarcar todos
                </Button>
              </div>
              <div className="max-h-[50vh] space-y-1 overflow-y-auto rounded-md border p-2">
                {lista.map((p, n) => (
                  <label key={p.nome} htmlFor={`cadastrar-padrao-${n}`} className="flex cursor-pointer items-start gap-3 rounded px-2 py-1.5 hover:bg-muted/60">
                    <Checkbox id={`cadastrar-padrao-${n}`} className="mt-0.5" checked={marcados.includes(p.nome)} onCheckedChange={(v) => alternar(p.nome, v === true)} />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{p.nome}</span>
                      {p.itens && p.itens.length > 0 && <span className="block text-xs text-muted-foreground">{p.itens.join(" · ")}</span>}
                    </span>
                  </label>
                ))}
              </div>
            </>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={salvar} disabled={marcados.length === 0}>
              Cadastrar selecionados
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
