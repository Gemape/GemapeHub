// Viagens dos dados de teste: cada viagem é uma resposta do Questionário de Despesas. Cinco são de abastecimento, ligadas a um abastecimento de um veículo
// de teste; os 15 empregados de teste ainda ganham cinco despesas cada, para o painel e o relatório. Usa as mesmas conferências e gravação da tela de Viagens.
import { EMPREGADOS, PREFIXO } from "./conjunto.ts";
import { ID_HABILITADOS, ID_NOME_EMPREGADO, ID_PCM_RESPONDE, OPCAO_AVULSO, TIPOS_ORDEM_VIAGENS, TIPO_COM_DETALHAMENTO, lerEstado, salvarPergunta, type AreaViagem } from "../questionario-despesas.ts";
import { registrarResposta } from "../respostas-despesas.ts";
import { lerAbastecimentos } from "../registros-veiculo.ts";

type Armazenamento = Pick<Storage, "getItem" | "setItem" | "removeItem">;

// Imagem mínima do comprovante (1×1 pixel): a despesa exige foto, e o teste não precisa de um documento de verdade.
const COMPROVANTE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
// Os cinco primeiros empregados de teste ficam na Oficina: técnico da Oficina lança a própria despesa; PCM e Administrativo só lançam pelo técnico, com perguntas a mais.
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

// Dá à resposta recém-gravada um id previsível (com o prefixo de teste), para o reaplicar dos dados poder apagá-la.
function renomear(storage: Armazenamento, de: string, para: string): void {
  const guardadas = JSON.parse(storage.getItem("gemape-demo-respostas-despesas") ?? "[]") as { id: string }[];
  for (const r of guardadas) if (r.id === de) r.id = para;
  storage.setItem("gemape-demo-respostas-despesas", JSON.stringify(guardadas));
}

export function semearViagens(storage: Armazenamento, agora: Date): void {
  // Os 15 empregados de teste viram técnicos habilitados do questionário (cada um numa área).
  let estado = lerEstado(storage);
  const pergunta = estado.perguntas.find((p) => p.id === ID_HABILITADOS);
  if (!pergunta) throw new Error("O questionário de despesas não tem a pergunta de técnico responsável.");
  const novos = EMPREGADOS.map((e, i) => ({ empregadoId: e.id, nome: e.nome, area: i >= PRIMEIRO_PCM_DE_TESTE ? "PCM" as AreaViagem : AREA }));
  estado = salvarPergunta(estado, { ...pergunta, habilitados: [...(pergunta.habilitados ?? []).filter((h) => !h.empregadoId?.startsWith(PREFIXO)), ...novos] }, storage);

  const cartoes = estado.perguntas.find((p) => p.id === "q-02")?.opcoes ?? [];
  if (cartoes.length === 0) throw new Error("O questionário de despesas não tem cartões de crédito cadastrados.");
  const abastecimentos = lerAbastecimentos(storage).filter((a) => a.id.startsWith(PREFIXO)).sort((a, b) => Number(a.id.split("-").pop()) - Number(b.id.split("-").pop())).slice(0, DESTINOS.length); // uma viagem por destino, nos primeiros abastecimentos
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
    renomear(storage, resposta.id, `${PREFIXO}viagem-${i + 1}`);
  });

  // Painel e relatório de Viagens: cada um dos 15 empregados (cinco por empresa) fecha cinco despesas. Os técnicos da Oficina já têm o abastecimento acima e ganham mais
  // quatro; os de PCM lançam pelo PCM (Avulso) as cinco. Datas espalhadas pelos últimos dois meses, em dinheiro ou cartão, todas com o comprovante.
  const TIPOS = TIPOS_ORDEM_VIAGENS.slice(0, 5);
  // Valores plausíveis para cada tipo (o índice sorteia um deles).
  const VALORES: Record<string, number[]> = {
    "Alimentação": [48.9, 61.2, 37.5, 72.3, 55],
    "Hospedagem": [312.5, 254.3, 189.9, 420, 275.8],
    "Pedágio": [27.4, 18.6, 34.2, 22, 41.9],
    "Estacionamento": [35, 18, 22, 28.5, 40],
    "Compra de peças para cliente": [186.75, 242, 129.9, 315.4, 98.6],
  };
  const brl = (v: number) => v.toFixed(2).replace(".", ",");
  let n = DESTINOS.length;
  EMPREGADOS.forEach((emp, i) => {
    const pcm = i >= PRIMEIRO_PCM_DE_TESTE;
    const tipos = pcm ? TIPOS : TIPOS.slice(0, 4);
    tipos.forEach((tipo, k) => {
      const destino = DESTINOS[(i + k) % DESTINOS.length]!;
      const atras = 3 + ((i * 7 + k * 11) % 56);
      const dataDespesa = new Date(agora.getTime() - atras * 86_400_000);
      dataDespesa.setHours(12, 0, 0, 0); // meio-dia: a hora do lançamento (+1 h) cai no mesmo dia da despesa
      const iso = `${dataDespesa.getFullYear()}-${String(dataDespesa.getMonth() + 1).padStart(2, "0")}-${String(dataDespesa.getDate()).padStart(2, "0")}`;
      const cartao = (i + k) % 2 === 0;
      const resposta = registrarResposta(estado, {
        "q-03": [tipo],
        "q-04": [`${emp.nome} (${pcm ? "PCM" : AREA})`],
        ...(pcm ? { [ID_PCM_RESPONDE]: [OPCAO_AVULSO], [ID_NOME_EMPREGADO]: `Auxiliar contratado por ${emp.nome.split(" ")[0]}` } : {}),
        "q-08": iso,
        "q-05": destino.uf,
        "q-06": destino.municipio,
        "q-07": destino.cliente,
        "q-01": [cartao ? "Cartão de crédito" : "Dinheiro"],
        ...(cartao ? { "q-02": [cartoes[(i + k) % cartoes.length]!] } : {}),
        "q-11": brl(VALORES[tipo]![(i + k) % 5]!),
        ...(tipo === TIPO_COM_DETALHAMENTO ? { "q-09": "Compra de peças de reposição para o cliente atendido." } : {}),
        "q-12": ["comprovante.png"],
      }, storage, new Date(dataDespesa.getTime() + 3_600_000), { "q-12": [{ nome: "comprovante.png", dataUrl: COMPROVANTE }] });
      n += 1;
      renomear(storage, resposta.id, `${PREFIXO}viagem-${n}`);
    });
  });
}
