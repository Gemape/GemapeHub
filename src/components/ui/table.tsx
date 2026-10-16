import * as React from "react";

import { cn } from "@/lib/utils";

// No celular (abaixo de 640 px) cada linha vira um cartão: o rótulo de cada valor vem do cabeçalho da coluna
// (atributo data-label, preenchido aqui e mantido quando as linhas mudam). `semCartoes` mantém a tabela com rolagem lateral.
function rotularCelulas(tabela: HTMLTableElement) {
  const rotulos = Array.from(tabela.querySelectorAll("thead th")).map((th) => (th.textContent ?? "").trim());
  tabela.querySelectorAll("tbody tr").forEach((linha) => {
    Array.from(linha.children).forEach((celula, i) => {
      if (celula.tagName !== "TD") return;
      const rotulo = (celula as HTMLTableCellElement).colSpan > 1 ? "" : (rotulos[i] ?? "");
      if (celula.getAttribute("data-label") !== rotulo) celula.setAttribute("data-label", rotulo);
    });
  });
}

type TableProps = React.HTMLAttributes<HTMLTableElement> & { semCartoes?: boolean };

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, semCartoes, ...props }, ref) => {
    const interna = React.useRef<HTMLTableElement | null>(null);
    React.useImperativeHandle(ref, () => interna.current as HTMLTableElement);
    React.useEffect(() => {
      const tabela = interna.current;
      if (!tabela || semCartoes) return;
      rotularCelulas(tabela);
      const observador = new MutationObserver(() => rotularCelulas(tabela));
      observador.observe(tabela, { childList: true, subtree: true });
      return () => observador.disconnect();
    }, [semCartoes]);
    return (
      <div className={cn("relative w-full overflow-auto", !semCartoes && "tabela-cartoes")}>
        <table ref={interna} className={cn("w-full caption-bottom text-sm", className)} {...props} />
      </div>
    );
  },
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
        className,
      )}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className,
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
));
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
