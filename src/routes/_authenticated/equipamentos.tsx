import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/equipamentos")({
  head: () => ({ meta: [{ title: "Equipamentos | Patrimônio GEMAPE" }] }),
  component: PaginaEquipamentosModulo,
});

// Módulo Equipamentos: os dados vêm de Parâmetros > Equipamentos > Cadastrar equipamento; a lógica e as funcionalidades do módulo vêm depois.
function PaginaEquipamentosModulo() {
  return (
    <div className="space-y-5">
      <header>
        <p className="text-eyebrow">Módulo</p>
        <h1 className="text-2xl font-bold">Equipamentos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Os equipamentos são cadastrados em Parâmetros &gt; Equipamentos &gt; Cadastrar equipamento.</p>
      </header>
      <section className="panel p-6">
        <p className="font-medium">Módulo em construção</p>
        <p className="mt-1 text-sm text-muted-foreground">A lógica e as funcionalidades deste módulo serão construídas depois do cadastro em Parâmetros.</p>
      </section>
    </div>
  );
}
