import { X } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { aplicarNoCampo, type ModoCapitalizacao } from "@/lib/campo-capitalizado";
import { cn } from "@/lib/utils";

// Campo de arquivo em todo o sistema: o botão "Escolher arquivo(s)", no estilo do "Tirar foto", no lugar do campo nativo, que fica escondido
// (o clique no botão abre a escolha; o rótulo, o id e o foco por teclado continuam valendo) e mostra o nome do que foi escolhido.
const CampoArquivo = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, onChange, disabled, multiple, ...props }, ref) => {
  const interno = React.useRef<HTMLInputElement | null>(null);
  const [nomes, setNomes] = React.useState<string[]>([]);
  // Quem zera o campo por código (campo.value = "") não dispara onChange: a cada renderização o nome ao lado acompanha o que o campo tem de fato.
  React.useEffect(() => {
    const atuais = Array.from(interno.current?.files ?? []).map((f) => f.name);
    setNomes((antes) => (antes.length === atuais.length && antes.every((n, i) => n === atuais[i]) ? antes : atuais));
  });
  return (
    <div className={cn("flex w-full min-w-0 items-center gap-3 rounded-md border border-input bg-white/60 px-2 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-ring dark:bg-white/5", className)}>
      <input
        {...props}
        type="file"
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        ref={(el) => {
          interno.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
        onChange={(e) => {
          const campo = e.currentTarget;
          const escolhidos = Array.from(campo.files ?? []).map((f) => f.name);
          onChange?.(e);
          // Quem zera o campo depois de ler (anexos que viram uma lista à parte) fica sem nome ao lado do botão.
          setNomes(campo.files?.length ? escolhidos : []);
        }}
      />
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => interno.current?.click()}>
        {multiple ? "Escolher arquivos" : "Escolher arquivo"}
      </Button>
      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
        {nomes.length === 0 ? "Nenhum arquivo escolhido" : nomes.length === 1 ? nomes[0] : `${nomes.length} arquivos escolhidos`}
      </span>
    </div>
  );
});
CampoArquivo.displayName = "CampoArquivo";

// Campo de busca ou filtro: o que for digitado se apaga com um clique no X (sem selecionar tudo e apertar Backspace).
const ehBusca = (type: string | undefined, placeholder: string | undefined) => type === "search" || /^\s*(buscar|pesquisar|filtrar)/i.test(placeholder ?? "");
// Largura e posição ficam no envoltório do campo; o resto da aparência continua no campo.
const CLASSE_DE_LARGURA = /^(?:[a-z]+:)?-?(?:max-w|min-w|w|basis|flex|grow|shrink|m[trblxy]?|self|order|col|row)(?:-|$)/;
// Aparência única do campo de texto, usada pelo campo comum e pelo de busca.
const BASE_DO_CAMPO = "flex h-9 max-sm:h-11 w-full rounded-md border border-input bg-white/60 dark:bg-white/5 px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

const CampoLimpavel = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, ...props }, ref) => {
  const interno = React.useRef<HTMLInputElement | null>(null);
  const tokens = (className ?? "").split(/\s+/).filter(Boolean);
  const cheio = typeof props.value === "string" && props.value.length > 0;
  function limpar() {
    const campo = interno.current;
    if (!campo) return;
    // O setter nativo + o evento "input" fazem o React chamar o onChange de quem controla o campo.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(campo, "");
    campo.dispatchEvent(new Event("input", { bubbles: true }));
    campo.focus();
  }
  return (
    <div data-campo-limpavel className={cn("relative w-full", tokens.filter((t) => CLASSE_DE_LARGURA.test(t)).join(" "))}>
      <input
        {...props}
        ref={(el) => {
          interno.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
        className={cn(
          BASE_DO_CAMPO, "[&::-webkit-search-cancel-button]:appearance-none",
          tokens.filter((t) => !CLASSE_DE_LARGURA.test(t)).join(" "),
          cheio && "pr-8", // por último: o texto nunca corre por baixo do X
        )}
      />
      {cheio && (
        <button
          type="button" aria-label="Limpar campo" title="Limpar"
          className="absolute right-1.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onClick={limpar}
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
});
CampoLimpavel.displayName = "CampoLimpavel";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input"> & { capitalizar?: ModoCapitalizacao }>(
  ({ className, type, capitalizar, onBlur, onKeyDown, ...props }, ref) => {
    if (type === "file") return <CampoArquivo ref={ref} className={className} {...props} />;
    if (typeof props.value === "string" && ehBusca(type, props.placeholder) && !props.disabled && !props.readOnly && !capitalizar) {
      return <CampoLimpavel ref={ref} type={type} className={className} onBlur={onBlur} onKeyDown={onKeyDown} {...props} />;
    }
    return (
      <input
        type={type}
        className={cn(
          BASE_DO_CAMPO, "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          className,
        )}
        ref={ref}
        onBlur={(e) => {
          if (capitalizar) aplicarNoCampo(e.currentTarget, capitalizar);
          onBlur?.(e);
        }}
        onKeyDown={(e) => {
          // Enter envia o formulário sem sair do campo: corrige antes.
          if (capitalizar && e.key === "Enter") aplicarNoCampo(e.currentTarget, capitalizar);
          onKeyDown?.(e);
        }}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
