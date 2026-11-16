// Busca tolerante a erros: sem acento, sem diferenciar maiúscula, aceita palavra incompleta e erro de digitação (1 letra trocada, faltando ou sobrando).
// Todas as palavras digitadas precisam achar par; a ordem não importa. Serve para quem digita "bota biqueira aco" e quer "Bota de Segurança com Biqueira de Aço".

const semAcento = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const palavras = (s: string): string[] => semAcento(s).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

/** Distância de edição (inserir, apagar, trocar), parando cedo quando passa do limite. */
export function distancia(a: string, b: string, limite = 2): number {
  if (Math.abs(a.length - b.length) > limite) return limite + 1;
  let anterior = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const atual = [i];
    let menor = i;
    for (let j = 1; j <= b.length; j++) {
      atual[j] = Math.min((anterior[j] ?? 0) + 1, (atual[j - 1] ?? 0) + 1, (anterior[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1));
      menor = Math.min(menor, atual[j] ?? 0);
    }
    if (menor > limite) return limite + 1;
    anterior = atual;
  }
  return anterior[b.length] ?? limite + 1;
}

// Palavra curta (até 3 letras) só casa por trecho exato; maiores aceitam 1 erro, e a partir de 7 letras, 2.
// Palavra com algum dígito (CA, código, número) casa exata: 12345 não pode achar 12346.
const tolerancia = (p: string): number => (/\d/.test(p) || p.length <= 3 ? 0 : p.length <= 6 ? 1 : 2);

function palavraCombina(termo: string, campo: string[], textoCorrido: string): boolean {
  if (textoCorrido.includes(termo)) return true;
  const t = tolerancia(termo);
  if (t === 0) return false;
  return campo.some((p) => distancia(termo, p, t) <= t || (p.length > termo.length && distancia(termo, p.slice(0, termo.length), 1) <= 1 && termo.length >= 4));
}

/** Pontuação de 0 (não casa) a 1 (todas as palavras exatas); para ordenar os melhores primeiro. */
export function pontuaBusca(termo: string, ...campos: (string | null | undefined)[]): number {
  const procuradas = palavras(termo);
  if (procuradas.length === 0) return 1;
  const texto = campos.filter((c): c is string => !!c).join(" ");
  const corrido = semAcento(texto).toLowerCase();
  const doCampo = palavras(texto);
  let pontos = 0;
  for (const p of procuradas) {
    if (corrido.includes(p)) pontos += 1;
    else if (palavraCombina(p, doCampo, corrido)) pontos += 0.6;
    else return 0;
  }
  return pontos / procuradas.length;
}

export const combinaBuscaTolerante = (termo: string, ...campos: (string | null | undefined)[]): boolean => pontuaBusca(termo, ...campos) > 0;

/** "Você quis dizer…?": o nome da lista mais parecido com o que foi digitado (cada palavra digitada com até 2 letras de diferença, 3 em palavra longa). Nada parecido: undefined. */
export function sugerirNome(termo: string, nomes: readonly string[]): string | undefined {
  const procuradas = palavras(termo).filter((p) => p.length >= 3);
  if (procuradas.length === 0) return undefined;
  let melhor: { nome: string; custo: number } | undefined;
  for (const nome of nomes) {
    const doNome = palavras(nome);
    let custo = 0;
    const casou = procuradas.every((p) => {
      const limite = p.length >= 8 ? 3 : 2;
      const d = Math.min(...doNome.map((w) => distancia(p, w, limite)));
      custo += d;
      return d <= limite;
    });
    if (casou && (!melhor || custo < melhor.custo)) melhor = { nome, custo };
  }
  return melhor?.nome;
}
