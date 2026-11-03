import { CaixaDuplaEmpregados } from "@/components/parametros/CaixaDuplaEmpregados";
import { PrazosIndicadores } from "@/components/parametros/IndicadoresViagens";
import { Link } from "@tanstack/react-router";
import { useAccess } from "@/lib/access-context";
import { ID_HABILITADOS, lerEstado, salvarPergunta, type Habilitado } from "@/lib/questionario-despesas";

// Parâmetros > Viagens > Parâmetros Específicos (decisões 299 e 334): os empregados habilitados a lançar despesas no questionário de despesas e, abaixo, os dois prazos (dias para lançar
// a despesa e dias para fechar o relatório de despesas). A lista é a mesma da pergunta
// "Quem está lançando" (pergunta 04): quem fica inativo no cadastro sai do questionário sozinho.
const carregar = (): Habilitado[] => lerEstado().perguntas.find((p) => p.id === ID_HABILITADOS)?.habilitados ?? [];
function gravar(habilitados: Habilitado[]): void {
  const estado = lerEstado();
  const q04 = estado.perguntas.find((p) => p.id === ID_HABILITADOS);
  if (!q04) throw new Error("A pergunta de quem está lançando não foi encontrada no questionário.");
  salvarPergunta(estado, { ...q04, habilitados });
}

export function HabilitarEmpregadosViagens() {
  const { podeVerCaminho } = useAccess();
  const caminhoDasFaixas = "Parâmetros > Veículos > Parâmetros Específicos";
  return (
    <>
      <CaixaDuplaEmpregados
        idBase="viagens"
        titulo="Parâmetros Específicos"
        descricao="Escolha, entre todos os empregados ativos, quem fica habilitado a lançar despesas no questionário de despesas. Marque à esquerda e passe para a direita; a área de cada habilitado define o que ele vê no formulário. Nada vale até clicar em Salvar, logo abaixo das duas caixas; os prazos, mais abaixo, têm o seu próprio botão."
        tituloDireita="Habilitados para o questionário de despesas"
        mensagemSalvo="Empregados habilitados salvos."
        carregar={carregar}
        gravar={gravar}
      />
      <section className="mx-auto max-w-5xl space-y-3 px-4 pb-6" aria-labelledby="prazos-viagens">
        <div className="max-w-3xl">
          <h2 id="prazos-viagens" className="text-lg font-semibold">Prazos de lançamento e de fechamento</h2>
          <p className="text-sm text-muted-foreground">
            Quantos dias o técnico mecânico tem para lançar a despesa e quantos o PCM tem para fechar o relatório de despesas. Medem os índices de Viagens; as faixas de desempenho ficam em{" "}
            {podeVerCaminho("/cadastros/gerais/categorias", { de: "veiculos" }) ? (
              <Link to="/cadastros/gerais/categorias" search={{ de: "veiculos" }} className="font-medium text-primary underline underline-offset-2">{caminhoDasFaixas}</Link>
            ) : (
              caminhoDasFaixas
            )}
            .
          </p>
        </div>
        <PrazosIndicadores />
      </section>
    </>
  );
}
