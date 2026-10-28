import { useEffect, useRef } from "react";

// Tela de cadastro aberta de dentro de uma associação de check list: assim que os dados base chegam (pronto), abre o formulário de novo
// cadastro uma vez só; quando ele fecha (salvou ou cancelou), avisa para a associação reaparecer. Sem `direto`, não faz nada.
export function useAbrirDireto(direto: boolean, pronto: boolean, formularioAberto: boolean, abrir: () => unknown, aoConcluir?: () => void) {
  const abriu = useRef(false);
  const visto = useRef(false);
  useEffect(() => {
    if (direto && pronto && !abriu.current) {
      abriu.current = true;
      // Se abrir falhar, devolve o usuário à associação em vez de deixar a janela sem formulário e sem aviso.
      Promise.resolve().then(abrir).catch((erro) => { console.error(erro); aoConcluir?.(); });
    }
  }, [direto, pronto]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!direto) return;
    if (formularioAberto) visto.current = true;
    else if (visto.current) { visto.current = false; aoConcluir?.(); }
  }, [direto, formularioAberto]); // eslint-disable-line react-hooks/exhaustive-deps
}
