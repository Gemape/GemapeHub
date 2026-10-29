// Viagens dos dados de teste: cada viagem é uma resposta do Questionário de Despesas, aqui de abastecimento, ligada a um abastecimento de um veículo
// de teste e a um técnico (empregado de teste) habilitado ao questionário. Usa as mesmas conferências e gravação da tela de Viagens.
import { EMPREGADOS, PREFIXO } from "./conjunto.ts";
import { ID_HABILITADOS, lerEstado, salvarPergunta, type AreaViagem } from "../questionario-despesas.ts";
import { registrarResposta } from "../respostas-despesas.ts";
import { lerAbastecimentos } from "../registros-veiculo.ts";

type Armazenamento = Pick<Storage, "getItem" | "setItem" | "removeItem">;

// Imagem mínima do comprovante (1×1 pixel): a despesa exige foto, e o teste não precisa de um documento de verdade.
const COMPROVANTE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
// Os cinco primeiros empregados de teste (os das viagens) ficam na Oficina: técnico da Oficina lança a própria despesa; PCM e Administrativo só lançam pelo técnico, com perguntas a mais.
// Do sexto em diante entram como PCM, para os check lists de teste do PCM (decisão 322) terem responsáveis dessa área nos indicadores.
const AREA: AreaViagem = "Oficina";
export const PRIMEIRO_PCM_DE_TESTE = 5;
const DESTINOS = [
  { uf: "Minas Gerais - MG", municipio: "Passos", cliente: "Agropecuária Vale Verde Ltda" },
  { uf: "São Paulo - SP", municipio: "Rio Claro", cliente: "Usina Rio Claro Açúcar e Álcool S.A." },
  { uf: "São Paulo - SP", municipio: "Itu", cliente: "Cerâmica Pedra Bonita Ltda" },
  { uf: "Minas Gerais - MG", municipio: "Ouro Preto", cliente: "Mineração Serra Dourada S.A." },
  { uf: "Minas Gerais - MG", municipio: "Uberlândia", cliente: "Transportadora Estrela do Sul Ltda" },
] as const;

export function semearViagens(storage: Armazenamento, agora: Date): void {
  // Os três empregados de teste viram técnicos habilitados do questionário (cada um numa área).
  let estado = lerEstado(storage);
  const pergunta = estado.perguntas.find((p) => p.id === ID_HABILITADOS);
  if (!pergunta) throw new Error("O questionário de despesas não tem a pergunta de técnico responsável.");
  const novos = EMPREGADOS.map((e, i) => ({ empregadoId: e.id, nome: e.nome, area: i >= PRIMEIRO_PCM_DE_TESTE ? "PCM" as AreaViagem : AREA }));
  estado = salvarPergunta(estado, { ...pergunta, habilitados: [...(pergunta.habilitados ?? []).filter((h) => !h.empregadoId?.startsWith(PREFIXO)), ...novos] }, storage);

  const cartoes = estado.perguntas.find((p) => p.id === "q-02")?.opcoes ?? [];
  if (cartoes.length === 0) throw new Error("O questionário de despesas não tem cartões de crédito cadastrados.");
  const abastecimentos = lerAbastecimentos(storage).filter((a) => a.id.startsWith(PREFIXO)).sort((a, b) => a.id.localeCompare(b.id));
  if (abastecimentos.length !== DESTINOS.length) throw new Error("Os abastecimentos de teste não estão gravados; as viagens de teste não puderam ser criadas.");
  abastecimentos.forEach((ab, i) => {
    const tecnico = EMPREGADOS[i]!;
    const destino = DESTINOS[i]!;
    const dia = new Date(agora.getTime() - (14 - i * 3) * 86_400_000);
    const resposta = registrarResposta(estado, {
      "q-03": ["Abastecimento"],
      "q-04": [`${tecnico.nome} (${AREA})`],
      "q-08": ab.data,
      "q-05": destino.uf,
      "q-06": destino.municipio,
      "q-07": destino.cliente,
      // O vínculo com o abastecimento de Veículos só vale com a pergunta do cartão visível, ou seja, com a moeda Cartão de crédito.
      "q-01": ["Cartão de crédito"],
      "q-02": [cartoes[i % cartoes.length]!],
      "q-10": Number(ab.litros).toFixed(2).replace(".", ","),
      "q-11": (ab.valor ?? 0).toFixed(2).replace(".", ","),
      "q-12": ["comprovante.png"],
      "abastecimento:id": ab.id,
    }, storage, dia, { "q-12": [{ nome: "comprovante.png", dataUrl: COMPROVANTE }] });
    const guardadas = JSON.parse(storage.getItem("gemape-demo-respostas-despesas") ?? "[]") as { id: string }[];
    for (const r of guardadas) if (r.id === resposta.id) r.id = `${PREFIXO}viagem-${i + 1}`;
    storage.setItem("gemape-demo-respostas-despesas", JSON.stringify(guardadas));
  });
}
