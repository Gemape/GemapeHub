"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-[oklch(0.12_0.08_262/0.5)] backdrop-blur-sm  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

// Primeiro campo da janela, na ordem da tela: de digitação (texto, número, data, área de texto) ou de escolha (as listas do sistema são
// botões com role=combobox). Fora os de só leitura e os desabilitados.
const PRIMEIRO_CAMPO =
  'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]):not([type=button]):not([type=submit]):not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly]), [role=combobox]:not([disabled])';

// Retrato dos dados dos formulários da janela (fora as buscas: filtrar uma lista não é dado a perder). Fechar fora só é segurado
// quando o retrato mudou desde que a janela abriu: digitar e apagar volta ao começo e a janela fecha normalmente.
function retratoDosFormularios(janela: HTMLElement | null): string {
  if (!janela) return "";
  return Array.from(janela.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("form input, form textarea, form select"))
    .filter((c) => !(c instanceof HTMLInputElement && (c.type === "search" || /^\s*(buscar|pesquisar|filtrar)/i.test(c.placeholder))))
    .map((c) => (c instanceof HTMLInputElement && (c.type === "checkbox" || c.type === "radio") ? String(c.checked) : c.value))
    .join("\u0001");
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { telaCheia?: boolean; semBotaoFechar?: boolean }
>(({ className, children, telaCheia = false, semBotaoFechar = false, onOpenAutoFocus, onInteractOutside, onEscapeKeyDown, ...props }, ref) => {
  // Fechamento seguro: janela só de consulta fecha clicando fora ou com Esc; com dados preenchidos, só pelo Cancelar (ou pelo X).
  const janela = React.useRef<HTMLElement | null>(null);
  const inicial = React.useRef<string | null>(null);
  const segurar = (e: Event) => {
    if (inicial.current === null || retratoDosFormularios(janela.current) === inicial.current) return;
    e.preventDefault();
    toast.info("Há dados preenchidos nesta janela. Use Cancelar para sair sem salvar.", { id: "fechamento-seguro" });
  };
  return (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      onOpenAutoFocus={(e) => {
        janela.current = e.currentTarget as HTMLElement | null;
        inicial.current = retratoDosFormularios(janela.current);
        onOpenAutoFocus?.(e);
        if (e.defaultPrevented) return;
        // O cursor já aparece no primeiro campo. No celular não: o teclado subiria cobrindo a janela.
        if (window.matchMedia?.("(pointer: coarse)").matches) return;
        const campo = (e.currentTarget as HTMLElement | null)?.querySelector<HTMLElement>(PRIMEIRO_CAMPO);
        if (campo) { e.preventDefault(); campo.focus(); }
      }}
      onInteractOutside={(e) => { onInteractOutside?.(e); if (!e.defaultPrevented) segurar(e); }}
      onEscapeKeyDown={(e) => { onEscapeKeyDown?.(e); if (!e.defaultPrevented) segurar(e); }}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid grid-cols-[minmax(0,1fr)] w-full max-w-lg translate-x-[-50%] translate-y-[-50%] max-h-[100dvh] gap-4 overflow-x-hidden overflow-y-auto glass-strong p-6 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg",
        className,
        // Formulários de cadastro: a janela ocupa a tela toda (vem depois de className para vencer o max-w de cada uso).
        telaCheia && "left-0 top-0 h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 content-start rounded-none px-4 pb-6 pt-12 sm:max-w-none sm:rounded-none sm:px-8 sm:pt-6 lg:px-[8vw]",
      )}
      {...props}
    >
      {children}
      {!semBotaoFechar && <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Fechar</span>
      </DialogPrimitive.Close>}
    </DialogPrimitive.Content>
  </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col-reverse gap-2 max-sm:flex-row-reverse max-sm:flex-wrap max-sm:[&>*]:min-w-[7rem] max-sm:[&>*]:flex-1 max-sm:glass-strong max-sm:sticky max-sm:bottom-0 max-sm:-mx-6 max-sm:-mb-6 max-sm:px-6 max-sm:py-3 sm:flex-row sm:justify-end sm:gap-0 sm:space-x-2", className)}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
