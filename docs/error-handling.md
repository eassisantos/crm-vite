# Tratamento de Erros e Feedback

Esta aplicação utiliza o `ToastProvider` para exibir mensagens de erro amigáveis sempre que uma operação CRUD falha. Os providers de contexto (`CasesContext`, `ClientsContext`, `FinancialContext`) encapsulam as operações assíncronas em blocos `try/catch` e propagam mensagens padronizadas.

## Erros simulados

A função utilitária `fakeApiCall` aceita os parâmetros opcionais:

- `shouldReject`: força a rejeição.
- `randomReject`: ativa falha aleatória.
- `rejectionProbability`: define a probabilidade (0 a 1) quando `randomReject` estiver habilitado.
- `errorMessage`: personaliza a mensagem retornada.

Utilize essas opções para validar fluxos de erro e confirmar se os toasts exibem as mensagens apropriadas.

## Feedback visual

As telas que criam, atualizam ou removem clientes, casos, tarefas e lançamentos financeiros exibem toasts de sucesso ou erro. Em caso de falha, o modal permanece aberto para facilitar a correção e nova tentativa.
