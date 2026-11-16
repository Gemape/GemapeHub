// Busca por registros e ações da tela inicial: ao digitar o nome de um empregado, o código de um EPI ou o número do CA, o resultado já traz os botões
// do que se faz com ele (ver a ficha, entregar, devolver, ver o saldo, dar entrada). Só dados: a tela desenha e checa as permissões.
export type AcaoDoRegistro = { rotulo: string; url: string; search?: Record<string, string> };
export type ResultadoRegistro = { chave: string; tipo: "Empregado" | "EPI"; titulo: string; detalhe: string; acoes: AcaoDoRegistro[] };

type EmpregadoBusca = { id: string; nome: string; empresa_id?: string | null; matricula?: string | null; cpf?: string | null; ativo?: boolean | null; data_demissao?: string | null };
type EpiBusca = { id: string; nome: string; codigo_sku?: string | null; ca?: string | null; estoque_atual?: number | null; status?: string | null };

const semAcento = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const palavras = (t: string) => semAcento(t).split(/[^a-z0-9]+/).filter(Boolean);
const digitos = (t: string) => t.replace(/\D/g, "");

// Todas as palavras digitadas começam alguma palavra do texto (então "joao si" acha "João Silva").
const casa = (texto: string, termo: string[]) => {
  const alvo = palavras(texto);
  return termo.every((p) => alvo.some((a) => a.startsWith(p)));
};

export function buscarRegistros(
  termoBruto: string,
  { empregados, epis, limite = 4 }: { empregados: readonly EmpregadoBusca[]; epis: readonly EpiBusca[]; limite?: number },
): ResultadoRegistro[] {
  const termo = palavras(termoBruto);
  if (termo.length === 0 || termoBruto.trim().length < 2) return [];
  const so = digitos(termoBruto);
  // Só números e pontuação (CPF "123.456", código "0007"): a pontuação não separa palavras. "CA 34.567" ou "CA-34567": o prefixo some e o número procura o CA do EPI.
  const soNumeros = /^[\d.\-/\s]+$/.test(termoBruto.trim());
  const numeroCa = /^ca[\s.\-:]*[\d.\-/\s]+$/i.test(termoBruto.trim()) ? so : "";
  const achados: ResultadoRegistro[] = [];

  for (const e of empregados) {
    if (numeroCa) break;
    const porNumero = (soNumeros && so.length >= 3 && digitos(e.cpf ?? "").startsWith(so)) || (!!e.matricula && semAcento(e.matricula) === semAcento(termoBruto.trim()));
    if (!porNumero && !casa(e.nome, termo)) continue;
    const desligado = e.ativo === false || !!e.data_demissao;
    const base = { ...(e.empresa_id ? { empresa: e.empresa_id } : {}), empregado: e.id };
    achados.push({
      chave: `emp-${e.id}`, tipo: "Empregado", titulo: e.nome, detalhe: `${e.matricula ? `Matrícula ${e.matricula} · ` : ""}${desligado ? "Desligado" : "Ativo"}`,
      acoes: [
        { rotulo: "Ver ficha", url: "/epi", search: { aba: "historico", ...base } },
        ...(desligado ? [] : [{ rotulo: "+ Entregar EPI", url: "/epi", search: { aba: "entrega", ...base } }]),
        { rotulo: "Registrar devolução", url: "/epi", search: { aba: "entrega", modo: "devolucao", ...base } },
      ],
    });
  }

  const empregadosAchados = achados.length;
  for (const i of epis) {
    if (i.status === "Inativo") continue;
    const porCa = !!numeroCa && digitos(i.ca ?? "") === numeroCa;
    const porTexto = !numeroCa && (casa(`${i.nome} ${i.codigo_sku ?? ""}`, termo) || (soNumeros && so.length >= 4 && digitos(i.ca ?? "") === so));
    if (!porCa && !porTexto) continue;
    achados.push({
      chave: `epi-${i.id}`, tipo: "EPI", titulo: i.nome, detalhe: `${i.codigo_sku ? `${i.codigo_sku} · ` : ""}${i.ca ? `CA ${i.ca}` : "sem CA"}`,
      acoes: [
        { rotulo: `Ver saldo (${i.estoque_atual ?? 0} un)`, url: "/epi", search: { aba: "estoque" } },
        { rotulo: "Dar entrada", url: "/epi", search: { aba: "compras" } },
      ],
    });
  }
  // empregados e EPIs aparecem juntos, no máximo `limite` de cada tipo
  return [...achados.slice(0, Math.min(empregadosAchados, limite)), ...achados.slice(empregadosAchados, empregadosAchados + limite)];
}
