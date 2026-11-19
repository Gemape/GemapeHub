// Texto da ocorrência aberta quando a vistoria periódica de uma caixa acha uma ferramenta ausente (perdida). A tratativa é a reposição da ferramenta (Movimentações > Reposição).
export function descricaoDoDesaparecimento(d: { ferramenta: string; quantidade: number; caixa: string; data: string; observacao?: string | null | undefined }): string {
  const data = d.data.slice(0, 10).split("-").reverse().join("/");
  const obs = d.observacao?.trim();
  return `Desaparecimento de ferramenta detectado na vistoria periódica: ${d.quantidade} × ${d.ferramenta} ausente(s) na caixa ${d.caixa} em ${data}.${obs ? ` Observação da vistoria: ${obs}` : ""} Tratativa: localizar a ferramenta ou repô-la na caixa.`;
}
