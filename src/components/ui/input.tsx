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

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input"> & { capitalizar?: ModoCapitalizacao }>(
  ({ className, type, capitalizar, onBlur, onKeyDown, ...props }, ref) => {
    if (type === "file") return <CampoArquivo ref={ref} className={className} {...props} />;
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 max-sm:h-11 w-full rounded-md border border-input bg-white/60 dark:bg-white/5 px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
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
