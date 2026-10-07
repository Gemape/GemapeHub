import * as React from "react";

import { aplicarNoCampo, type ModoCapitalizacao } from "@/lib/campo-capitalizado";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea"> & { capitalizar?: ModoCapitalizacao }>(
  ({ className, capitalizar, onBlur, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-white/60 dark:bg-white/5 px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        onBlur={(e) => {
          if (capitalizar) aplicarNoCampo(e.currentTarget, capitalizar);
          onBlur?.(e);
        }}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
