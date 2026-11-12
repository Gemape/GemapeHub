import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ACOES, SUBTELAS, TELAS, alterarAcaoDoPerfil, alternarAcao, assinarPermissoes, criarPerfil, efetivas, excluirPerfil, fotografiaPermissoes, lerPermissoes,
  mudarPerfil, nomeDoPerfil, padraoDe, perfisDoEstado, restaurarPermissoes, salvarPermissoes, usuarioAtivo, voltarAoPerfil, type Acao, type PerfilId,
} from "@/lib/permissoes-demo";
import { useEmpresasQuery } from "@/lib/empresa-context";
import { AvisoDeTeste, Bloco, MenuDeSecoes } from "./Campos";
import { useConfig } from "./useConfig";

const ROTULO_ACAO: Record<Acao, string> = { ver: "Ver", criar: "Criar", editar: "Editar", excluir: "Excluir" };
const DESCRICAO_PERFIL: Record<string, string> = {
  admin: "Vê e altera tudo, inclusive Gerais e Configurações. Único que gerencia usuários.",
  rh: "Cuida de pessoas, EPIs e uniformes; vê os cadastros de empregados e empresas.",
  padrao: "Opera os módulos do dia a dia e não vê os cadastros administrativos.",
};

function useEstado() {
  useSyncExternalStore(assinarPermissoes, () => fotografiaPermissoes(localStorage), () => "");
  return { estado: lerPermissoes(localStorage), ativo: usuarioAtivo(localStorage) };
}

