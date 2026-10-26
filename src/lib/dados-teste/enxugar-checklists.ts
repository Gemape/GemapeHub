// Depois de gerar os dados de teste, só ficam em Parâmetros > Check list os grupos de itens que têm uso: ligados a uma associação (veículo ou equipamento) ou
// presentes em algum check list já preenchido (e sem associações nem check lists de veículo ou equipamento que não existe mais). Os grupos do padrão que ninguém usa saem; o Restaurar configurações iniciais traz de volta quando precisar.
import { lerAssociacoes } from "../checklist-associacao-veiculo.ts";
import { lerChecklists } from "../checklist-veiculo.ts";
import { lerChecklistsEq } from "../checklist-equipamento-exec.ts";
import { lerChecklistEquipamento, removerGrupoChecklist, FINALIDADES } from "../equipamentos-checklist.ts";
import * as Gerais from "../parametros-base.ts";

type Armazenamento = Pick<Storage, "getItem" | "setItem" | "removeItem">;

// O id de cada item do check list preenchido é "idDoGrupo:idDoItem".
const gruposDosItens = (itens: { id: string }[]) => itens.map((i) => i.id.split(":")[0]!);

const lerLista = (storage: Armazenamento, chave: string): Record<string, unknown>[] => {
  try { const v = JSON.parse(storage.getItem(chave) ?? "null"); return Array.isArray(v) ? v : []; } catch { return []; }
};

// Associações e check lists de veículo ou equipamento que não existe mais (cadastro apagado) saem: ficariam soltos, sem a quem pertencer.
function removerOrfaos(storage: Armazenamento): void {
  let dados: Record<string, unknown> = {};
  try { dados = JSON.parse(storage.getItem("gemape-demo-dados") ?? "{}"); } catch { /* sem cadastro legível: nada a conferir */ return; }
  const veiculos = new Set((Array.isArray(dados["veiculos"]) ? (dados["veiculos"] as { id: string }[]) : []).map((v) => v.id));
  for (const chave of ["gemape-demo-associacoes-checklist-veiculo", "gemape-demo-checklists-veiculo"]) {
    const lista = lerLista(storage, chave);
    if (lista.some((r) => !veiculos.has(String(r["veiculoId"])))) storage.setItem(chave, JSON.stringify(lista.filter((r) => veiculos.has(String(r["veiculoId"])))));
  }
  const equipamentos = new Set(lerLista(storage, "gemape-demo-equipamentos").map((e) => String(e["id"])));
  const execucoes = lerLista(storage, "gemape-demo-eq-checklists-exec");
  if (execucoes.some((r) => !equipamentos.has(String(r["equipamentoId"])))) storage.setItem("gemape-demo-eq-checklists-exec", JSON.stringify(execucoes.filter((r) => equipamentos.has(String(r["equipamentoId"])))));
  try {
    const param = JSON.parse(storage.getItem("gemape-demo-equipamentos-checklist") ?? "null") as Record<string, { associacoes?: { equipamentoId: string }[] }> | null;
    if (param) {
      for (const f of ["manutencao", "vistoria"]) if (param[f]?.associacoes) param[f]!.associacoes = param[f]!.associacoes!.filter((a) => equipamentos.has(a.equipamentoId));
      storage.setItem("gemape-demo-equipamentos-checklist", JSON.stringify(param));
    }
  } catch { /* parâmetros ilegíveis: ficam como estão */ }
}

// Equipamento que não tem itens de check list associados (em manutenção ou em vistoria) sai do cadastro, com tudo o que foi registrado nele: abastecimentos,
// manutenções, ocorrências, check lists e plano. Os equipamentos de teste já nascem associados nos dois.
const REGISTROS_DO_EQUIPAMENTO = [
  "gemape-demo-eq-abastecimentos", "gemape-demo-eq-manutencoes", "gemape-demo-eq-ocorrencias", "gemape-demo-eq-checklists-exec", "gemape-demo-eq-checklists",
  "gemape-demo-eq-previsoes-manutencao", "gemape-demo-eq-previsoes-vistoria",
] as const;

function removerEquipamentosSemAssociacao(storage: Armazenamento): number {
  const equipamentos = lerLista(storage, "gemape-demo-equipamentos");
  if (equipamentos.length === 0) return 0;
  let param: Record<string, { associacoes?: { equipamentoId: string }[] }> | null = null;
  try { param = JSON.parse(storage.getItem("gemape-demo-equipamentos-checklist") ?? "null"); } catch { return 0; }
  if (!param) return 0;
  const comAssociacao = (f: string) => new Set((param?.[f]?.associacoes ?? []).map((a) => a.equipamentoId));
  const manutencao = comAssociacao("manutencao");
  const vistoria = comAssociacao("vistoria");
  const sai = new Set(equipamentos.map((e) => String(e["id"])).filter((id) => !manutencao.has(id) || !vistoria.has(id)));
  if (sai.size === 0) return 0;
  storage.setItem("gemape-demo-equipamentos", JSON.stringify(equipamentos.filter((e) => !sai.has(String(e["id"])))));
  for (const chave of REGISTROS_DO_EQUIPAMENTO) {
    const lista = lerLista(storage, chave);
    if (lista.some((r) => sai.has(String(r["equipamentoId"])))) storage.setItem(chave, JSON.stringify(lista.filter((r) => !sai.has(String(r["equipamentoId"])))));
  }
  try {
    const manut = JSON.parse(storage.getItem("gemape-demo-equipamentos-manutencao") ?? "null") as { planos?: { equipamentoId: string }[] } | null;
    if (manut?.planos) { manut.planos = manut.planos.filter((p) => !sai.has(p.equipamentoId)); storage.setItem("gemape-demo-equipamentos-manutencao", JSON.stringify(manut)); }
  } catch { /* parâmetros ilegíveis: ficam como estão */ }
  return sai.size;
}

export function removerGruposDeChecklistSemUso(storage: Armazenamento): { veiculos: number; equipamentos: number } {
  const st = storage as Storage;
  removerEquipamentosSemAssociacao(storage);
  removerOrfaos(storage);
  let veiculos = 0;
  let equipamentos = 0;

  const usadosVeiculo = new Set([
    ...lerAssociacoes(st).flatMap((a) => a.itens.map((i) => i.grupoId)),
    ...lerChecklists(st).flatMap((c) => gruposDosItens(c.itens)),
  ]);
  for (const g of Gerais.lerParametros(storage as never).itensChecklistVeiculo) {
    // Só os grupos do padrão: os que a pessoa criou não são mexidos.
    if (usadosVeiculo.has(g.id) || !Gerais.ehGrupoChecklistPadrao(g.nome)) continue;
    try { Gerais.removerGrupoChecklistVeiculo(g.id, storage as never); veiculos++; } catch { /* já excluído */ }
  }

  const execucoes = lerChecklistsEq(st);
  for (const { id: finalidade } of FINALIDADES) {
    const parte = lerChecklistEquipamento(st)[finalidade];
    const usados = new Set([
      ...parte.associacoes.flatMap((a) => a.itens.map((i) => i.grupoId)),
      ...execucoes.filter((c) => c.finalidade === finalidade).flatMap((c) => gruposDosItens(c.itens)),
    ]);
    for (const g of parte.grupos) {
      if (usados.has(g.id)) continue;
      try { removerGrupoChecklist(finalidade, g.id, st); equipamentos++; } catch { /* já excluído ou em uso */ }
    }
  }
  return { veiculos, equipamentos };
}
