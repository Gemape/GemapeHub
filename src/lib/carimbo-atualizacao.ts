// Carimbo discreto dos painéis: há quanto tempo o saldo na tela foi lido do banco.
export function textoAtualizado(atualizadoEm: number, agora: number = Date.now()): string {
  const segundos = Math.max(0, Math.floor((agora - atualizadoEm) / 1000));
  if (segundos < 60) return "Atualizado agora mesmo";
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `Atualizado há ${minutos} min`;
  return `Atualizado às ${new Date(atualizadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}`;
}
