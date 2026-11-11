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
    const guardadas = JSON.parse(storage.getItem("gemape-demo-respostas-despesas") ?? "[]") as { id: string }[];
    for (const r of guardadas) if (r.id === resposta.id) r.id = `${PREFIXO}viagem-${i + 1}`;
    storage.setItem("gemape-demo-respostas-despesas", JSON.stringify(guardadas));
  });

  // Painel e relatório de Viagens: cada um dos 15 empregados (cinco por empresa) fecha cinco despesas. Os técnicos da Oficina já têm o abastecimento acima e ganham mais
  // quatro; os de PCM lançam pelo PCM (Avulso) as cinco. Datas espalhadas pelos últimos dois meses, em dinheiro ou cartão, todas com o comprovante.
  const TIPOS = ["Alimentação", "Hospedagem", "Pedágio", "Estacionamento", "Compra de peças para cliente"] as const;
  const VALORES = [48.9, 312.5, 27.4, 35, 186.75, 61.2, 420, 18.6, 22, 254.3];
  const brl = (v: number) => v.toFixed(2).replace(".", ",");
  let n = DESTINOS.length;
  EMPREGADOS.forEach((emp, i) => {
    const pcm = i >= PRIMEIRO_PCM_DE_TESTE;
    const tipos = pcm ? TIPOS : TIPOS.slice(0, 4);
    tipos.forEach((tipo, k) => {
      const destino = DESTINOS[(i + k) % DESTINOS.length]!;
      const atras = 3 + ((i * 7 + k * 11) % 56);
      const dataDespesa = new Date(agora.getTime() - atras * 86_400_000);
      const iso = `${dataDespesa.getFullYear()}-${String(dataDespesa.getMonth() + 1).padStart(2, "0")}-${String(dataDespesa.getDate()).padStart(2, "0")}`;
      const cartao = (i + k) % 2 === 0;
      const resposta = registrarResposta(estado, {
        "q-03": [tipo],
        "q-04": [`${emp.nome} (${pcm ? "PCM" : AREA})`],
        ...(pcm ? { "q-13": ["Avulso – técnico não monitorado"], "q-15": `Auxiliar contratado por ${emp.nome.split(" ")[0]}` } : {}),
        "q-08": iso,
        "q-05": destino.uf,
        "q-06": destino.municipio,
        "q-07": destino.cliente,
        "q-01": [cartao ? "Cartão de crédito" : "Dinheiro"],
        ...(cartao ? { "q-02": [cartoes[(i + k) % cartoes.length]!] } : {}),
        "q-11": brl(VALORES[(i * 3 + k) % VALORES.length]!),
        ...(tipo === "Compra de peças para cliente" ? { "q-09": "Compra de peças de reposição para o cliente atendido." } : {}),
        "q-12": ["comprovante.png"],
      }, storage, new Date(dataDespesa.getTime() + 3_600_000), { "q-12": [{ nome: "comprovante.png", dataUrl: COMPROVANTE }] });
      const guardadas = JSON.parse(storage.getItem("gemape-demo-respostas-despesas") ?? "[]") as { id: string }[];
      n += 1;
      for (const r of guardadas) if (r.id === resposta.id) r.id = `${PREFIXO}viagem-${n}`;
      storage.setItem("gemape-demo-respostas-despesas", JSON.stringify(guardadas));
    });
  });
}
