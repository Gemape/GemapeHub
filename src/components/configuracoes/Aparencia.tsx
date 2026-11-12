import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { CORES_PADRAO, POSICOES_MENU, configPadrao, corValida, type Config, type Densidade, type PosicaoMenu, type Tema } from "@/lib/configuracoes-demo";
import { AvisoDeTeste, Bloco, Linha } from "./Campos";
import { useConfig } from "./useConfig";

function Cor({ id, rotulo, valor, padrao, aoMudar }: { id: string; rotulo: string; valor: string; padrao: string; aoMudar: (v: string) => void }) {
  return (
    <Linha rotulo={rotulo} htmlFor={id}>
      <div className="flex items-center gap-2">
        <input id={id} type="color" value={corValida(valor) ? valor : padrao} onChange={(e) => aoMudar(e.target.value)} className="h-9 w-12 cursor-pointer rounded-md border bg-background p-1" />
        <Input aria-label={`${rotulo} em hexadecimal`} value={valor} onChange={(e) => aoMudar(e.target.value)} className="h-9 w-28 font-mono text-xs" maxLength={7} />
        <Button type="button" variant="ghost" size="sm" onClick={() => aoMudar(padrao)} disabled={valor.toLowerCase() === padrao.toLowerCase()}>Padrão</Button>
      </div>
    </Linha>
  );
}

export function Aparencia() {
  const { config, mudar } = useConfig();
  const a = config.aparencia;
  // Aparência não vai para a auditoria: mexer em cor ou fonte gera muitas mudanças seguidas e não é ação crítica.
  const trocar = (parte: Partial<Config["aparencia"]>, _detalhe: string) => mudar((c) => ({ ...c, aparencia: { ...c.aparencia, ...parte } }));

  return (
    <div className="space-y-4">
      <AvisoDeTeste />
      <Bloco titulo="Tema da interface">
        <Linha rotulo="Modo" htmlFor="tema">
          <Select value={a.tema === "escuro" ? "escuro" : "claro"} onValueChange={(v) => trocar({ tema: v as Tema }, `Tema: ${v}`)}>
            <SelectTrigger id="tema" className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="claro">Claro (light)</SelectItem>
              <SelectItem value="escuro">Escuro (dark)</SelectItem>
            </SelectContent>
          </Select>
        </Linha>
      </Bloco>

      <Bloco titulo="Paleta de cores (marca)" descricao="Aplicada na hora em todo o sistema. “Padrão” volta ao azul da marca GEMAPE.">
        <Cor id="cor-primaria" rotulo="Cor primária (botões, links, destaques)" valor={a.corPrimaria} padrao={CORES_PADRAO.primaria} aoMudar={(v) => trocar({ corPrimaria: v }, "Cor primária")} />
        <Cor id="cor-secundaria" rotulo="Cor secundária" valor={a.corSecundaria} padrao={CORES_PADRAO.secundaria} aoMudar={(v) => trocar({ corSecundaria: v }, "Cor secundária")} />
        <Cor id="cor-menu" rotulo="Cor do menu lateral" valor={a.corMenu} padrao={CORES_PADRAO.menu} aoMudar={(v) => trocar({ corMenu: v }, "Cor do menu lateral")} />
      </Bloco>

      <Bloco titulo="Densidade e layout">
        <Linha rotulo="Espaçamento das tabelas" htmlFor="densidade">
          <Select value={a.densidade} onValueChange={(v) => trocar({ densidade: v as Densidade }, `Densidade: ${v}`)}>
            <SelectTrigger id="densidade" className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="compacta">Compacto</SelectItem>
              <SelectItem value="padrao">Padrão</SelectItem>
              <SelectItem value="confortavel">Confortável</SelectItem>
            </SelectContent>
          </Select>
        </Linha>
        <Linha rotulo="Posição do menu" ajuda="No celular o menu fica sempre em cima" htmlFor="posicao-menu">
          <Select value={a.menu} onValueChange={(v) => trocar({ menu: v as PosicaoMenu }, `Posição do menu: ${v}`)}>
            <SelectTrigger id="posicao-menu" className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {POSICOES_MENU.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </Linha>
        <Linha rotulo={`Tamanho da fonte: ${a.fonte}%`} htmlFor="fonte">
          <Slider id="fonte" aria-label="Tamanho da fonte" className="w-44" min={85} max={125} step={5} value={[a.fonte]} onValueChange={([v]) => trocar({ fonte: v ?? 100 }, `Fonte: ${v}%`)} />
        </Linha>
      </Bloco>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs"
          disabled={JSON.stringify(a) === JSON.stringify(configPadrao().aparencia)}
          onClick={() => { trocar(configPadrao().aparencia, "Aparência restaurada"); toast.success("Aparência restaurada para o padrão"); }}
        >
          <RotateCcw className="size-3" /> Restaurar padrão
        </Button>
      </div>
    </div>
  );
}