function Usuarios() {
  const { estado, ativo } = useEstado();
  const { config, mudar } = useConfig();
  const [email, setEmail] = useState("");
  const [perfilConvite, setPerfilConvite] = useState<PerfilId>("padrao");
  const nomePerfil = (id: string) => nomeDoPerfil(estado, id);

  function convidar() {
    if (!/^\S+@\S+\.\S+$/.test(email)) return void toast.error("Digite um e-mail válido");
    mudar((c) => ({ ...c, usuarios: { ...c.usuarios, convites: [{ email, perfil: perfilConvite, quando: new Date().toISOString() }, ...c.usuarios.convites] } }), "Convite enviado", `${email} (${nomePerfil(perfilConvite)})`);
    toast.success(`Simulação: convite enviado para ${email}`);
    setEmail("");
  }
  const alternarAtivo = (id: string, nome: string) => {
    const inativo = config.usuarios.inativos.includes(id);
    mudar((c) => ({ ...c, usuarios: { ...c.usuarios, inativos: inativo ? c.usuarios.inativos.filter((x) => x !== id) : [...c.usuarios.inativos, id] } }), inativo ? "Usuário reativado" : "Usuário desativado", nome);
  };

  return (
    <div className="space-y-4">
      <Bloco titulo="Usuários do teste" descricao="Perfil, situação e unidade de cada usuário.">
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/60 text-left"><th className="px-3 py-2 font-semibold">Usuário</th><th className="px-3 py-2 font-semibold">Perfil</th><th className="px-3 py-2 font-semibold">Situação</th><th className="px-3 py-2 font-semibold">Ações</th></tr></thead>
            <tbody>
              {estado.usuarios.map((u) => {
                const inativo = config.usuarios.inativos.includes(u.id);
                const eu = u.id === ativo.id;
                return (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium">{u.nome}{eu && <span className="ml-1 text-xs text-muted-foreground">(você)</span>}</td>
                    <td className="px-3 py-2">{nomePerfil(u.perfil)}</td>
                    <td className="px-3 py-2"><Badge variant={inativo ? "secondary" : "default"}>{inativo ? "Inativo" : "Ativo"}</Badge></td>
                    <td className="flex flex-wrap gap-1 px-3 py-2">
                      <Button type="button" size="sm" variant="outline" disabled={eu} onClick={() => alternarAtivo(u.id, u.nome)}>{inativo ? "Reativar" : "Desativar"}</Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => { mudar((c) => c, "Redefinição de senha", u.nome); toast.success(`Simulação: link de nova senha enviado a ${u.nome}`); }}>Redefinir senha</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Bloco>
      <Bloco titulo="Convidar por e-mail" descricao="Simulado: nenhum e-mail é enviado.">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input type="email" aria-label="E-mail do convidado" placeholder="nome@empresa.com.br" value={email} onChange={(e) => setEmail(e.target.value)} className="sm:flex-1" />
          <Select value={perfilConvite} onValueChange={(v) => setPerfilConvite(v as PerfilId)}>
            <SelectTrigger aria-label="Perfil do convidado" className="sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{perfisDoEstado(estado).map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
          </Select>
          <Button type="button" onClick={convidar}>Enviar convite</Button>
        </div>
        {config.usuarios.convites.length > 0 && (
          <ul className="space-y-1 text-xs text-muted-foreground">
            {config.usuarios.convites.slice(0, 5).map((c) => <li key={c.email + c.quando}>{c.email} · {nomePerfil(c.perfil)} · convite pendente</li>)}
          </ul>
        )}
      </Bloco>
    </div>
  );
}

function Perfis() {
  const { estado } = useEstado();
  const { mudar } = useConfig();
  const [nome, setNome] = useState("");
  const [base, setBase] = useState<PerfilId>("padrao");
  const [editando, setEditando] = useState<string | null>(null);
  const perfis = perfisDoEstado(estado);
  const proprio = (estado.perfis ?? []).find((p) => p.id === editando);

  function criar() {
    const n = nome.trim();
    if (n.length < 2) return void toast.error("Dê um nome ao perfil");
    if (perfis.some((p) => p.nome.toLowerCase() === n.toLowerCase())) return void toast.error("Já existe um perfil com esse nome");
    const novo = criarPerfil(estado, n, base);
    salvarPermissoes(localStorage, novo);
    setEditando(novo.perfis![novo.perfis!.length - 1]!.id);
    mudar((c) => c, "Perfil criado", `${n} (partiu de ${nomeDoPerfil(estado, base)})`);
    setNome("");
    toast.success(`Perfil "${n}" criado: marque abaixo o que ele pode fazer`);
  }
  function marcar(tela: string, acao: Acao, valor: boolean) {
    if (!proprio) return;
    salvarPermissoes(localStorage, alterarAcaoDoPerfil(estado, proprio.id, tela, acao, valor));
    mudar((c) => c, "Perfil alterado", `${proprio.nome}: ${ROTULO_ACAO[acao]} em ${TELAS.find((t) => t.id === tela)?.nome ?? tela} ${valor ? "liberado" : "retirado"}`);
  }
  function excluir(id: string, nomePerfil: string, usuarios: number) {
    if (!confirm(`Excluir o perfil "${nomePerfil}"?${usuarios ? ` ${usuarios} usuário(s) voltam ao perfil Padrão.` : ""}`)) return;
    salvarPermissoes(localStorage, excluirPerfil(estado, id));
    if (editando === id) setEditando(null);
    mudar((c) => c, "Perfil excluído", nomePerfil);
  }

  return (
    <div className="space-y-4">
      <Bloco titulo="Perfis de acesso" descricao="O perfil dá o ponto de partida das permissões; cada usuário pode ter exceções (seção Permissões). Os perfis de origem não mudam; os que você cria podem ser ajustados.">
        <div className="grid gap-3 sm:grid-cols-3">
          {perfis.map((p) => {
            const usuarios = estado.usuarios.filter((u) => u.perfil === p.id).length;
            return (
              <article key={p.id} className={`rounded-lg border bg-muted/30 p-3 ${editando === p.id ? "ring-2 ring-primary/50" : ""}`}>
                <h4 className="flex items-center gap-2 text-sm font-semibold">{p.nome}{p.proprio && <Badge variant="secondary">Personalizado</Badge>}</h4>
                <p className="mt-1 text-xs text-muted-foreground">{DESCRICAO_PERFIL[p.id] ?? "Perfil criado pelo Administrador, com permissões ajustadas por módulo."}</p>
                <p className="mt-2 text-xs"><strong>{usuarios}</strong> usuário(s)</p>
                {p.proprio && (
                  <div className="mt-2 flex gap-1">
                    <Button type="button" size="sm" variant="outline" onClick={() => setEditando(editando === p.id ? null : p.id)}>{editando === p.id ? "Fechar" : "Editar permissões"}</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => excluir(p.id, p.nome, usuarios)}>Excluir</Button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </Bloco>

      <Bloco titulo="Criar perfil" descricao="O novo perfil começa como cópia de outro; depois você marca o que ele pode ver, criar, editar e excluir em cada módulo.">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input aria-label="Nome do perfil" placeholder="Nome (ex.: Gestor de frota)" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={40} className="sm:flex-1" onKeyDown={(e) => { if (e.key === "Enter") criar(); }} />
          <Select value={base} onValueChange={setBase}>
            <SelectTrigger aria-label="Começar a partir de" className="sm:w-52"><SelectValue /></SelectTrigger>
            <SelectContent>{perfis.map((p) => <SelectItem key={p.id} value={p.id}>Começar de: {p.nome}</SelectItem>)}</SelectContent>
          </Select>
          <Button type="button" onClick={criar}>Criar perfil</Button>
        </div>
      </Bloco>

      {proprio && (
        <Bloco titulo={`Permissões do perfil ${proprio.nome}`} descricao="Vale para todos os usuários com este perfil. Os menus de cada módulo herdam o que o módulo tem.">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/60 text-left">
                  <th className="px-3 py-2.5 font-semibold">Módulo</th>
                  {ACOES.map((a) => <th key={a} className="px-3 py-2.5 text-center font-semibold">{ROTULO_ACAO[a]}</th>)}
                </tr>
              </thead>
              <tbody>
                {TELAS.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="px-3 py-2"><span className="text-xs text-muted-foreground">{t.grupo} · </span>{t.nome}</td>
                    {ACOES.map((a) => (
                      <td key={a} className="px-3 py-2 text-center">
                        <Checkbox aria-label={`${ROTULO_ACAO[a]} ${t.nome} no perfil ${proprio.nome}`} checked={!!proprio.matriz[t.id]?.[a]} onCheckedChange={(v) => marcar(t.id, a, v === true)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Bloco>
      )}
    </div>
  );
}

// Escopo por empresa: cada usuário vê todas as empresas ou só as que o Administrador marcar (as empresas vêm do cadastro).
function Escopo() {
  const { estado } = useEstado();
  const { config, mudar } = useConfig();
  const { data: empresas = [], isLoading } = useEmpresasQuery();
  const definir = (id: string, nome: string, valor: "todas" | string[], detalhe: string) =>
    mudar((c) => ({ ...c, usuarios: { ...c.usuarios, escopo: { ...c.usuarios.escopo, [id]: valor } } }), "Escopo alterado", `${nome}: ${detalhe}`);

  return (
    <Bloco titulo="Escopo de visibilidade" descricao="Defina, para cada usuário, se ele vê os dados de todas as empresas cadastradas ou só das que você marcar.">
      {isLoading && <p className="text-xs text-muted-foreground">Carregando empresas…</p>}
      {estado.usuarios.map((u) => {
        const admin = u.perfil === "admin";
        const guardado = config.usuarios.escopo[u.id];
        const lista = Array.isArray(guardado) ? guardado : null;
        return (
          <div key={u.id} className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-medium">{u.nome}</span>
              <Select
                value={admin || !lista ? "todas" : "especificas"}
                disabled={admin}
                onValueChange={(v) => (v === "todas" ? definir(u.id, u.nome, "todas", "todas as empresas") : definir(u.id, u.nome, [], "só empresas específicas (nenhuma marcada ainda)"))}
              >
                <SelectTrigger aria-label={`Escopo de ${u.nome}`} className="sm:w-60"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="todas">Todas as empresas</SelectItem><SelectItem value="especificas">Só empresas específicas</SelectItem></SelectContent>
              </Select>
            </div>
            {!admin && lista && (
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {empresas.map((e) => (
                    <label key={e.id} className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox
                        aria-label={`${e.nome_fantasia} para ${u.nome}`}
                        checked={lista.includes(e.id)}
                        onCheckedChange={(v) => definir(u.id, u.nome, v === true ? [...lista, e.id] : lista.filter((x) => x !== e.id), `${e.nome_fantasia} ${v === true ? "liberada" : "retirada"}`)}
                      />
                      {e.nome_fantasia}
                    </label>
                  ))}
                </div>
                {lista.length === 0 && <p className="text-xs text-destructive">Marque ao menos uma empresa: sem nenhuma, o usuário não veria dados.</p>}
              </div>
            )}
            {admin && <p className="text-xs text-muted-foreground">O Administrador sempre vê todas as empresas.</p>}
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">Neste teste a escolha fica guardada; o filtro dos dados por empresa entra com o banco real.</p>
    </Bloco>
  );
}

// Matriz de permissões por usuário: uma linha para cada módulo e cada menu do sistema, com caixas de marcar por ação.
function Matriz() {
  const { estado, ativo } = useEstado();
  const { mudar } = useConfig();
  const [editadoId, setEditadoId] = useState(ativo.id);
  const editado = estado.usuarios.find((u) => u.id === editadoId) ?? ativo;
  const matriz = efetivas(editado);
  const travado = editado.perfil === "admin";

  const marcar = (tela: string, acao: Acao, valor: boolean) => {
    salvarPermissoes(localStorage, alternarAcao(estado, editado.id, tela, acao, valor));
    mudar((c) => c, "Permissões alteradas", `${editado.nome}: ${ROTULO_ACAO[acao]} em ${[...TELAS, ...SUBTELAS].find((t) => t.id === tela)?.nome ?? tela} ${valor ? "liberado" : "retirado"}`);
  };
  const excecao = (tela: string, acao: Acao) => {
    if (SUBTELAS.some((s) => s.id === tela)) return editado.excecoes[tela]?.[acao] !== undefined;
    return !!matriz[tela]?.[acao] !== !!padraoDe(editado.perfil)[tela]?.[acao];
  };

  const linha = (id: string, nome: string, grupo: string | null, menuDe: string | null) => (
    <tr key={id} className="border-b last:border-0 hover:bg-muted/40">
      <td className={`px-3 py-2 ${menuDe ? "pl-8" : "border-l-4 border-l-primary/60 bg-primary/5 font-semibold"}`}>
        {grupo && menuDe === null && <span className="text-xs text-muted-foreground">{grupo} · </span>}
        {nome}
        {menuDe && <span className="ml-1 text-xs text-muted-foreground">({grupo})</span>}
      </td>
      {ACOES.map((a) => (
        <td key={a} className={`px-3 py-2 text-center ${menuDe ? "" : "bg-primary/5"}`}>
          <span className="relative inline-flex">
            <Checkbox
              aria-label={`${ROTULO_ACAO[a]} ${nome}${menuDe ? ` (${grupo})` : ""}`}
              checked={!!matriz[id]?.[a]}
              disabled={travado || (menuDe !== null && !matriz[menuDe]?.ver)}
              onCheckedChange={(v) => marcar(id, a, v === true)}
            />
            {excecao(id, a) && <span className="absolute -right-2.5 -top-1 text-xs leading-none text-primary" title="Exceção ao padrão">*</span>}
          </span>
        </td>
      ))}
    </tr>
  );

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Cada módulo e cada menu do sistema (abas e itens de Parâmetros) tem as suas caixas. O perfil dá o ponto de partida; o menu herda o do módulo, e marcar ou
        desmarcar dá exceções a um usuário (marcadas com *). Gerais e Configurações são sempre só do Administrador.
      </p>
      <div className="grid gap-3 rounded-xl border bg-muted/30 p-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="usuario-config">Usuário</label>
          <Select value={editado.id} onValueChange={setEditadoId}>
            <SelectTrigger id="usuario-config"><SelectValue /></SelectTrigger>
            <SelectContent>{estado.usuarios.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="perfil-config">Perfil</label>
          <Select value={editado.perfil} onValueChange={(v) => { salvarPermissoes(localStorage, mudarPerfil(estado, editado.id, v as PerfilId)); mudar((c) => c, "Permissões alteradas", `${editado.nome}: perfil ${nomeDoPerfil(estado, v)}`); }} disabled={editado.id === ativo.id && travado}>
            <SelectTrigger id="perfil-config"><SelectValue /></SelectTrigger>
            <SelectContent>{perfisDoEstado(estado).map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      {travado && <p className="rounded-lg border bg-primary/5 px-3 py-2 text-xs text-muted-foreground">O Administrador sempre tem todos os acessos; para testar restrições, escolha outro usuário.</p>}
      <div className="rounded-xl border bg-muted/30 p-2">
        <div className="overflow-x-auto rounded-lg border bg-background">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/60 text-left">
                <th className="px-3 py-2.5 font-semibold">Tela / menu</th>
                {ACOES.map((a) => <th key={a} className="px-3 py-2.5 text-center font-semibold">{ROTULO_ACAO[a]}</th>)}
              </tr>
            </thead>
            <tbody>
              {TELAS.flatMap((t) => [
                linha(t.id, t.nome, t.grupo, null),
                ...SUBTELAS.filter((s) => s.pai === t.id).map((s) => linha(s.id, s.nome, s.grupo, t.id)),
              ])}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex flex-wrap justify-between gap-2">
        <Button type="button" variant="outline" onClick={() => { salvarPermissoes(localStorage, voltarAoPerfil(estado, editado.id)); toast.success("Voltou ao padrão do perfil"); }} disabled={travado}>Voltar ao padrão do perfil</Button>
        <Button type="button" variant="outline" onClick={() => { if (confirm("Restaurar as permissões originais de todos os usuários de teste? O usuário volta a ser o Administrador.")) { restaurarPermissoes(localStorage); setEditadoId(usuarioAtivo(localStorage).id); toast.success("Permissões originais restauradas"); } }}>Restaurar permissões originais</Button>
      </div>
    </div>
  );
}

const SECOES = [
  { id: "usuarios", nome: "Usuários" },
  { id: "perfis", nome: "Perfis" },
  { id: "permissoes", nome: "Permissões" },
  { id: "escopo", nome: "Escopo" },
] as const;

export function UsuariosPermissoes() {
  const [secao, setSecao] = useState<(typeof SECOES)[number]["id"]>("usuarios");
  return (
    <div className="space-y-4">
      <AvisoDeTeste />
      <MenuDeSecoes rotulo="Seções de usuários e permissões" itens={SECOES} ativo={secao} aoEscolher={setSecao} />
      {secao === "usuarios" && <Usuarios />}
      {secao === "perfis" && <Perfis />}
      {secao === "permissoes" && <Matriz />}
      {secao === "escopo" && <Escopo />}
    </div>
  );
}
