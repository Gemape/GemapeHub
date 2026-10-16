import * as React from "react";

import { aplicarNoCampo, type ModoCapitalizacao } from "@/lib/campo-capitalizado";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input"> & { capitalizar?: ModoCapitalizacao }>(
  ({ className, type, capitalizar, onBlur, onKeyDown, ...props }, ref) => {
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
