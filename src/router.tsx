import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    basepath: import.meta.env["BASE_URL"],
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 30_000,
    // carrega a próxima tela assim que o mouse passa (ou o dedo toca) no link: o clique já encontra tudo pronto
    defaultPreload: "intent",
  });

  return router;
};
