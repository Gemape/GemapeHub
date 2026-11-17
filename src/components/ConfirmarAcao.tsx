import { useEffect, useRef, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Confirmação em janela do sistema no lugar do confirm() do navegador: o título cita o item ("Excluir Furadeira 04?") e o botão diz a ação.
// Uso: `if (!(await confirmarExclusao(item.nome))) return;` ou `await confirmar({ titulo, descricao, rotuloConfirmar })`.
export type OpcoesConfirmacao = {
  titulo: string;
  descricao?: string;
  /** Texto do botão que confirma ("Excluir", "Restaurar"…). */
  rotuloConfirmar?: string;
  /** Botão vermelho: ação que apaga ou não se desfaz. */
  destrutivo?: boolean;
};

type Pedido = OpcoesConfirmacao & { resolver: (ok: boolean) => void };
let anfitriao: ((p: Pedido) => void) | null = null;

export function confirmar(opcoes: OpcoesConfirmacao): Promise<boolean> {
  return new Promise((resolver) => {
    // Sem a janela montada (teste, tela fora do layout): cai no confirm() do navegador, para a ação nunca passar sem pergunta.
    if (!anfitriao) { resolver(typeof window !== "undefined" && window.confirm([opcoes.titulo, opcoes.descricao].filter(Boolean).join("\n\n"))); return; }
    anfitriao({ ...opcoes, resolver });
  });
}

/** Exclusão: o título traz o nome do item e o aviso (se houver) vai na descrição. */
export const confirmarExclusao = (nome: string, aviso?: string) =>
  confirmar({ titulo: `Excluir ${nome}?`, ...(aviso ? { descricao: aviso } : {}), rotuloConfirmar: "Excluir", destrutivo: true });

/** Frase pronta ("Restaurar X? Os dados voltam…"): a pergunta vira o título e o resto, a descrição. */
export function confirmarTexto(texto: string, extra: Pick<OpcoesConfirmacao, "rotuloConfirmar" | "destrutivo"> = {}) {
  const i = texto.indexOf("?");
  const titulo = i === -1 ? texto : texto.slice(0, i + 1);
  const resto = i === -1 ? "" : texto.slice(i + 1).trim();
  return confirmar({ titulo, ...(resto ? { descricao: resto } : {}), ...extra });
}

// Montada uma vez no layout autenticado.
export function ConfirmarAcaoHost() {
  // O conteúdo fica até a animação de saída acabar: só `aberto` muda ao responder.
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [aberto, setAberto] = useState(false);
  const atual = useRef<Pedido | null>(null);
  useEffect(() => {
    const meu = (novo: Pedido) => { atual.current?.resolver(false); atual.current = novo; setPedido(novo); setAberto(true); };
    anfitriao = meu;
    return () => {
      // Sai da tela com a janela aberta: quem espera recebe "não" em vez de ficar pendurado.
      atual.current?.resolver(false);
      atual.current = null;
      if (anfitriao === meu) anfitriao = null;
    };
  }, []);
  const responder = (ok: boolean) => { atual.current?.resolver(ok); atual.current = null; setAberto(false); };
  return (
    <AlertDialog open={aberto} onOpenChange={(a) => { if (!a) responder(false); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{pedido?.titulo}</AlertDialogTitle>
          {pedido?.descricao && <AlertDialogDescription className="whitespace-pre-line">{pedido.descricao}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className={cn(pedido?.destrutivo && buttonVariants({ variant: "destructive" }))}
            onClick={() => responder(true)}
          >
            {pedido?.rotuloConfirmar ?? "Confirmar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
