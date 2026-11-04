# Auditoria independente de efetividade do GemapeHub (04/11/2026)

Segunda auditoria, feita para verificar se a primeira (auditoria geral de 04/11/2026, commit `6909b55`) foi efetiva. Foi feita em modo de auditoria: nenhum arquivo do projeto foi alterado por ela. Para medir a força dos testes, foram usadas cópias na pasta temporária. Nada foi aplicado no Supabase e não houve deploy.

O pedido original chegou cortado no item A.2 ("qual percentual dos problemas anteriores foi comprovadamente…"); o relatório responde pelo que dava para deduzir.

## A. Resultado geral

**A auditoria anterior foi parcialmente efetiva.** Foi honesta no que declarou, mas corrigiu pouco do que apontou e deixou passar problemas reais.

Dos 11 problemas que ela declarou:

- 4 corrigidos e comprovados (36%); com o parcial, 5 (45%).
- 1 corrigido parcialmente.
- 4 só em proposta, não aplicados (todos de banco; ela disse isso).
- 2 pendentes declarados.

## B. Matriz de efetividade

| Problema anterior | Correção declarada | Verificação independente | Evidência | Resultado |
|---|---|---|---|---|
| Vulnerabilidade crítica (`shell-quote`) e 4 altas | `npm audit fix` | O `npm audit` mostra 0 críticas e 2 altas. O `bun.lock` não foi atualizado e ainda fixa `shell-quote@1.10.0` | `npm audit`; `bun.lock` linha 908 | **Corrigido parcialmente** (só o npm; `vite` e `zod` seguem altas) |
| Caixa dupla de empregados estourava no celular | `minmax(0,1fr)` e `min-w-0` | Sem rolagem lateral de 320 a 1400 px em Viagens; visual a 1400 px íntegro | Playwright | **Aprovado com ressalvas** (as telas de EPI e Uniformes não foram localizadas; a lista de habilitados de Veículos ainda estoura 21 px a 320 px) |
| `useAccess` com hooks dentro de `if` | Dividido em dois hooks | Os bundles de produção antes e depois têm o mesmo conteúdo; o teste adaptado ainda barra permissões de teste em produção | build `VITE_DEMO_MODE=false` nos dois estados | **Aprovado** |
| `any`, `const`, escape e espaço invisível | `ClienteLivre` e correções | Erros reais de lint foram de 14 para 2. Os erros totais subiram de 13.656 para 13.695 (+51 de formatação nos arquivos novos) | `eslint` | **Aprovado com ressalvas** |
| `api.ts` não testável | Import com `.ts` | Build passa e os 12 testes da API rodam | build; teste | **Aprovado** |
| `auditoria_movimentacoes` sem RLS | Só proposta | Continua sem RLS e sem REVOKE nas migrations | `migracoes-seguranca` trava a dívida | **Reprovado** (aberto) |
| Ferramenta em duas caixas | Só proposta | Não corrigido | só existe `UNIQUE(caixa, ferramenta)` | **Reprovado** (aberto) |
| `status` nulo no UPDATE de `salvar_caixa` | Só proposta | O app sempre envia `status`, então na prática não ocorre. A gravidade "Média" estava exagerada; é Baixa | `CaixasFerramentasModulo.tsx:239` | **Aprovado com ressalvas** |
| `auditar_movimentacao` sem `search_path` | Só proposta | A função está órfã (o gatilho foi derrubado em `20260916`) | migrations | **Não corrigido** (risco baixo) |
| `vite` e `zod` com vulnerabilidade alta | Pendente | Confirmado. O `vite` afeta só o servidor de desenvolvimento | `npm audit` | **Não corrigido** (declarado) |
| 13.693 avisos de formatação (Prettier) | Pendente | Piorou em 51 | `eslint` | **Reprovado** (leve regressão) |

## C. Problemas novos que a primeira auditoria não viu

