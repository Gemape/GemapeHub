import { FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EscolherCamposRelatorio } from "@/components/EscolherCamposRelatorio";
import { Button } from "@/components/ui/button";
import { montarRelatorioCadastroHtml, type CampoRelatorio } from "@/lib/relatorio-cadastro";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";

// Botão "Relatório" dos Cadastros (decisão 377): abre a janela com uma caixa de marcação por campo e gera o relatório no visualizador do sistema, com a lista como está na tela
// (a busca vale). `nome` é o plural em minúsculas ("clientes"), usado no título e no nome do arquivo.
export function RelatorioCadastro<T>({ nome, campos, linhas, empresa, filtro }: { nome: string; campos: readonly CampoRelatorio<T>[]; linhas: readonly T[]; empresa?: string; filtro?: string }) {
  const [aberto, setAberto] = useState(false);
  const titulo = `Relatório de ${nome}`;

  function gerar(escolhidos: string[]) {
    try {
      const html = montarRelatorioCadastroHtml({ titulo, campos, escolhidos, linhas, empresa, subtitulos: filtro ? [`Busca: ${filtro}`] : [] });
      abrirDocumento({ titulo, html, arquivo: nomeArquivoDocumento(titulo) });
      setAberto(false);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível gerar o relatório.");
    }
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setAberto(true)}>
        <FileText className="h-4 w-4" /> Relatório
      </Button>
      <EscolherCamposRelatorio
        aberto={aberto}
        onAberto={setAberto}
        titulo={titulo}
        descricao={`Marque os campos que devem sair no relatório. Sai a lista como está na tela (${linhas.length} registro${linhas.length === 1 ? "" : "s"}).`}
        campos={campos.map((c) => ({ id: c.id, rotulo: c.rotulo, ...(c.padrao === false ? { padrao: false } : {}) }))}
        prefixo={`rel-${nome}`}
        onGerar={gerar}
      />
    </>
  );
}
