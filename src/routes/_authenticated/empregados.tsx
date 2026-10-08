import { createFileRoute } from "@tanstack/react-router";
import { EmpregadosCadastroModulo } from "@/components/modules/EmpregadosCadastroModulo";

export const Route = createFileRoute("/_authenticated/empregados")({
  head: () => ({
    meta: [
      { title: "Empregados | Patrimônio GEMAPE" },
      {
        name: "description",
        content:
          "Cadastro de empregados do grupo GEMAPE com CPF, matrícula, e-mail e datas de admissão e demissão.",
      },
      { property: "og:title", content: "Empregados | Patrimônio GEMAPE" },
      { property: "og:description", content: "Cadastro de empregados do grupo GEMAPE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EmpregadosCadastroModulo,
});