| # | Problema | Gravidade | Evidência |
|---|---|---|---|
| N1 | **`salvar_caixa` não atende o que o app envia.** O banco ignora `codigo` e `codigo_num` (o número escolhido pelo usuário vira sequência do banco), zera `responsavel_id` em toda edição e não impõe "uma ferramenta por caixa". O modo demonstração mascara tudo isso. | **Alto** (Fase 2) | SQL da RPC contra `CaixasFerramentasModulo.tsx:231-239` e `demo-client.ts` (leitura; não rodou contra banco) |
| N2 | A CI só faz `build --mode demo`. O build de produção nunca é testado ali (foi testado manualmente nesta auditoria e passou). | Médio | `.github/workflows/validar.yml` |
| N3 | **Testes frágeis.** Não há nenhum teste de tela ou ponta a ponta no repositório. 38 arquivos só leem texto de código e 139 usam `assert.match` em código-fonte. Nos 20 testes novos da auditoria anterior, a mutação "aceitar `papel` livre" sobreviveu (o teste passa por outro motivo). A guarda de migrations não detecta política aberta (`USING true`) em migration nova. | Médio | mutações em cópia: 9 de 10 mortas na API; 3 de 4 no banco |
| N4 | `bun.lock` desatualizado: quem instalar com bun recebe as versões vulneráveis. | Médio | `bun.lock` |
| N5 | O botão de resolver ocorrência aparece para o operador (`canOperate: ativo`), mas a RLS só deixa o operador **inserir** movimentações e ocorrências. Resolver exige gestor, então o banco recusaria. | Médio (não executado) | `access-context.tsx` e a política `empresa_registro` |
| N6 | Recuperação e troca de senha sem regra mínima no cliente; criar usuário exige 12 caracteres. O link usa `window.location.origin`, mas `.env.example` diz `APP_URL`. | Baixo | `auth.tsx:45,50` |
| N7 | A produção embute o `demo-client` (248 KB), apesar do comentário "nem é gerado". Já era assim antes. | Baixo | build antes e depois |
| N8 | Ocorrência idêntica registrada duas vezes é aceita (53→54→55). | Baixo | Playwright |
| N9 | Habilitados (22) é maior que os empregados ativos (15): há técnicos habilitados sem cadastro. Não se sabe se é defeito ou dado de teste. | Baixo (não validado) | tela de Parâmetros |

## D. Verificação técnica

- **TypeScript:** 0 erros.
- **Testes:** 1559 de 1559 aprovados (nenhum pulado ou desligado).
- **Build:** passa nos modos demonstração e produção.
- **ESLint:** 2 erros reais, mais 13.693 de formatação e 33 avisos.
- **Fluxo ponta a ponta, Ocorrências de Equipamentos:**
  - O erro foi tratado (sem equipamento, nada gravou e apareceu aviso).
  - Salvar gravou e **persistiu após recarregar**.
  - O extrato com foco, "Só em aberto", o período e o equipamento pré-escolhido funcionaram.
- **XSS nos relatórios em HTML:** as 17 interpolações sem `escaparHtml` são números tipados ou funções que já escapam. Sem falha encontrada.
- **API administrativa:** exige sessão, perfil admin ativo e origem correta, valida o corpo e limita o tamanho, tudo confirmado por teste com mutação.

## E. Segurança

- **Rotas por URL:** a proteção de rota real depende do Supabase. No modo de produção a tela esconde as telas de administração só por `isAdmin`, e a barreira de verdade é a RLS e a API. **Isso não foi exercitado**, porque as migrations de RLS não estão aplicadas (`docs/pendencias-fase2.md`).
- **Não testado:** login real, expiração de sessão, e-mail de recuperação, isolamento entre empresas e RLS. Não há banco real a testar nesta fase.
- **`travas_catalogo` e as RPCs de catálogo:** existem só no modo demonstração e as telas as chamam apenas nele. Sem validação possível no banco real.

## F. O que não foi possível validar

PDFs impressos, importação e exportação, notificações, fluxos de aprovação, os formulários além dos citados e todo o lado do banco real.

## G. Parecer técnico

**APROVADO COM RESSALVAS**, só para o sistema na Fase 1 (demonstração, sem banco). Nas 88 telas não houve erro de console nem regressão causada pelas correções.

Para a Fase 2 ou produção, o parecer vira **REPROVADO** enquanto existirem três pontos altos:

1. `salvar_caixa` não atende o contrato do app (N1).
2. A tabela `auditoria_movimentacoes` está sem RLS.
3. A regra "uma ferramenta por caixa" não existe no banco.

Também pesa que o repositório só tem testes de lógica (nenhum de tela) e que a CI não testa o build de produção. Se as propostas de `docs/propostas-sql/` forem aplicadas e o N1 resolvido, o parecer pode ser revisto.

## Referências

- Proposta de ajustes no banco (não aplicada): `docs/propostas-sql/2026-11-04-endurecimento-banco.md`.
- Testes novos da primeira auditoria: `tests/api-admin-usuarios.test.mjs`, `tests/migracoes-seguranca.test.mjs`, `tests/auditoria-correcoes.test.mjs`.
- Pendências da Fase 2: `docs/pendencias-fase2.md`.
