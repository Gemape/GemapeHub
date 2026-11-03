import { CaixaDuplaEmpregados } from "@/components/parametros/CaixaDuplaEmpregados";
import { useState } from "react";
import { FaixasDesempenho, PrazosIndicadores } from "@/components/parametros/IndicadoresViagens";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ID_HABILITADOS, lerEstado, salvarPergunta, type Habilitado } from "@/lib/questionario-despesas";

// Parâmetros > Viagens > Parâmetros Específicos (decisões 299, 334 e 335): os empregados habilitados a lançar despesas no questionário de despesas e, abaixo, os dois prazos (dias para lançar
// a despesa e dias para fechar o relatório de despesas) e as faixas de desempenho. A lista é a mesma da pergunta
// "Quem está lançando" (pergunta 04): quem fica inativo no cadastro sai do questionário sozinho.
const carregar = (): Habilitado[] => lerEstado().perguntas.find((p) => p.id === ID_HABILITADOS)?.habilitados ?? [];
function gravar(habilitados: Habilitado[]): void {
  const estado = lerEstado();
  const q04 = estado.perguntas.find((p) => p.id === ID_HABILITADOS);
  if (!q04) throw new Error("A pergunta de quem está lançando não foi encontrada no questionário.");
  salvarPergunta(estado, { ...q04, habilitados });
}

export function HabilitarEmpregadosViagens() {
  return (
    <>
      <CaixaDuplaEmpregados
        idBase="viagens"
        titulo="Parâmetros Específicos"
        descricao="Escolha, entre todos os empregados ativos, quem fica habilitado a lançar despesas no questionário de despesas. Marque à esquerda e passe para a direita; a área de cada habilitado define o que ele vê no formulário. Nada vale até clicar em Salvar, logo abaixo das duas caixas; os prazos e as faixas de desempenho, mais abaixo, têm cada um o seu próprio botão."
        tituloDireita="Habilitados para o questionário de despesas"
        mensagemSalvo="Empregados habilitados salvos."
        carregar={carregar}
        gravar={gravar}
      />
      <section className="mx-auto max-w-5xl space-y-3 px-4 pb-6" aria-labelledby="prazos-viagens">
        <div className="max-w-3xl">
          <h2 id="prazos-viagens" className="text-lg font-semibold">Prazos de lançamento e de fechamento</h2>
          <p className="text-sm text-muted-foreground">
            Quantos dias o técnico mecânico tem para lançar a despesa e quantos o PCM tem para fechar o relatório de despesas. Medem os índices de Viagens; as faixas de desempenho que os classificam estão logo abaixo.
          </p>
        </div>
        <PrazosIndicadores />
      </section>
      <section className="mx-auto max-w-5xl space-y-3 px-4 pb-6" aria-labelledby="faixas-viagens">
        <h2 id="faixas-viagens" className="sr-only">Faixas de desempenho</h2>
        {/* As faixas dos índices de Viagens (decisão 350): independentes da cópia de Parâmetros > Veículos > Parâmetros Específicos, que vale para os indicadores de veículos. */}
        <FaixasDesempenho dominio="viagens" />
      </section>
    </>
  );
}

// A mesma caixa dupla numa janela sobre o Questionário de Despesas (decisão 336): o link do card da pergunta abre este preenchimento sem sair do formulário em montagem (sair da página
// descartaria o rascunho). Salva direto, como a tela de Parâmetros Específicos, e avisa o questionário (`aoSalvar`) para a lista do rascunho acompanhar. Fechar volta ao questionário.
export function DialogHabilitarEmpregadosViagens({ aberto, onAbrirMudou, carregarDoQuestionario, aoSalvar }: {
  aberto: boolean;
  onAbrirMudou: (aberto: boolean) => void;
  // A lista que o questionário mostra agora (a do rascunho, que pode diferir da publicada depois de "Restaurar configurações iniciais"); sem ela, vale a publicada.
  carregarDoQuestionario?: () => Habilitado[];
  aoSalvar: (habilitados: Habilitado[]) => void;
}) {
  const [pendente, setPendente] = useState(false);
  // Fechar com mover/área ainda sem salvar perde a alteração: pergunta antes (Esc, clique fora e X passam por aqui).
  const aoMudar = (abrir: boolean) => {
    if (!abrir && pendente && !confirm("Há alterações nos empregados habilitados que ainda não foram salvas. Fechar e perdê-las?")) return;
    if (!abrir) setPendente(false);
    onAbrirMudou(abrir);
  };
  return (
    <Dialog open={aberto} onOpenChange={aoMudar}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Empregados habilitados a lançar despesas</DialogTitle>
          <DialogDescription>
            Parâmetros &gt; Viagens &gt; Parâmetros Específicos. Marque à esquerda e passe para a direita; a área de cada habilitado define o que ele vê no formulário. Nada vale até clicar em Salvar. Ao fechar
            esta janela você volta ao questionário, no ponto em que estava.
          </DialogDescription>
        </DialogHeader>
        <CaixaDuplaEmpregados
          secao
          semCabecalho
          aoMudarAlterado={setPendente}
          idBase="viagens-janela"
          titulo="Habilitados"
          descricao=""
          tituloDireita="Habilitados para o questionário de despesas"
          mensagemSalvo="Empregados habilitados salvos."
          carregar={carregarDoQuestionario ?? carregar}
          gravar={(habilitados) => {
            gravar(habilitados);
            aoSalvar(habilitados);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
