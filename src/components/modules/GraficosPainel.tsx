import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Peças dos relatórios gráficos (estilo painel de BI) que ficam abaixo dos cards (decisão 325): um quadro com título e comparações, e os gráficos de barras e de rosca.
export const COR_GRAFICO = {
  azul: "#3b2fc9", verde: "#059669", amarelo: "#f59e0b", vermelho: "#dc2626", cinza: "#94a3b8", roxo: "#7c3aed",
} as const;
export const COR_DA_FAIXA = { verde: COR_GRAFICO.verde, amarelo: COR_GRAFICO.amarelo, vermelho: COR_GRAFICO.vermelho } as const;

export function PainelGraficos({ titulo = "Comparativos", children }: { titulo?: string; children: ReactNode }) {
  return (
    <section className="space-y-3" aria-label={titulo}>
      <h2 className="text-lg font-semibold">{titulo}</h2>
      <div className="grid gap-4 lg:grid-cols-2">{children}</div>
    </section>
  );
}

export function QuadroGrafico({ titulo, descricao, vazio, larga = false, children }: { titulo: string; descricao?: string; vazio?: boolean; larga?: boolean; children: ReactNode }) {
  return (
    <figure className={`panel space-y-2 p-4 ${larga ? "lg:col-span-2" : ""}`}>
      <figcaption>
        <p className="text-sm font-semibold">{titulo}</p>
        {descricao && <p className="text-xs text-muted-foreground">{descricao}</p>}
      </figcaption>
      {vazio ? <p className="py-10 text-center text-sm text-muted-foreground">Sem dados para comparar.</p> : <div className="h-64 w-full">{children}</div>}
    </figure>
  );
}

export type SerieBarras = { chave: string; nome: string; cor: string };
const eixo = { fontSize: 11, fill: "currentColor" } as const;

// Barras (colunas) comparando categorias: uma série por cor, lado a lado ou empilhadas. `cores` pinta cada categoria (uma série só); `meta` desenha a linha de referência.
export function GraficoBarras({ dados, categoria, series, empilhado = false, cores, meta, sufixo = "" }: {
  dados: Record<string, string | number>[]; categoria: string; series: SerieBarras[]; empilhado?: boolean; cores?: string[]; meta?: { valor: number; rotulo: string }; sufixo?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.35} />
        <XAxis dataKey={categoria} tick={eixo} interval={0} tickLine={false} />
        <YAxis tick={eixo} tickLine={false} axisLine={false} allowDecimals={false} unit={sufixo} />
        <Tooltip formatter={(v) => `${Number(v).toLocaleString("pt-BR")}${sufixo}`} cursor={{ opacity: 0.12 }} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {meta && <ReferenceLine y={meta.valor} stroke={COR_GRAFICO.verde} strokeDasharray="4 4" ifOverflow="extendDomain" label={{ value: meta.rotulo, fontSize: 11, fill: COR_GRAFICO.verde, position: "insideTopRight" }} />}
        {series.map((s) => (
          <Bar key={s.chave} dataKey={s.chave} name={s.nome} fill={s.cor} radius={empilhado ? 0 : [4, 4, 0, 0]} {...(empilhado ? { stackId: "pilha" } : {})} maxBarSize={44}>
            {cores && series.length === 1 && dados.map((_, i) => <Cell key={i} fill={cores[i] ?? s.cor} />)}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// Rosca com a parte de cada fatia no total.
export function GraficoRosca({ dados }: { dados: { nome: string; valor: number; cor: string }[] }) {
  const total = dados.reduce((t, d) => t + d.valor, 0);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={dados} dataKey="valor" nameKey="nome" innerRadius="55%" outerRadius="85%" paddingAngle={2} label={({ value }) => (total ? `${Math.round((Number(value) / total) * 100)}%` : "")}>
          {dados.map((d) => <Cell key={d.nome} fill={d.cor} />)}
        </Pie>
        <Tooltip formatter={(v, nome) => [`${v} de ${total}`, String(nome)]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
