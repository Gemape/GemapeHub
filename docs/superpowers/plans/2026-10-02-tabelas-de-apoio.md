# Tabelas de Apoio — plano de implementação do PR 2

> **Para execução:** implementar cada tarefa com teste falhando antes do código, revisar a branch e abrir somente o PR 2.

**Objetivo:** abrir Tabelas de Apoio pela lista de categorias e configurar, por categoria, se o endereçamento existente não é usado, é opcional ou é obrigatório com aviso sem bloqueio.

**Arquitetura:** guardar o estado de endereçamento no mesmo documento local `gemape-demo-parametros-base`, com `Não usa` como padrão inclusive para dados legados. Reutilizar a rota de Categorias e os campos atuais Rua, Número e Apartamento; a tela de Endereçamento e os formulários de produtos consultam o parâmetro, sem tocar no Supabase real.

**Tecnologia:** React, TanStack Router, TypeScript, testes Node, armazenamento local do modo demonstração.

**Especificação:** `docs/superpowers/specs/2026-10-02-reparametrizacao-design.md`, seção PR 2.

## Restrições gerais

- Sem migration, auth ou alteração no Supabase. Persistência desta fase apenas no modo demonstração.
- O estado padrão é `Não usa`; `Obrigatório` mostra aviso e nunca impede salvar.
- Reutilizar exatamente Rua, Número e Apartamento. Não adicionar campos de endereço por categoria.
- Preservar dados antigos, siglas, códigos automáticos e a separação de estoque por empresa.
- Não executar PR 3, pendência 4 nem Fase 2.

## Foco da revisão

- Dados locais anteriores sem o novo campo devem ler `Não usa` e manter os demais dados.
- Alterar um estado não pode remover produtos ou endereços já gravados.
- Código repetido em empresas diferentes deve ser conferido junto da empresa.
- O aviso não pode aparecer para categoria opcional nem bloquear a gravação obrigatória.
- A navegação deve conservar as listas de marcas e ferramentas, acessíveis após escolher categoria ou por seção própria.

## Tarefa 1 — Modelo local e regras

**Arquivos:** `src/lib/parametros-base.ts`, `tests/parametros-base.test.mjs`.

**Interface:** `TipoEnderecamento = "nao_usa" | "opcional" | "obrigatorio"`; `enderecamentoDaCategoria(dados, categoriaId): TipoEnderecamento`; `salvarEnderecamentoCategoria(categoriaId, tipo, storage?)`.

- [ ] Testar padrão das categorias, leitura legada, gravação atômica, estado inválido e exclusão de categoria.
- [ ] Rodar o teste e confirmar falha pela ausência da regra.
- [ ] Implementar leitura tolerante a legado e gravação local com validação.
- [ ] Rodar o teste e confirmar aprovação.
- [ ] Commit.

## Tarefa 2 — Navegação e visual de Tabelas de Apoio

**Arquivos:** `src/components/layout/AppSidebar.tsx`, `src/routes/_authenticated/cadastros/gerais/categorias.tsx`, `tests/menu-parametros-visual.test.mjs` e teste de tela.

- [ ] Testar o rótulo “Tabelas de Apoio”, entrada apenas com categorias, seleção abrindo subcategorias e listas relacionadas, retorno, e seletor com três estados.
- [ ] Confirmar teste falhando pelo visual atual.
- [ ] Implementar navegação em duas etapas e seletor para a categoria escolhida; manter ações atuais de renomear, desativar e excluir.
- [ ] Rodar teste de tela e verificar manualmente no navegador.
- [ ] Commit.

## Tarefa 3 — Aplicar o parâmetro sem mexer no estoque

**Arquivos:** `src/lib/enderecamento-categoria.ts` (se necessário), `src/components/modules/EnderecamentoModulo.tsx`, `src/components/modules/CadastroProduto.tsx`, `src/components/modules/VeiculosCadastroModulo.tsx` e testes correspondentes.

- [ ] Testar filtro: `Não usa` some; `Opcional` e `Obrigatório` aparecem mesmo sem endereço; busca e filtro de pendentes consideram ambos. Testar aviso no salvamento/edição de produto obrigatório sem endereço e ausência de bloqueio.
- [ ] Confirmar falha com a lista atual, que contém só endereços.
- [ ] Associar cada produto à categoria fixa do módulo; montar linhas por produto e empresa; consultar endereço existente; mostrar aviso após salvar/editar no modo demonstração.
- [ ] Rodar os testes; conferir busca, filtro, edição e exclusão de endereço no navegador.
- [ ] Commit.

## Tarefa 4 — Decisão, revisão e entrega

**Arquivos:** `docs/decisoes-especiais.md`.

- [ ] Registrar os três estados, o padrão, o aviso sem bloqueio e o uso dos campos existentes.
- [ ] Executar `npm test`, `npm run typecheck`, `npm run build` e `git diff --check`; fazer revisão de código.
- [ ] Abrir PR para `main`, informar mudanças visuais e link do preview Vercel Ready. Aguardar o merge do responsável.
