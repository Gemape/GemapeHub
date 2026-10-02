# Formatação geral e menu Parâmetros — plano de implementação do PR 1

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Padronizar texto cadastral, CNPJ, telefones e CEP; aplicar `#0A007C` somente à barra lateral e renomear seu grupo “Cadastros” para “Parâmetros”.

**Architecture:** Funções puras em `src/lib/formatacao-cadastral.ts` fazem normalização e apresentação. Formulários as chamam ao salvar e mostram os valores formatados ao abrir; documentos chamam somente a apresentação, sem alterar os dados usados em comparações. O menu e a cor ficam isolados no componente lateral e em suas variáveis CSS.

**Tech Stack:** React 19, TypeScript, TanStack Router, Tailwind CSS 4, testes `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-02-reparametrizacao-design.md`. Este plano cobre somente o PR 1.

## Global Constraints

- Barra lateral `#0A007C`; demais cores e vidro inalterados.
- Capitalizar somente texto digitado em cadastros; preservar siglas e códigos, inclusive GEMAPE, EPI, CA e SKU. Não alterar títulos da interface.
- CNPJ `XX.XXX.XXX/XXXX-XX`; celular `(XX)X.XXXX.XXXX`; fixo `(XX)XXXX.XXXX`; CEP `XX.XXX-XXX`.
- Novas entradas devem ter a quantidade correta de dígitos; apresentação de dados antigos incompletos não os apaga. Correspondência de CNPJ continua por dígitos.
- Não tocar em Supabase, migration, pendência 4, Fase 2, regras de estoque, código automático ou lógica de documentos além da apresentação.
- Branch atual `feat/reparametrizacao-formatacao-menu`, criada de `main` em `337dbcb`; commits com `ti@gemape.com.br`; PR sem merge pelo agente.

## Review Focus

- CNPJ do XML sem máscara continua casando com CNPJ cadastrado com máscara; teste da função de comparação por dígitos na tarefa 1.
- CNPJ ou CEP antigo com quantidade incompleta de dígitos permanece visível e editável; teste da função de apresentação na tarefa 1.
- Siglas cadastradas continuam intactas enquanto nomes em caixa alta comum são normalizados; teste da capitalização na tarefa 1.
- Telefone de 10 dígitos usa formato fixo e de 11 usa celular; comprimentos diferentes são recusados ao salvar e preservados ao exibir registros antigos; teste na tarefa 1.
- O modo escuro e as áreas fora da barra lateral não recebem `#0A007C`; conferência CSS e navegador na tarefa 4.

---

### Tarefa 1: Funções compartilhadas de formatação

**Arquivos:** Criar `src/lib/formatacao-cadastral.ts`; criar `tests/formatacao-cadastral.test.mjs`.

**Interfaces:** Exportar `somenteDigitos(valor: string): string`, `formatarCnpj(valor: string): string`, `formatarTelefone(valor: string): string`, `formatarCep(valor: string): string`, `capitalizarCadastro(valor: string): string`, `validarCnpj(valor: string): boolean`, `validarTelefone(valor: string): boolean`, `validarCep(valor: string): boolean`. Os formatadores devolvem entrada antiga incompleta sem alteração; os validadores exigem respectivamente 14, 10 ou 11, e 8 dígitos. Campos opcionais vazios continuam válidos no formulário, por decisão do formulário.

- [ ] Escrever testes para entradas limpas e pontuadas, números incompletos, celular e fixo, preservação de siglas/códigos e equivalência de CNPJ com e sem máscara via `somenteDigitos`.
- [ ] Executar `node --experimental-strip-types --test tests/formatacao-cadastral.test.mjs` e confirmar falha antes do código.
- [ ] Implementar as oito funções; `capitalizarCadastro` transforma a primeira letra e as demais em minúsculas por palavra, com exceção explícita para siglas de domínio e tokens de código; não capitaliza números nem pontuação.
- [ ] Reexecutar o teste e confirmar aprovação.
- [ ] Commitar função e teste.

### Tarefa 2: Gravação e apresentação nos formulários de cadastro

**Arquivos:** Modificar `src/lib/empresas.ts`, `src/routes/_authenticated/empresas.tsx`, `src/lib/fornecedores-demo.ts`, `src/routes/_authenticated/cadastros/fornecedores.tsx`, `src/components/modules/CadastroProduto.tsx`, `src/components/modules/VeiculosCadastroModulo.tsx`, `src/routes/_authenticated/empregados.tsx`, `src/routes/_authenticated/cadastros/epi-ficha.tsx`, `src/routes/_authenticated/cadastros/gerais/categorias.tsx`, `src/components/parametros/ListaEditavel.tsx` e os testes existentes dessas rotas. Estes são os pontos de entrada dos textos cadastrais atuais; antes de implementar, localizar outros campos de cadastro de nome, descrição e endereço com `rg` e incluí-los nesta tarefa, sem alterar campos de observação livre, siglas, códigos, placas, série, CPF ou documentos.

