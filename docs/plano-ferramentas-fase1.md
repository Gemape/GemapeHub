# Plano de Ferramentas — Fase 1 (revisado)

Referências: `docs/especificacao-gemapehub.md` e decisões 8, 15, 16 e 17 de `docs/decisoes-especiais.md`.

1. **Documentação.** Aprovar a emenda que distingue subcategoria de produto, categoria de ferramenta e grupo de ferramenta, todos de Cadastros > Gerais, antes de qualquer código.
2. **Cadastro.** Primeiro, escrever o teste de editar, salvar e reabrir uma ferramenta com estoque positivo sem alterar a quantidade. Depois, ligar o formulário às três seleções de Gerais; gerar ao salvar o próximo código pela regra da categoria de produto Ferramentas (FER-0001 por padrão), entre todas as empresas, sem edição manual e sem mudar o código na edição. Manter descrição e estoque mínimo.
3. **Identificação e custo.** Exigir série informada, sem série fictícia; manter patrimônio e data de aquisição opcionais; validar preço de custo não negativo com duas casas decimais e alimentar o valor em estoque do dashboard.
4. **Listas.** Mostrar o código do item nas linhas e na exportação do histórico de movimentações: compra é entrada, entrega e baixa são saídas. Não criar telas novas.
5. **Encerramento.** Calcular por empregado, empresa e ferramenta o saldo entregue ainda não devolvido ou baixado. Permitir o Termo de Encerramento após a demissão e devolver ao estoque local apenas esse saldo, uma vez, impedindo excesso e repetição.
6. **Validação.** Em cada PR de código: testes, typecheck, build, revisão visual e preview da Vercel acessível para aprovação antes do merge. Se o deployment falhar ou ficar bloqueado, tentar novamente uma vez; se persistir, relatar o motivo. Não fazer deploy de produção diretamente. A Vercel serve apenas para visualização temporária; o deploy final será na VPS da Mega Provedor.

Tudo nesta fase usa dados fictícios locais, sem tabela, migration ou auth no Supabase real. Permissões por tela e revisão do estoque histórico permanecem na Fase 2. Caixas, Portador e marcas pertencem à proposta separada `docs/proposta-caixas-portador.md`.
