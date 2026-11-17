- [x] Aplicar `apply_all_schema.sql` sem alterações
- [x] Corrigir incompatibilidades de tipos reveladas pela atualização do banco
- [x] Resolver alertas de segurança gerados pelo Script 1
- [ ] Aplicar `20260915_opcao_a_delta.sql` sem alterações — bloqueado: o arquivo omite `categoria` ao inserir uniformes, mas a coluna é obrigatória
- [x] Executar o SELECT final e confirmar as seis tabelas

## Pendências da fase com aprovação de campo novo

Ficaram de fora das melhorias de usabilidade (bloco 2, alertas dos cartões) porque dependem de campo que não existe. Nada foi criado; só entram com aprovação explícita.

- [ ] Documentação de veículo vencendo (CRLV, seguro etc.): exige campo de vencimento no cadastro do veículo; depois vira alerta no cartão Veículos.
- [ ] Prazo de devolução de ferramenta: exige campo de prazo na entrega; hoje só se avisa a devolução de empregado desligado.