**Interfaces:** Consumir as funções da tarefa 1. Salvar CNPJ, telefone e CEP completos em formato canônico; aplicar capitalização aos campos textuais cadastrais indicados. Mostrar CNPJ/telefone/CEP antigos com a função de apresentação também em tabelas e formulários. Manter a comparação de fornecedores por `somenteDigitos`.

- [ ] Escrever testes de integração dos valores enviados por Empresas e Fornecedores, inclusive telefone e CEP, além de testes para nomes e descrições nos demais cadastros atingidos.
- [ ] Executar os testes específicos e confirmar que falham antes da integração.
- [ ] Integrar normalização na gravação e formatação na apresentação; mostrar erro de validação sem fechar o formulário quando a quantidade de dígitos for inválida.
- [ ] Reexecutar os testes específicos e confirmar aprovação.
- [ ] Commitar formulários e testes.

### Tarefa 3: CNPJ, telefone e CEP em leituras e documentos

**Arquivos:** Modificar as apresentações em `src/routes/_authenticated/cadastros/gerais/codigo-fabrica.tsx`, `src/components/modules/ImportarNfeXml.tsx`, `src/components/parametros/ImportarNfeCodigoFabrica.tsx`, `src/lib/empresas.ts` (`enderecoResumido`), `src/lib/ficha-epi-avulsa-html.ts`, `src/lib/termo-baixa-uniforme-html.ts`, `src/lib/termo-entrega-epi-html.ts`, `src/lib/termo-entrega-uniforme-html.ts`, `src/lib/termo-responsabilidade-html.ts`, `src/lib/termo-vistoria-html.ts` e `src/components/modules/FerramentasTermoEncerramento.tsx`. Revisar mensagens em `src/lib/importacao-nfe.ts` e `src/lib/associacao-nfe.ts` para apresentação sem mudar a lógica de casamento.

**Interfaces:** Usar `formatarCnpj`, `formatarTelefone` e `formatarCep` da tarefa 1 somente para apresentar. Em HTML gerado, continuar passando o texto formatado por `escaparHtml`.

- [ ] Escrever testes para um CNPJ sem máscara em tabela/documento e para preservação de `escaparHtml`; cobrir CEP antigo em `enderecoResumido`.
- [ ] Executar os testes e confirmar falha antes da integração.
- [ ] Integrar apresentação formatada em todos os pontos listados; não alterar chaves de busca, valores do XML ou associações.
- [ ] Reexecutar os testes e confirmar aprovação.
- [ ] Commitar leituras e testes.

### Tarefa 4: Barra lateral e revisão visual

**Arquivos:** Modificar `src/components/layout/AppSidebar.tsx` e `src/styles.css`; criar `tests/menu-parametros-visual.test.mjs` somente para invariantes de texto e tokens CSS.

**Interfaces:** O grupo lateral fica “Parâmetros”, com as mesmas rotas e permissões atuais. `--sidebar` recebe `#0A007C` nos temas claro e escuro; nenhuma outra variável de cor muda.

- [ ] Escrever teste que encontra “Parâmetros”, preserva as rotas de Cadastro e exige `--sidebar: #0A007C` sem mudar `--primary` ou `--glass-*`.
- [ ] Executar o teste e confirmar falha antes do código.
- [ ] Alterar somente o título do grupo e as duas definições de `--sidebar`.
- [ ] Reexecutar o teste e conferir em navegador a barra lateral e telas de Empresas e Fornecedores em largura móvel e desktop, inclusive modo escuro se disponível. Registrar a URL e evidência de navegação.
- [ ] Commitar menu, cor e teste.

### Tarefa 5: Gate final do PR 1

**Arquivos:** Nenhum código novo; atualizar somente testes se a revisão revelar uma falha real.

- [ ] Executar `npm test`, `npm run typecheck`, `npm run build` e `git diff --check`; registrar contagens e resultados.
- [ ] Revisar o diff contra o escopo do PR 1, conferir `git status` e fazer code review antes de abrir o PR.
- [ ] Fazer push da branch e abrir PR se o GitHub permitir; se a API retornar `Forbidden`, registrar o erro e entregar a branch para abertura pelo responsável.
- [ ] Consultar o preview da Vercel e informar o link completo quando estiver Ready; não alterar configuração de deploy e não mergear o PR.
